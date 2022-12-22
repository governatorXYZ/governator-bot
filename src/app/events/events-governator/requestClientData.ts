import { DiscordEvent } from '../../types/discord/DiscordEvent';
import ClientRequest from '../../service/client-request/ClientRequest';
import { createLogger } from '../../utils/logger';

export default class implements DiscordEvent {

	name = 'REQUEST_CLIENT_DATA';
	once = false;

	logger = createLogger(this.name);

	async execute(event, client): Promise<any> {
		this.logger.debug(event);
		await ClientRequest(event, client);
	}
}