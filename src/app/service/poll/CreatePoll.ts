import Discord, { MessageActionRow, MessageButton, MessageEmbed, TextChannel } from 'discord.js';
import { createLogger } from '../../utils/logger';

const logger = createLogger('CreatePoll');

export default async (event, client): Promise<void> => {
	const emojiInfo = {};

	const poll = JSON.parse(event.data);

	const clientConfig = poll.client_config.find((obj) => {
		return obj.provider_id === 'discord';
	});

	logger.info(`New poll received - ${poll.title} -`);
	logger.debug(`Posting in channel - ${clientConfig.channel_id} -`);
	logger.data('New poll received', poll);

	const poll_options = poll.poll_options;

	const EmojiList = [];

	poll_options.forEach((option) => {
		EmojiList.push(option.poll_option_emoji);
	});

	const polls = [];

	poll_options.forEach((option: any, index: number) =>{
		emojiInfo[EmojiList[index]] = { option: EmojiList[index], votes: 0 };

		polls.push(option.poll_option_id);
	});

	logger.data('Poll options', polls);

	const usedEmojis = Object.keys(emojiInfo);

	logger.data('usedEmojis', usedEmojis);

	const row = new MessageActionRow();

	const dest = await client.channels.fetch(clientConfig.channel_id).catch((e) => {
		logger.error(e);
		return null;
	}) as TextChannel;

	if (!dest) return;

	const msgEmbed = pollEmbed(poll, poll_options, EmojiList, poll._id);

	polls.forEach((option: any, index: number) => {
		row.addComponents(
			new MessageButton()
				.setCustomId(`${poll._id}:${option}`)
				.setLabel(`${EmojiList[index]}`)
				.setStyle('PRIMARY'),
		);
	});

	logger.data('msgEmbed', msgEmbed);

	const pollMessage = await dest.send({ embeds: [ msgEmbed ], components: [row] }).catch((e) => {
		logger.error(e);
		return null;
	});

	if (!pollMessage) return;

	logger.info('Poll posted successfully');
};

function pollEmbed(poll, poll_options, EmojiList, id): MessageEmbed {

	// TODO: add author to the embed (required endpoint to look up client ID based on goverator user ID from poll)
	const msgEmbed = new Discord.MessageEmbed().setTitle(`Governator Poll - ${poll.title}`)
		.setDescription(poll.description)
		.setFooter({
			text: id,
		});

	poll_options.forEach((option: any, index: number) =>{
		msgEmbed.addField(option.poll_option_name, `${EmojiList[index]} : ${option.poll_option_name}\n`, true);

		msgEmbed.addField('\u200B', '0', true);

		msgEmbed.addField('\u200B', '\u200B', false);
	});

	return msgEmbed;

}