import { DiscordEvent } from '../../types/discord/DiscordEvent';
import CompletePoll from '../../service/poll/CompletePoll';

export default class implements DiscordEvent {

	name = 'POLL_COMPLETE';
	once = false;

	async execute(event, client): Promise<any> {
		await CompletePoll(event, client);

	}
}