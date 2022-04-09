import Discord, { MessageButton, ButtonInteraction, MessageEmbed, MessageActionRow } from 'discord.js';
import axios, { AxiosResponse } from 'axios';

const emojiInfo = {};

export default async (reaction: ButtonInteraction): Promise<any> => {
	let poll_info = reaction.customId;
	let poll_id = poll_info.substring(0, poll_info.indexOf(':'));
	let poll_option = poll_info.substring(poll_info.indexOf(':') + 1);
	console.log(poll_id);
	console.log(poll_option);

	// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
	let poll: AxiosResponse<any>;
	const getPollByIdEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/poll/${poll_id}`;
	try {
		poll = await axios.get(getPollByIdEndpoint);
		console.log(poll.data);
	}	catch(e) {
		console.log('failed to fetch poll', e);
	}

	const PollOptionList = [];
	poll.data.poll_options.forEach((option) => {
		PollOptionList.push(option.poll_option_name);
	});

	if (!PollOptionList.includes(poll_option)) return;

	const chosenOption = poll.data.poll_options.find(obj => {
		return obj.poll_option_name === poll_option;
	});
	console.log(chosenOption);

	// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
	const voteRequestEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/vote/${poll_id}`;
	try {
		const vote = await axios.post(voteRequestEndpoint, {
			poll_option_id: chosenOption._id,
			provider_account_id: reaction.user.id,
		});

		console.log('Your Vote', vote.data);

	} catch (e) {
		console.log('vote request failed', e);
	}

	try {
		// await message.reactions.resolve(reaction.customId).users.remove(user.id);
		// await reaction.reply({ content: `You voted for ${poll_option}`, ephemeral: true });

		const msgEmbed = helpEmbed(poll);
		const row = new MessageActionRow();
		poll.data.poll_options.forEach((option: any, index: number) =>{
			row.addComponents(
				new MessageButton()
					.setCustomId(`${poll_id}:${option}`)
					.setLabel(`${poll.data.poll_options.poll_option_emoji[index]}`)
					.setStyle('PRIMARY'),
			);
		});
		msgEmbed.addField('Voted', `You voted for ${poll_option}`);
		// await reaction.update({ content: `You voted for ${poll_option}`, components: [row] });

		await reaction.reply({ content: `You voted for ${poll_option}`, ephemeral: true, embeds: [msgEmbed], components: [row] });
		// await reaction.update({ content: `You voted for ${poll_option}`, components: [row] });

	} catch (e) {
		console.log ('failed to remove reaction');
	}
};

function helpEmbed(poll): MessageEmbed {
	const polls = [];
	const EmojiList = [];
	poll.data.poll_options.forEach((option) => {
		EmojiList.push(option.poll_option_emoji);
	});
	poll.data.poll_options.forEach((option: any, index: number) =>{
		emojiInfo[EmojiList[index]] = { option: EmojiList[index], votes: 0 };
		polls.push(option.poll_option_name);
	});
	const msgEmbed = new Discord.MessageEmbed().setTitle(`GovBot\'s Poll - ${poll.data.title}`);
	polls.forEach((option: any, index: number) =>{
		msgEmbed.addField(option, `${EmojiList[index]} : ${option}\n`);
	});

	msgEmbed.setFooter({
		text: poll.data._id,
	});

	return msgEmbed;
}