import { TextChannel } from 'discord.js';
import { createLogger } from '../../utils/logger';
import { fetchPoll, fetchResultSum } from '../vote/Vote';

const logger = createLogger('CreatePoll');

export default async (event, client): Promise<void> => {

	const pollId = event.data;

	logger.info(`received POLL_COMPLETE event for poll ID ${pollId}`);

	const poll = await fetchPoll(pollId);

	const config = poll.client_config.find((conf) => conf.provider_id === 'discord');

	if (!config.message_id) {
		logger.error(`no message ID specified for poll ID ${pollId}`);
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

	const results = await fetchResultSum(pollId);

	const resultsMappedToEmojis = results.aggregate.map((result) => {
		for (const pollOption of poll.poll_options) {
			if (pollOption.poll_option_id === result._id) {
				return { poll_option_id: pollOption.poll_option_id, percent: result.percent, poll_option_emoji: pollOption.poll_option_emoji };
			}
		}
	});

	logger.debug('results mapped to emojis');
	logger.data(resultsMappedToEmojis);

	pollMessage.embeds[0].fields.forEach((field: any, index: number) => {

		resultsMappedToEmojis.forEach((result) => {
			if (field.value === result.poll_option_emoji) {

				logger.debug('Current value');
				logger.data(parseInt(pollMessage.embeds[0].fields[index + 1].value));
				logger.debug('Updated value');
				logger.data(result.percent);

				pollMessage.embeds[0].fields[index].value = `${field.value}:${result.percent} %`;
			}
		});
	});

	await pollMessage.edit({ embeds: pollMessage.embeds, components: [] });
};
