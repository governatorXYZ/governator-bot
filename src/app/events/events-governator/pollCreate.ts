import { DiscordEvent } from '../../types/discord/DiscordEvent';
import CreatePoll from '../../service/poll/CreatePoll';

export default class implements DiscordEvent {

	name = 'POLL_CREATE';
	once = false;

	async execute(event, client): Promise<any> {
		await CreatePoll(event, client);

	}
}