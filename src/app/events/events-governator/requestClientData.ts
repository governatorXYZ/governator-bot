import { DiscordEvent } from '../../types/discord/DiscordEvent';
import ClientRequest from '../../service/client-request/ClientRequest';
import { createLogger } from '../../utils/logger';
import { Client } from 'discord.js';
import { RequestClientDataEvent } from '../../types/governator-events/GovernatorEventTypes';

export default class implements DiscordEvent {

    name = 'REQUEST_CLIENT_DATA';
    once = false;

    logger = createLogger(this.name);

    async execute(event: RequestClientDataEvent, client: Client): Promise<any> {
        this.logger.debug(event);

        await ClientRequest(JSON.parse(event.data as unknown as string), client);
    }
}