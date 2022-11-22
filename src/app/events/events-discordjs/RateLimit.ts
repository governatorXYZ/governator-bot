import { RateLimitData } from 'discord.js';
import { DiscordEvent } from '../../types/discord/DiscordEvent';
import { createLogger } from '../../utils/logger';

export default class implements DiscordEvent {
	name = 'rateLimit';
	once = false;
	logger = createLogger(this.name);

	async execute(rateLimitData: RateLimitData): Promise<any> {
		try {
			this.logger.warn(`rate limit reached timeout: ${rateLimitData.timeout}`, {
				indexMeta: true,
				meta: {
					timeout: rateLimitData.timeout,
					limit: rateLimitData.limit,
					method: rateLimitData.method,
					path: rateLimitData.path,
					route: rateLimitData.route,
					global: rateLimitData.global,
				},
			});
		} catch (e) {
			this.logger.error('failed to process event rateLimit', e);
		}
	}
}
