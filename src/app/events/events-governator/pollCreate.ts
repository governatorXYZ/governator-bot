import { DiscordEvent } from '../../types/discord/DiscordEvent';
import CreatePoll from '../../service/poll/CreatePoll';
import { createLogger } from '../../utils/logger';

export default class implements DiscordEvent {

	name = 'POLL_CREATE';
	once = false;

	logger = createLogger(this.name);

	async execute(event, client): Promise<any> {
		this.logger.debug(event);
		await CreatePoll(event, client);

	}
}