import Discord, { MessageButton, ButtonInteraction, MessageEmbed, MessageActionRow } from 'discord.js';
import axios, { AxiosResponse } from 'axios';

export default async (reaction: ButtonInteraction): Promise<any> => {

	const poll_info = reaction.customId;
	const poll_id = poll_info.substring(0, poll_info.indexOf(':'));
	const poll_option = poll_info.substring(poll_info.indexOf(':') + 1);
	// console.log('poll info ', poll_info);
	// console.log('poll ID ', poll_id);
	// console.log('poll option ', poll_option);

	// fetch poll from db
	const poll = await fetchPoll(poll_id);

	if (!poll) return;

	// create list of poll options
	const PollOptionList = [];
	poll.poll_options.forEach((option) => {
		PollOptionList.push(option.poll_option_name);
	});

	if (!PollOptionList.includes(poll_option)) return;

	const chosenOption = poll.poll_options.find(obj => {
		return obj.poll_option_name === poll_option;
	});

	console.log('user picked option: ', chosenOption);

	// try to fetch user
	let user = await fetchUser('discord', reaction.user.id);

	// if no user found create user
	if (!user) {
		user = await createUser(reaction.user.username, reaction.user.avatarURL());

		// return if user could not be created
		if (!user) return;

		// link account to user
		await linkAccount(user._id, 'discord', reaction.user.id);

		// fetch again to make sure
		user = await fetchUser('discord', reaction.user.id);
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
		embed = updateEmbedCountPlus1(reaction.message.embeds[0], chosenOption._id);
		break;
	case 'delete':
		embed = updateEmbedCountMinus1(reaction.message.embeds[0], chosenOption._id);
		break;
	case 'update':
		embed = updateEmbedCountPlus1(reaction.message.embeds[0], chosenOption._id);
		updateEmbedCountMinus1(embed, vote.data.oldVote.poll_option_id);
		break;
	}

	const msgId = reaction.message.id;

	const channel = reaction.channel;

	const msg = channel.messages.cache.get(msgId);

	await msg.edit({ embeds:[embed] });
};

const updateEmbedCountPlus1 = (embed, optionId) => {
	// console.log(embed);
	embed.fields.forEach((field: any, index: number) => {

		if (field.value.substring(0, field.value.indexOf(':')).replace(/\s/g, '') === optionId) {

			embed.fields[index + 1].value = (parseInt(embed.fields[index + 1].value) + 1).toString();
		}
	});
	// console.log(embed);
	return embed;
};

const updateEmbedCountMinus1 = (embed, optionId) => {
	// console.log(embed);
	embed.fields.forEach((field: any, index: number) => {

		if (field.value.substring(0, field.value.indexOf(':')).replace(/\s/g, '') === optionId) {

			embed.fields[index + 1].value = (parseInt(embed.fields[index + 1].value) - 1).toString();
		}
	});
	// console.log(embed);
	return embed;
};

// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
const createVote = async (poll_option_id, user_id, poll_id) => {
	console.log('here');
	const voteRequestEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/vote/${poll_id}`;
	try {
		const vote = await axios.post(voteRequestEndpoint, {
			poll_option_id: poll_option_id,
			user_id: user_id,
		});

		console.log('Your Vote', vote.data);

		return vote.data;

	} catch (e) {
		console.log('vote request failed', e);

		return null;
	}
};

// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
const fetchPoll = async (poll_id) => {
	const getPollByIdEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/poll/${poll_id}`;

	try {
		const poll = await axios.get(getPollByIdEndpoint);

		console.log('Fetched Poll', poll.data);

		return poll.data;

	}	catch(e) {
		console.log('failed to fetch poll', e);

		return null;
	}
};

// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
const fetchUser = async (client_id, client_account_id) => {
	const userGetEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/user/${client_id}/${client_account_id}`;

	try {
		const user = await axios.get(userGetEndpoint);

		console.log('Fetched user', user.data);

		return user.data;

	} catch (e) {
		console.log('Failed to fetch user', e);

		return null;
	}
	// console.log('user fetch failed', e);
	// console.log(e.request.res.statusMessage);
	// console.log(e.request.res.statusMessage === 'Not Found');
};

// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
const createUser = async (username, pfpUrl) => {
	const userCreateEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/user/create`;

	try {
		const user = await axios.post(userCreateEndpoint, {
			name: username,
			image: pfpUrl,
		});

		console.log('Created user', user.data);

		return user.data;

	}	catch(e) {
		console.log('failed to create user', e);

		return null;
	}
};

// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
const linkAccount = async (user_id, client_id, client_account_id) => {
	const userAddAccountEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/user/add_provider_account`;

	try {
		const userAccount = await axios.post(userAddAccountEndpoint, {
			user_id: user_id,
			provider_id: client_id,
			provider_account_id: client_account_id,
		});

		console.log(`Account linked to user ${user_id}`, userAccount.data);

		return userAccount.data;

	}	catch(e) {
		console.log(`failed to link account to user ${user_id}`, e);

		return null;
	}
};


// TODO get reply to work
// const emojiInfo = {};
// function helpEmbed(poll): MessageEmbed {
// 	const polls = [];
// 	const EmojiList = [];
// 	poll.data.poll_options.forEach((option) => {
// 		EmojiList.push(option.poll_option_emoji);
// 	});
// 	poll.data.poll_options.forEach((option: any, index: number) =>{
// 		emojiInfo[EmojiList[index]] = { option: EmojiList[index], votes: 0 };
// 		polls.push(option.poll_option_name);
// 	});
// 	const msgEmbed = new Discord.MessageEmbed().setTitle(`GovBot\'s Poll - ${poll.data.title}`);
// 	polls.forEach((option: any, index: number) =>{
// 		msgEmbed.addField(option, `${EmojiList[index]} : ${option}\n`);
// 	});
//
// 	msgEmbed.setFooter({
// 		text: poll.data._id,
// 	});
//
// 	return msgEmbed;
// }


// if (!vote) return;

// try {
// await message.reactions.resolve(reaction.customId).users.remove(user.id);
// await reaction.reply({ content: `You voted for ${poll_option}`, ephemeral: true });

// const msgEmbed = helpEmbed(poll);
// const row = new MessageActionRow();
// poll.poll_options.forEach((option: any, index: number) =>{
// 	row.addComponents(
// 		new MessageButton()
// 			.setCustomId(`${poll_id}:${option}`)
// 			.setLabel(`${poll.data.poll_options.poll_option_emoji[index]}`)
// 			.setStyle('PRIMARY'),
// 	);
// });
// msgEmbed.addField('Voted', `You voted for ${poll_option}`);
// await reaction.update({ content: `You voted for ${poll_option}`, components: [row] });

// await reaction.followUp({ content: `You voted for ${poll_option}`, ephemeral: true, embeds: [msgEmbed], components: [row] });
// await reaction.update({ content: `You voted for ${poll_option}`, components: [row] });

// } catch (e) {
// 	console.log ('vote follow up failed', e);
// }