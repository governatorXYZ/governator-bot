import axios, { AxiosResponse } from 'axios';
import { ComponentContext } from 'slash-create';
import { createLogger } from '../../utils/logger';
import client from '../../app';
import { ethers } from 'ethers';
import {strategyTypes} from "../../constants/constants";
// import Font from 'ascii-art-font';
// import { cache } from '../../app';

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

	// logger.data('user picked option: ', chosenOption);

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

	// if token weighted poll, verify if account has wallet linked
	if (await noEthAccountLinked(componentContext) && (poll.strategy_config[0].strategy_type === strategyTypes.STRATEGY_TYPE_TOKEN_WEIGHTED)) {
		await componentContext.send({ content: 'No verified ethereum accounts found. Please link & verify your wallet to enable token voting: <https://www.governator.xyz>' });
		return;
	}

	const voteParams = {
		poll_option_id: chosenOption.poll_option_id,
		account_id: componentContext.user.id,
		provider_id: 'discord',
	};

	const votes = await createVote(poll._id, voteParams);

	if (votes.length === 0) return;

	await updateEmbedCount(poll._id, componentContext);

	await componentContext.send({ content: `${formatMessage(votes, poll)}` });
};

const formatMessage = (votes, poll) => {
	let st = 'Your vote: \n';
	let pollOption: any;
	for (const vote of votes) {
		let voteData: any;
		if (vote.method === 'update') {
			voteData = vote.data.updatedVote;
		} else {
			voteData = vote.data;
		}

		pollOption = poll.poll_options.find(option => option.poll_option_id === voteData.poll_option_id);

		st +=
			'`' + 'option:' + '`' + ` ${pollOption.poll_option_emoji} : ${pollOption.poll_option_name} - `
			+ '`' + 'account:' + '`' + ` ${voteData.account_id} (${voteData.provider_id}) - `
			+ '`' + 'vote weight:' + '`' + ` ${poll.strategy_config[0].strategy_type === strategyTypes.STRATEGY_TYPE_TOKEN_WEIGHTED ? Math.round(Number(ethers.utils.formatEther(voteData.vote_power))) : voteData.vote_power } - `
			+ '`' + 'method:' + '`' + ` ${vote.method} vote\n`;

	}
	return st.substring(0, 2000);
};

const noEthAccountLinked = async (componentContext) => {
	// get all accounts from user object
	const user = await fetchUser(componentContext.user.id).catch((e) => {
		logger.error(e);
		return null;
	});

	if (!user) return false;

	const ethAccounts = [];
	if (user.provider_accounts && user.provider_accounts.length > 1) {
		for (const acct of user.provider_accounts) {
			if (acct.provider_id === 'ethereum' && acct.verified) ethAccounts.push(acct._id);
		}
	}

	if (ethAccounts.length === 0) {
		logger.debug('No verified eth accounts found');
		return true;
	}
	return false;
};

// const discordVote = async (componentContext, chosenOption, poll) => {
//
// 	const voteParams = {
// 		poll_option_id: chosenOption.poll_option_id,
// 		account_id: componentContext.user.id,
// 		provider_id: 'discord',
// 		vote_power: '1',
// 	};
//
// 	const vote = await createVote(poll._id, voteParams);
//
// 	if (!vote) return;
//
// 	await updateEmbedCount(poll, vote, componentContext, chosenOption);
//
// 	await componentContext.send({ content: `Your vote was recorded: \n
// 		option: ${vote.method === 'update' ? vote.data.updatedVote.poll_option_id : vote.data.poll_option_id } \n
// 		method: ${vote.method}`,
// 	});
//
// 	logger.info('Discord vote recorded successfully');
// };

