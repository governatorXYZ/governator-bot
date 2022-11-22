import { DiscordEvent } from '../../types/discord/DiscordEvent';
import { ComponentContext } from 'slash-create';
import { createLogger } from '../../utils/logger';
import Vote from '../../service/vote/Vote';

export default class implements DiscordEvent {

	name = 'componentInteraction';
	once = false;
	logger = createLogger(this.name);

	async execute(componentContext:ComponentContext): Promise<any> {

		if (componentContext.componentType === 2) {
			await componentContext.defer(true);
			await Vote(componentContext).catch(e => this.logger.error('failed to react to poll', e));
		}

	}
}