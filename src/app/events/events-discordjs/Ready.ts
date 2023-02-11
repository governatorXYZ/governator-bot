import { Client, Guild } from 'discord.js';
import { DiscordEvent } from '../../types/discord/DiscordEvent';
import { createLogger } from '../../utils/logger';

export default class implements DiscordEvent {
    name = 'ready';
    once = true;
    logger = createLogger(this.name);

    async execute(client: Client): Promise<any> {
        try {
            this.logger.info('Starting up the bot...');

            client.user?.setActivity({ name: process.env.DISCORD_BOT_ACTIVITY });
            client.guilds.cache.forEach(async (guild: Guild) => {
                this.logger.info(`Bot is active for: ${guild.id}, ${guild.name}`);
                await guild.channels.fetch();
                await guild.roles.fetch();
            });

            this.logger.info('Bot is ready!');
        } catch (e) {
            this.logger.error('Error processing event ready', e);
        }
    }
}
