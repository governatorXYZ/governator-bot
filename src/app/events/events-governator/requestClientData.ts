import { DiscordEvent } from '../../types/discord/DiscordEvent';
import ClientRequest from '../../service/client-request/ClientRequest';

export default class implements DiscordEvent {

	name = 'REQUEST_CLIENT_DATA';
	once = false;

	async execute(event, client): Promise<any> {
		await ClientRequest(event, client);
	}
}