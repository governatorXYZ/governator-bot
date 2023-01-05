import { DiscordEvent } from '../../types/discord/DiscordEvent';
import CompletePoll from '../../service/poll/CompletePoll';
import { createLogger } from '../../utils/logger';

export default class implements DiscordEvent {

	name = 'POLL_COMPLETE';
	once = false;

	logger = createLogger(this.name);

	async execute(event, client): Promise<any> {
		this.logger.debug(event);
		await CompletePoll(event, client);

	}
}