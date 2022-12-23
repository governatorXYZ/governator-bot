import { RateLimitData } from 'discord.js';
import { DiscordEvent } from '../../types/discord/DiscordEvent';
import { createLogger } from '../../utils/logger';

export default class implements DiscordEvent {
	name = 'rateLimited';
	once = false;
	logger = createLogger(this.name);

	async execute(rateLimitData: RateLimitData): Promise<any> {
		try {
			this.logger.warn(`rate limit reached timeout: ${rateLimitData.timeToReset}`, {
				indexMeta: true,
				meta: {
					timeToReset: rateLimitData.timeToReset,
					limit: rateLimitData.limit,
					method: rateLimitData.method,
					url: rateLimitData.url,
					route: rateLimitData.route,
					global: rateLimitData.global,
				},
			});
		} catch (e) {
			this.logger.error('failed to process event rateLimit', e);
		}
	}
}
