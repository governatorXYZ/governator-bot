import Discord, { ActionRowBuilder, ButtonBuilder, EmbedBuilder, TextChannel, ButtonStyle, APIMessageActionRowComponent } from 'discord.js';
import { createLogger } from '../../utils/logger';
import axios, { AxiosResponse } from 'axios';
import moment from 'moment';

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

	const row = new ActionRowBuilder<ButtonBuilder>();

	const dest = await client.channels.fetch(clientConfig.channel_id).catch((e) => {
		logger.error(e);
		return null;
	}) as TextChannel;

	if (!dest) return;

	const msgEmbed = await pollEmbed(poll, poll_options, EmojiList, poll._id);

	polls.forEach((option: any, index: number) => {
		row.addComponents(
			new ButtonBuilder()
				.setCustomId(`${poll._id}:${option}`)
				.setLabel(`${EmojiList[index]}`)
				.setStyle(ButtonStyle.Primary),
		);
	});

	logger.data('msgEmbed', msgEmbed);

	const pollMessage = await dest.send({ embeds: [ msgEmbed ], components: [row] }).catch((e) => {
		logger.error(e);
		return null;
	});

	if (!pollMessage) return;

	await updatePoll(poll, pollMessage.id);

	logger.info('Poll posted successfully');
};

const updatePoll = async (poll, messageId) => {
	const pollPatchEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/poll/update/${poll._id}`;

	poll.client_config.forEach((conf) => {
		if (conf.provider_id === 'discord') {
			conf['message_id'] = messageId;
		}
	});

	logger.debug('update poll: ');
	logger.data(poll.client_config);

	try {
		const newPoll: AxiosResponse = await axios.patch(pollPatchEndpoint, { client_config: poll.client_config });

		logger.info('Poll patch posted');
		logger.data('Poll patch:', newPoll.data);

		return newPoll.data;

	} catch (e) {
		logger.error('poll patch failed', e);

		return null;
	}
};


async function pollEmbed(poll, poll_options, EmojiList, id): Promise<EmbedBuilder> {

	const strategy = await fetchStrategy(poll.strategy_config[0].strategy_id);

	const ts = moment(poll.end_time).utc().format('X');

	// TODO: add author to the embed (required endpoint to look up client ID based on goverator user ID from poll)
	const msgEmbed = new Discord.EmbedBuilder().setTitle(`${poll.title} \nends <t:${ts}:R>`)
		.setDescription(poll.description)
		.setFooter({ text: id })
		.setThumbnail(process.env.GOVERNATOR_LOGO_URL.toString())
		.addFields([
			{ name: '\u200B', value: '\u200B', inline: false },
		]);

	logger.info(`poll end time: ${poll.end_time}, timestamp: ${ts}`);

	poll_options.forEach((option: any, index: number) =>{
		msgEmbed.addFields([{ name: `${EmojiList[index]} : ${option.poll_option_name}`, value: '\u200B', inline: false }]);
	});

	poll.client_config.find(config => config.provider_id === 'discord').role_restrictions.forEach((role, index) => {
		if (index === 0) {
			msgEmbed.addFields([{ name: '\u200B', value: '🚫 Role restrictions 🚫', inline: false }]);
		}
		msgEmbed.addFields([{ name: '\u200B', value: `<@&${role}>`, inline: false}]);

		if (index === (poll.client_config.find(config => config.provider_id === 'discord').role_restrictions.length - 1)) {
			msgEmbed.addFields([{ name: '\u200B', value: '\u200B', inline: false }]);
		}
	});

	msgEmbed.addFields([
		{ name: 'Strategy', value: ('`' + `${strategy.name}` + '`'), inline: true},
		{ name: '# votes', value: '```' + '0000' + '```', inline: true},
	]);

	return msgEmbed;

}

const fetchStrategy = async (strategyId) => {
	const strategyGetEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/strategies/find/one/${strategyId}`;

	try {
		const strategy: AxiosResponse = await axios.get(strategyGetEndpoint);

		logger.info('Fetched strategy');
		logger.data('Fetched strategy', strategy.data);

		return strategy.data;

	} catch (e) {
		logger.error('Failed to fetch strategy', e);

		return null;
	}
};