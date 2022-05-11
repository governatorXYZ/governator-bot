import axios, { AxiosResponse } from 'axios';
import { ComponentContext } from 'slash-create';
import { createLogger } from '../../utils/logger';
import client from '../../app';

const logger = createLogger('Vote');

export default async (componentContext:ComponentContext): Promise<any> => {

	const poll_info = componentContext.customID;
	const poll_id = poll_info.substring(0, poll_info.indexOf(':'));
	const poll_option = poll_info.substring(poll_info.indexOf(':') + 1);

	// fetch poll from db
	const poll = await fetchPoll(poll_id);

	if (!poll) return;

	if (poll.role_restrictions.length > 0) {
		if (await roleRestricted(componentContext, poll.role_restrictions)) {
			await componentContext.send({ content: 'You do not have the required role to vote on this poll' });
			return;
		}
	}

	// create list of poll options
	const PollOptionList = [];
	poll.poll_options.forEach((option) => {
		PollOptionList.push(option.poll_option_name);
	});

	if (!PollOptionList.includes(poll_option)) return;

	const chosenOption = poll.poll_options.find(obj => {
		return obj.poll_option_name === poll_option;
	});

	logger.data('user picked option: ', chosenOption);

	// try to fetch user
	let user = await fetchUser('discord', componentContext.user.id);

	// if no user found create user
	if (!user) {
		user = await createUser(componentContext.user.username, componentContext.user.avatarURL);

		// return if user could not be created
		if (!user) return;

		// link account to user
		await linkAccount(user._id, 'discord', componentContext.user.id);

		// fetch again to make sure
		user = await fetchUser('discord', componentContext.user.id);
	}

	// if user not found something is wrong
	if (!user) return;

	// otherwise, create the vote
	const vote = await createVote(chosenOption._id, user._id, poll_id);

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

	logger.info('Vote recorded successfully');
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
const createVote = async (poll_option_id, user_id, poll_id) => {
	const voteRequestEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/vote/${poll_id}`;
	try {
		const vote: AxiosResponse = await axios.post(voteRequestEndpoint, {
			poll_option_id: poll_option_id,
			user_id: user_id,
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
const fetchUser = async (client_id, client_account_id) => {
	const userGetEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/user/${client_id}/${client_account_id}`;

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
const createUser = async (username, pfpUrl) => {
	const userCreateEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/user/create`;

	try {
		const user: AxiosResponse = await axios.post(userCreateEndpoint, {
			name: username,
			image: pfpUrl,
		});

		logger.info('Created user');
		logger.data('Created user', user.data);

		return user.data;

	}	catch(e) {
		logger.error('failed to create user', e);

		return null;
	}
};

// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
const linkAccount = async (user_id, client_id, client_account_id) => {
	const userAddAccountEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/user/add_provider_account`;

	try {
		const userAccount: AxiosResponse = await axios.post(userAddAccountEndpoint, {
			user_id: user_id,
			provider_id: client_id,
			provider_account_id: client_account_id,
		});

		logger.info('Account linked');
		logger.data(`Account linked to user ${user_id}`, userAccount.data);

		return userAccount.data;

	}	catch(e) {
		logger.error(`failed to link account to user ${user_id}`, e);

		return null;
	}
};