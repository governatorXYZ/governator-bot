import axios, { AxiosResponse } from 'axios';
import { ComponentContext } from 'slash-create';
import { createLogger } from '../../utils/logger';
import client from '../../app';

const logger = createLogger('Vote');

export default async (componentContext:ComponentContext): Promise<any> => {

	const pollInfo = componentContext.customID;
	const pollId = pollInfo.substring(0, pollInfo.indexOf(':'));
	const pollOptionId = pollInfo.substring(pollInfo.indexOf(':') + 1);

	// fetch poll from db
	const poll = await fetchPoll(pollId);

	if (!poll) return;

	if (poll.role_restrictions && poll.role_restrictions.length > 0) {
		if (await roleRestricted(componentContext, poll.role_restrictions)) {
			await componentContext.send({ content: 'You do not have the required role to vote on this poll' });
			return;
		}
	}

	// create list of poll options
	const PollOptionList = [];
	poll.poll_options.forEach((option) => {
		PollOptionList.push(option.poll_option_id);
	});

	if (!PollOptionList.includes(pollOptionId)) return;

	const chosenOption = poll.poll_options.find(obj => {
		return obj.poll_option_id === pollOptionId;
	});

	logger.data('user picked option: ', chosenOption);

	// try to fetch user
	let account = await fetchAccount(componentContext.user.id);

	// if no user found create user
	if (!account) {
		account = await createAccount(componentContext.user.id, componentContext.user.username);

		// return if account could not be created
		if (!account) return;

		// fetch again
		account = await fetchAccount(componentContext.user.id);
	}

	// if user not found something is wrong
	if (!account) return;

	// if poll is token vote -> get voting power of user
	if (poll.token_strategies && poll.token_strategies.length > 0) {
		await tokenVote(componentContext, poll, chosenOption);
	} else {
		// otherwise, create the vote
		await discordVote(componentContext, chosenOption, poll);
	}
};

const discordVote = async (componentContext, chosenOption, poll) => {

	const voteParams = {
		poll_option_id: chosenOption.poll_option_id,
		account_id: componentContext.user.id,
		provider_id: 'discord',
		vote_power: '1',
	};

	const vote = await createVote(poll._id, voteParams);

	if (!vote) return;

	// update the poll embed
	let embed;
	switch (vote.method) {
	case 'create':
		embed = updateEmbedCountPlus1(componentContext.message.embeds[0], chosenOption._id);
		break;
	case 'delete':
		embed = updateEmbedCountMinus1(componentContext.message.embeds[0], chosenOption._id);
		break;
	case 'update':
		embed = updateEmbedCountPlus1(componentContext.message.embeds[0], chosenOption._id);
		updateEmbedCountMinus1(embed, vote.data.oldVote.poll_option_id);
		break;
	}

	const msg = componentContext.message;

	logger.info('Updated embed');
	logger.data('Updated embed', msg.embeds);

	await msg.edit({ embeds:[embed] });

	await componentContext.send({ content: `Your vote was recorded: \n 
		option: ${vote.method === 'update' ? vote.data.updatedVote.poll_option_id : vote.data.poll_option_id } \n
		method: ${vote.method}`,
	});

	logger.info('Discord vote recorded successfully');
};

const tokenVote = async (componentContext, poll, chosenOption) => {
	logger.debug('Token strategy defined - Attempting to calculate voting power');

	// get all accounts from user object
	const user = await fetchUser(componentContext.user.id).catch((e) => {
		logger.error(e);

		return null;
	});

	if (!user) return;

	const ethAccounts = [];
	if (user.provider_accounts && user.provider_accounts.length > 1) {
		for (const acct of user.provider_accounts) {
			if (acct.provider_id === 'ethereum') ethAccounts.push(acct._id);
		}
	}

	if (ethAccounts.length === 0) {
		await componentContext.send({ content: 'No ethereum accounts found. Please link your wallet to enable token voting: <https:www.governator.xyz>' });

		logger.debug('No eth accounts found');

		return;

	} else {

		const voteResult = [];

		for await (const addr of ethAccounts) {

			const strategyResults = [];

			for await (const conf of poll.token_strategies) {
				const strategy = await fetchStrategy(conf.strategy_id);

				logger.debug(`About to run strategy with params: address: ${addr}, block_height: ${conf.block_height}, endpoint: ${strategy.endpoint}`);

				const power = await runStrategy(addr, conf.block_height, strategy.endpoint);

				if (!power || power === 0) break;

				logger.debug(`vote power: ${power}`);

				const voteParams = {
					poll_option_id: chosenOption.poll_option_id,
					account_id: addr,
					provider_id: 'ethereum',
					vote_power: power,
				};

				const vote = await createVote(poll._id, voteParams);

				strategyResults.push({ address: addr, strategy: conf.strategy_id, VotingPower: power, option: chosenOption.poll_option_name, method: vote.method });

				logger.info('Token vote recorded successfully');
				logger.data(strategyResults);
			}

			voteResult.push(...strategyResults);
			logger.data(voteResult);
		}

		await componentContext.send({ content: `Your vote was recorded: \n${JSON.stringify(voteResult).substring(0, 2000)}` });
	}
};

