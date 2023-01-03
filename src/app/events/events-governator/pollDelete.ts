import { DiscordEvent } from '../../types/discord/DiscordEvent';
import DeletePoll from '../../service/poll/DeletePoll';
import { createLogger } from '../../utils/logger';
import { Client } from 'discord.js';
import { PollDeleteEvent } from '../../types/governator-events/GovernatorEventTypes';

export default class implements DiscordEvent {

    name = 'POLL_DELETE';
    once = false;

    logger = createLogger(this.name);

    async execute(event: PollDeleteEvent, client: Client): Promise<any> {
        this.logger.debug(event);

        await DeletePoll(JSON.parse(event.data as unknown as string), client);
    }
}