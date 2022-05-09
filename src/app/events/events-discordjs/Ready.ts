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

			client.user.setActivity(process.env.DISCORD_BOT_ACTIVITY);
			client.guilds.cache.forEach((guild: Guild) => {
				this.logger.info(`Bot is active for: ${guild.id}, ${guild.name}`);
			});

			this.logger.info('Bot is ready!');
		} catch (e) {
			this.logger.error('Error processing event ready', e);
		}
	}
}