const roleRestricted = async (componentContext, roleRestrictions) => {

	logger.info('Role restrictions apply, checking if user has required role');

	await client.guilds.fetch().catch((e) => {
		logger.error(e);
	});

	const guild = client.guilds.cache.get(componentContext.guildID);

	await guild.members.fetch().catch((e) => {
		logger.error(e);
	});
	const guildMember = guild.members.cache.get(componentContext.user.id);

	const restricted = guildMember.roles.cache.every((value, key) => {
		return !roleRestrictions.includes(key);
	});

	logger.info(`User allowed to vote: ${!restricted}`);

	return restricted;
};

const updateEmbedCountPlus1 = (embed, optionId) => {
	embed.fields.forEach((field: any, index: number) => {

		if (field.value.substring(0, field.value.indexOf(':')).replace(/\s/g, '') === optionId) {

			embed.fields[index + 1].value = (parseInt(embed.fields[index + 1].value) + 1).toString();
		}
	});
	return embed;
};

const updateEmbedCountMinus1 = (embed, optionId) => {
	embed.fields.forEach((field: any, index: number) => {

		if (field.value.substring(0, field.value.indexOf(':')).replace(/\s/g, '') === optionId) {

			embed.fields[index + 1].value = (parseInt(embed.fields[index + 1].value) - 1).toString();
		}
	});
	return embed;
};

// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
const createVote = async (poll_id, voteParams) => {
	const voteRequestEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/vote/${poll_id}`;
	try {
		const vote: AxiosResponse = await axios.post(voteRequestEndpoint, {
			poll_option_id: voteParams.poll_option_id,
			account_id: voteParams.account_id,
			provider_id: voteParams.provider_id,
			// TODO this should be string in response already?
			vote_power: voteParams.vote_power.toString(),
		});

		logger.info('Vote request posted');
		logger.data('Vote request:', vote.data);

		return vote.data;

	} catch (e) {
		logger.error('vote request failed', e);

		return null;
	}
};

// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
const runStrategy = async (address, blockHeight, endpoint) => {
	const runStrategyEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/${endpoint}`;

	try {
		const power: AxiosResponse = await axios.post(runStrategyEndpoint, {
			account_id: address,
			block_height: blockHeight,
		});

		logger.info('Done running strategy');

		return power.data;

	} catch (e) {
		logger.error('Failed to fetch strategy', e);

		return null;
	}
};

// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
const fetchStrategy = async (strategyId) => {
	const getStrategyEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/strategies/find/one/${strategyId}`;

	try {
		const strategy: AxiosResponse = await axios.get(getStrategyEndpoint);

		logger.info('Found strategy');
		logger.data('Found Strategy:', strategy.data);

		return strategy.data;

	} catch (e) {
		logger.error('Failed to fetch strategy', e);

		return null;
	}
};

// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
const fetchPoll = async (poll_id) => {
	const getPollByIdEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/poll/${poll_id}`;

	try {
		const poll: AxiosResponse = await axios.get(getPollByIdEndpoint);

		logger.info('Fetched poll');
		logger.data('Fetched poll', poll.data);

		return poll.data;

	}	catch(e) {
		logger.error('Failed to fetch poll', e);

		return null;
	}
};

// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
const fetchAccount = async (clientAccountId) => {
	const accountGetEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/account/discord/get-by-account-id/${clientAccountId}`;

	try {
		const account: AxiosResponse = await axios.get(accountGetEndpoint);

		logger.info('Fetched account');
		logger.data('Fetched account', account.data);

		return account.data;

	} catch (e) {
		logger.error('Failed to fetch account', e);

		return null;
	}
};

// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
const fetchUser = async (clientAccountId) => {
	const userGetEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/user/discord/${clientAccountId}`;

	try {
		const user: AxiosResponse = await axios.get(userGetEndpoint);

		logger.info('Fetched user');
		logger.data('Fetched user', user.data);

		return user.data;

	} catch (e) {
		logger.error('Failed to fetch user', e);

		return null;
	}
};

// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
const createAccount = async (id, username) => {
	const accountCreateEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/account/discord/create`;

	try {
		const account: AxiosResponse = await axios.post(accountCreateEndpoint, {
			_id: id,
			discord_username: username,
		});

		logger.info('Created account');
		logger.data('Created account', account.data);

		return account.data;

	}	catch(e) {
		logger.error('failed to create account', e);

		return null;
	}
};

// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
// const createUser = async (username, pfpUrl) => {
// 	const userCreateEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/user/create`;
//
// 	try {
// 		const user: AxiosResponse = await axios.post(userCreateEndpoint, {
// 			name: username,
// 			image: pfpUrl,
// 		});
//
// 		logger.info('Created user');
// 		logger.data('Created user', user.data);
//
// 		return user.data;
//
// 	}	catch(e) {
// 		logger.error('failed to create user', e);
//
// 		return null;
// 	}
// };

// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
// const linkAccount = async (user_id, client_id, client_account_id) => {
// 	const userAddAccountEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/user/add_provider_account`;
//
// 	try {
// 		const userAccount: AxiosResponse = await axios.post(userAddAccountEndpoint, {
// 			user_id: user_id,
// 			provider_id: client_id,
// 			provider_account_id: client_account_id,
// 		});
//
// 		logger.info('Account linked');
// 		logger.data(`Account linked to user ${user_id}`, userAccount.data);
//
// 		return userAccount.data;
//
// 	}	catch(e) {
// 		logger.error(`failed to link account to user ${user_id}`, e);
//
// 		return null;
// 	}
// };