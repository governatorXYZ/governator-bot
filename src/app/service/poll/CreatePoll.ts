import Discord, { MessageActionRow, MessageButton, MessageEmbed, TextChannel } from 'discord.js';
import { createLogger } from '../../utils/logger';

const logger = createLogger('CreatePoll');

export default async (event, client): Promise<void> => {
	const emojiInfo = {};

	const poll = JSON.parse(event.data);

	logger.info(`New poll received - ${poll.title} -`);
	logger.debug(`Posting in channel - ${poll.channel_id} -`);
	logger.data('New poll received', poll);

	const poll_options = poll.poll_options;

	const EmojiList = [];

	poll_options.forEach((option) => {
		EmojiList.push(option.poll_option_emoji);
	});

	const polls = [];

	poll_options.forEach((option: any, index: number) =>{
		emojiInfo[EmojiList[index]] = { option: EmojiList[index], votes: 0 };

		polls.push(option.poll_option_name);
	});

	logger.data('Poll options', polls);

	const usedEmojis = Object.keys(emojiInfo);

	logger.data('usedEmojis', usedEmojis);

	const row = new MessageActionRow();

	const dest = await client.channels.fetch(poll.channel_id) as TextChannel;

	const msgEmbed = helpEmbed(poll.title, polls, EmojiList, poll._id);

	polls.forEach((option: any, index: number) => {
		row.addComponents(
			new MessageButton()
				.setCustomId(`${poll._id}:${option}`)
				.setLabel(`${EmojiList[index]}`)
				.setStyle('PRIMARY'),
		);
	});

	logger.data('msgEmbed', msgEmbed);

	await dest.send({ embeds: [ msgEmbed ], components: [row] });
};

function helpEmbed(title, polls, EmojiList, id): MessageEmbed {
	const msgEmbed = new Discord.MessageEmbed().setTitle(`Governator Poll - ${title}`);

	polls.forEach((option: any, index: number) =>{
		msgEmbed.addField(option, `${EmojiList[index]} : ${option}\n`, true);

		msgEmbed.addField('\u200B', '0', true);

		msgEmbed.addField('\u200B', '\u200B', false);
	});

	msgEmbed.setFooter({
		text: id,
	});

	return msgEmbed;
}