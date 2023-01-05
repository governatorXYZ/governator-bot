import { DiscordEvent } from '../../types/discord/DiscordEvent';
import DeletePoll from '../../service/poll/DeletePoll';
import { createLogger } from '../../utils/logger';

export default class implements DiscordEvent {

	name = 'POLL_DELETE';
	once = false;

	logger = createLogger(this.name);

	async execute(event, client): Promise<any> {
		this.logger.debug(event);
		await DeletePoll(event, client);

	}
}