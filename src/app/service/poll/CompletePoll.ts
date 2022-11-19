import { TextChannel } from 'discord.js';
import { createLogger } from '../../utils/logger';
import { fetchPoll, fetchResultSum } from '../vote/Vote';
import moment from 'moment';

const logger = createLogger('CompletePoll');

export default async (event, client): Promise<void> => {

	const eventData = JSON.parse(event.data);

	logger.debug(eventData.poll_id);

	logger.info(`received POLL_COMPLETE event for poll ID ${eventData.poll_id}`);

	const poll = await fetchPoll(eventData.poll_id);

	const config = poll.client_config.find((conf) => conf.provider_id === 'discord');

	if (!config.message_id) {
		logger.error(`no message ID specified for poll ID ${eventData.poll_id}`);
		return;
	}

	let pollChannel: TextChannel;
	try {
		pollChannel = await client.channels.fetch(config.channel_id) as TextChannel;
	} catch {
		logger.debug('Failed to fetch poll channel');
		return;
	}

	let pollMessage;
	try {
		pollMessage = await pollChannel.messages.fetch(config.message_id);
	} catch {
		logger.debug('Failed to fetch poll message');
		return;
	}

	const results = await fetchResultSum(eventData.poll_id);

	const resultsMappedToEmojis = poll.poll_options.map((pollOption) => {
		logger.debug('matching emojis');
		logger.data ('poll option', pollOption);
		const optionResult = results.aggregate.find(result => pollOption.poll_option_id === result._id);
		if (!optionResult) 	return { poll_option_id: pollOption.poll_option_id, percent: '0', poll_option_value: `${pollOption.poll_option_emoji} : ${pollOption.poll_option_name}` };
		else return { poll_option_id: pollOption.poll_option_id, percent: optionResult.percent, poll_option_value: `${pollOption.poll_option_emoji} : ${pollOption.poll_option_name}` };

	});

	logger.debug('results mapped to emojis');
	logger.data(resultsMappedToEmojis);

	const embed = pollMessage.embeds[0];

	const ts = moment(poll.end_time).utc().format('X');
	embed.setTitle(`${(results.aggregate.length > 0) ? '✅ ' : '❌'} Poll ended <t:${ts}:R> \n${poll.title}`);


	if(resultsMappedToEmojis) {
		embed.fields.forEach((field: any, index: number) => {

			resultsMappedToEmojis.forEach((result) => {
				if (field.name === result.poll_option_value) {
					embed.fields[index].name = `${field.name} : ${result.percent} %`;
				}
			});
		});

		// TODO think about race condition
		await pollMessage.edit({ embeds: [embed], components: [] });
	} else {
		logger.error('resultsMappedToEmojis not defined');
		await pollMessage.edit({ embeds: [embed], components: [] });
	}
};