// const tokenVote = async (componentContext, poll, chosenOption) => {
// 	logger.debug('Token strategy defined - Attempting to calculate voting power');
//
// 	// get all accounts from user object
// 	const user = await fetchUser(componentContext.user.id).catch((e) => {
// 		logger.error(e);
//
// 		return null;
// 	});
//
// 	if (!user) return;
//
// 	const ethAccounts = [];
// 	if (user.provider_accounts && user.provider_accounts.length > 1) {
// 		for (const acct of user.provider_accounts) {
// 			if (acct.provider_id === 'ethereum' && acct.verified) ethAccounts.push(acct._id);
// 		}
// 	}
//
// 	if (ethAccounts.length === 0) {
// 		// TODO: update link to wallet connect page
// 		await componentContext.send({ content: 'No verified ethereum accounts found. Please link & verify your wallet to enable token voting: <https://www.governator.xyz>' });
//
// 		logger.debug('No verified eth accounts found');
//
// 		return;
//
// 	} else {
//
// 		const voteResult = [];
//
// 		for await (const addr of ethAccounts) {
//
// 			const strategyResults = [];
//
// 			for await (const conf of poll.token_strategies) {
// 				const strategy = await fetchStrategy(conf.strategy_id);
//
// 				logger.debug(`About to run strategy with params: address: ${addr}, block_height: ${conf.block_height}, endpoint: ${strategy.endpoint}`);
//
// 				const power = await runStrategy(addr, conf.block_height, strategy.endpoint);
//
// 				logger.debug(`vote power: ${power}`);
//
// 				if (!power || power === '0') break;
//
// 				logger.debug(`vote power: ${power}`);
//
// 				const voteParams = {
// 					poll_option_id: chosenOption.poll_option_id,
// 					account_id: addr,
// 					provider_id: 'ethereum',
// 					vote_power: power,
// 				};
//
// 				const vote = await createVote(poll._id, voteParams);
//
// 				if (!vote) return;
//
// 				await updateEmbedCount(poll, vote, componentContext, chosenOption);
//
// 				strategyResults.push({ address: addr, strategy: conf.strategy_id, VotingPower: power, option: chosenOption.poll_option_name, method: vote.method });
//
// 				logger.info('Token vote recorded successfully');
// 				logger.data(strategyResults);
// 			}
//
// 			voteResult.push(...strategyResults);
// 			logger.data(voteResult);
// 		}
//
// 		await componentContext.send({ content: `Your vote was recorded: \n${JSON.stringify(voteResult).substring(0, 2000)}` });
// 	}
// };

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

const updateEmbedCount = async (pollId, componentContext) => {

	const count = await fetchResultPerUserCount(pollId);

	logger.info(`Vote count: ${count}`);

	const pad = (num: number, size: number): string => {
		const s = '0000000' + num;
		return s.slice(s.length - size);
	};

	const embed = componentContext.message.embeds[0];

	embed.fields[componentContext.message.embeds[0].fields.length - 1].value = '```' + `${pad(count, 4)}` + '```';

	const msg = componentContext.message;

	logger.info('Updated embed');
	// logger.data('Updated embed', msg.embeds);

	await msg.edit({ embeds:[embed] });
};

// TODO try to implement with better readable font
// export const createAscii = async (count: number) => {
//
// 	// const pad = (num: number, size: number): string => {
// 	// 	const s = '0000000' + num;
// 	// 	return s.slice(s.length - size);
// 	// };
// 	//
// 	// let rendered = null;
// 	//
// 	// try {
// 	// 	rendered = await Font.create(pad(count, 4), 'Doom');
// 	//
// 	// 	logger.info(rendered);
// 	//
// 	// } catch(err) {
// 	// 	logger.error('failed to create ascii art');
// 	// }
//
// 	// return rendered;
// 	return '# votes: ' + count.toString();
// };

// const updateEmbedCountAdd = async (embed) => {
//
// 	logger.info('Updating embed count (add)');
// 	logger.data(embed);
//
// 	const pollId = embed.footer.text;
//
// 	const currentCount = cache.get(pollId);
//
// 	logger.info(`current count is ${currentCount}`);
// 	logger.info(currentCount + 1);
//
// 	const ascii = await createAscii(currentCount + 1);
//
// 	logger.info(ascii);
//
// 	embed.fields[embed.fields.length - 1].name = '```' + ascii + '```';
//
// 	cache.set(pollId, currentCount + 1);
//
// 	return embed;
// };

// const updateEmbedCountSubtract = async (embed) => {
//
// 	logger.info('Updating embed count (subtract)');
// 	logger.data(embed);
//
// 	const pollId = embed.footer.text;
//
// 	const currentCount = cache.get(pollId);
//
// 	const ascii = await createAscii(currentCount - 1);
//
// 	embed.fields[embed.fields.length - 1].name = '```' + ascii + '```';
//
// 	cache.set(pollId, currentCount - 1);
//
// 	return embed;
// };

