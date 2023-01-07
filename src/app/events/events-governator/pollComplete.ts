import { DiscordEvent } from '../../types/discord/DiscordEvent';
import CompletePoll from '../../service/poll/CompletePoll';
import { createLogger } from '../../utils/logger';
import { Client } from 'discord.js';
import { PollCompleteEvent } from '../../types/governator-events/GovernatorEventTypes';

export default class implements DiscordEvent {

    name = 'POLL_COMPLETE';
    once = false;

    logger = createLogger(this.name);

    async execute(event: PollCompleteEvent, client: Client): Promise<any> {
        this.logger.debug(event);

        await CompletePoll(JSON.parse(event.data as unknown as string), client);

    }
}