import { Message, MessageReaction, User } from 'discord.js';
import axios, { AxiosResponse } from 'axios';

export default async (reaction: MessageReaction, user: User): Promise<any> => {

	const message: Message = await reaction.message.fetch();

	if (message.embeds == null || message.embeds[0] == null) {
		return;
	}

	// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
	let poll: AxiosResponse<any>;
	const getPollByIdEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/poll/${message.embeds[0].footer.text}`;
	try {
		poll = await axios.get(getPollByIdEndpoint);
		console.log(poll.data);
	}	catch(e) {
		console.log('failed to fetch poll', e);
	}

	const EmojiList = [];
	poll.data.poll_options.forEach((option) => {
		EmojiList.push(option.poll_option_emoji);
	});

	if (!EmojiList.includes(reaction.emoji.name)) return;

	const chosenOption = poll.data.poll_options.find(obj => {
		console.log(obj.poll_option_emoji);
		console.log(reaction.emoji.name);
		console.log(obj.poll_option_emoji === reaction.emoji.name);
		return obj.poll_option_emoji === reaction.emoji.name;
	});

	console.log(chosenOption);

	// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
	const voteRequestEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/vote/${message.embeds[0].footer.text}`;
	try {
		const vote = await axios.post(voteRequestEndpoint, {
			poll_option_id: chosenOption._id,
			provider_account_id: user.id,
		});

		console.log('Your Vote', vote.data);

	} catch (e) {
		console.log('vote request failed', e);
	}

	try {
		await message.reactions.resolve(reaction.emoji.name).users.remove(user.id);
	} catch (e) {
		console.log ('failed to remove reaction');
	}
};