// const updateEmbedCountAdd = (embed, optionEmoji, summand) => {
//
// 	logger.info('Updating embed count (add)');
// 	logger.data(embed);
// 	logger.debug('selected option emoji: ');
// 	logger.data(optionEmoji);
// 	logger.debug('summand: ');
// 	logger.data(summand);
//
// 	embed.fields.forEach((field: any, index: number) => {
//
// 		logger.debug('field value: ');
// 		logger.data(field.value);
//
// 		if (field.value === optionEmoji) {
//
// 			logger.debug('Current value');
// 			logger.data(parseInt(embed.fields[index + 1].value));
// 			logger.debug('Updated value');
// 			logger.data((parseInt(embed.fields[index + 1].value) + summand).toString());
//
// 			embed.fields[index + 1].value = (parseInt(embed.fields[index + 1].value) + summand).toString();
// 		}
// 	});
// 	return embed;
// };
//
// const updateEmbedCountSubtract = (embed, optionEmoji, subtrahend) => {
//
// 	logger.info('Updating embed count (substract)');
// 	logger.data(embed);
// 	logger.debug('selected option emoji: ');
// 	logger.data(optionEmoji);
// 	logger.debug('subtrahend: ');
// 	logger.data(subtrahend);
//
// 	embed.fields.forEach((field: any, index: number) => {
//
// 		logger.debug('field value: ');
// 		logger.data(field.value);
//
// 		if (field.value === optionEmoji) {
//
// 			logger.debug('Current value');
// 			logger.data(parseInt(embed.fields[index + 1].value));
// 			logger.debug('Updated value');
// 			logger.data((parseInt(embed.fields[index + 1].value) - subtrahend).toString());
//
// 			embed.fields[index + 1].value = (parseInt(embed.fields[index + 1].value) - subtrahend).toString();
// 		}
// 	});
// 	return embed;
// };

// const updateEmbedCountPlus1 = (embed, optionEmoji) => {
// 	embed.fields.forEach((field: any, index: number) => {
//
// 		if (field.value.substring(0, field.value.indexOf(':')).replace(/\s/g, '') === optionEmoji) {
//
// 			embed.fields[index + 1].value = (parseInt(embed.fields[index + 1].value) + 1).toString();
// 		}
// 	});
// 	return embed;
// };
//
// const updateEmbedCountMinus1 = (embed, optionEmoji) => {
// 	embed.fields.forEach((field: any, index: number) => {
//
// 		if (field.value.substring(0, field.value.indexOf(':')).replace(/\s/g, '') === optionEmoji) {
//
// 			embed.fields[index + 1].value = (parseInt(embed.fields[index + 1].value) - 1).toString();
// 		}
// 	});
// 	return embed;
// };

// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
const createVote = async (poll_id, voteParams) => {
	const voteRequestEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/vote/${poll_id}`;

	logger.debug({
		poll_option_id: voteParams.poll_option_id,
		account_id: voteParams.account_id,
		provider_id: voteParams.provider_id,
	});

	try {
		const vote: AxiosResponse = await axios.post(voteRequestEndpoint, {
			poll_option_id: voteParams.poll_option_id,
			account_id: voteParams.account_id,
			provider_id: voteParams.provider_id,
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
// const runStrategy = async (address, blockHeight, endpoint) => {
// 	const runStrategyEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/${endpoint}`;
//
// 	try {
// 		const power: AxiosResponse = await axios.post(runStrategyEndpoint, {
// 			account_id: address,
// 			block_height: blockHeight,
// 			// FIXME: make this global? check if it works in the client
// 		}, { transformResponse: (r) => r });
//
// 		logger.info('Done running strategy');
//
// 		logger.data(power);
// 		logger.debug(power.data.toString());
//
// 		return power.data;
//
// 	} catch (e) {
// 		logger.error('Failed to fetch strategy', e);
//
// 		return null;
// 	}
// };

// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
// const fetchStrategy = async (strategyId) => {
// 	const getStrategyEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/strategies/find/one/${strategyId}`;
//
// 	try {
// 		const strategy: AxiosResponse = await axios.get(getStrategyEndpoint);
//
// 		logger.info('Found strategy');
// 		logger.data('Found Strategy:', strategy.data);
//
// 		return strategy.data;
//
// 	} catch (e) {
// 		logger.error('Failed to fetch strategy', e);
//
// 		return null;
// 	}
// };

// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
export const fetchPoll = async (poll_id) => {
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
export const fetchResultSum = async (pollId) => {
	const resultsSumGetEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/vote/results/sum/${pollId}`;

	try {
		const results: AxiosResponse = await axios.get(resultsSumGetEndpoint);

		logger.info('Fetched results');
		logger.data(results.data);

		return results.data;

	} catch (e) {
		logger.error('Failed to fetch results', e);

		return null;
	}
};

// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
export const fetchResultPerUserCount = async (pollId) => {
	const resultsSumGetEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/vote/results/votes-per-user/count/${pollId}`;

	try {
		const results: AxiosResponse = await axios.get(resultsSumGetEndpoint);

		logger.info('Fetched results');
		logger.data(results.data);

		return results.data;

	} catch (e) {
		logger.error('Failed to fetch results', e);

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