import { DiscordEvent } from '../../types/discord/DiscordEvent';
import { createLogger } from '../../utils/logger';
import { Client, TextChannel } from 'discord.js';
import { VoteCreateEvent } from '../../types/governator-events/GovernatorEventTypes';
import Api from '../../utils/api';
import { ClientConfigDiscordDto } from '../../types/governator-api/GovernatorApiTypes';
import { embedToEmbedBuilder, updateMessageEmbed, updateCountField } from '../../service/vote/Vote';

export default class implements DiscordEvent {

    name = 'VOTE_CREATE';
    once = false;

    logger = createLogger(this.name);

    async execute(event: VoteCreateEvent, client: Client): Promise<any> {
        this.logger.debug(event.data.poll_id);

        const data = JSON.parse(event.data as unknown as string);

        const poll = await Api.poll.fetchById(data.poll_id);

        const discordConfig = poll.client_config.find(conf => conf.provider_id === 'discord') as ClientConfigDiscordDto;

        const channel = await client.channels.fetch(discordConfig.channel_id) as TextChannel;

        await channel.messages.fetch();

        const message = channel.messages.cache.get(discordConfig.message_id);

        if (!message) return;

        const embedBuilder = embedToEmbedBuilder(message.embeds[0]);

        const updatedEmbed = updateCountField(embedBuilder, data.vote_count);

        if (!updatedEmbed) return;

        await updateMessageEmbed(message, updatedEmbed);
    }
}