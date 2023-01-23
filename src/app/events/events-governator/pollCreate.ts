import { DiscordEvent } from '../../types/discord/DiscordEvent';
import CreatePoll from '../../service/poll/CreatePoll';
import { createLogger } from '../../utils/logger';
import { Client } from 'discord.js';
import { PollCreateEvent } from '../../types/governator-events/GovernatorEventTypes';

export default class implements DiscordEvent {

    name = 'POLL_CREATE';
    once = false;

    logger = createLogger(this.name);

    async execute(event: PollCreateEvent, client: Client): Promise<any> {
        this.logger.debug(event);

        await CreatePoll(JSON.parse(event.data as unknown as string), client);
    }
}