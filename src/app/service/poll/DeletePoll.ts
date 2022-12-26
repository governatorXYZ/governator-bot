import { TextChannel, Message } from 'discord.js';
import { createLogger } from '../../utils/logger';

const logger = createLogger('DeletePoll');

export default async (event, client): Promise<void> => {

	const poll = JSON.parse(event.data);

	logger.info(`processing POLL_DELETE event for poll ID ${poll._id}`);

	const config = poll.client_config.find((conf) => conf.provider_id === 'discord');

	if (!config.message_id) {
		logger.error(`no message ID specified for poll ID ${poll._id}`);
		return;
	}

	let pollChannel: TextChannel;
	try {
		pollChannel = await client.channels.fetch(config.channel_id) as TextChannel;
	} catch {
		logger.debug('Failed to fetch poll channel');
		return;
	}

	let pollMessage: Message;
	try {
		pollMessage = await pollChannel.messages.fetch(config.message_id);
	} catch {
		logger.debug('Failed to fetch poll message');
		return;
	}

    await pollMessage.delete()
};
