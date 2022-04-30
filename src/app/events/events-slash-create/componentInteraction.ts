import { ButtonInteraction } from 'discord.js';
import { DiscordEvent } from '../../types/discord/DiscordEvent';
import { ComponentContext } from 'slash-create';
import { LogUtils } from '../../utils/Log';
import Vote from '../../service/vote/Vote';

export default class implements DiscordEvent {

	name = 'componentInteraction';
	once = false;

	async execute(componentContext:ComponentContext): Promise<any> {

		if (componentContext.componentType === 2) {
			await componentContext.defer(true);
			await Vote(componentContext).catch(e => LogUtils.logError('failed to react to poll', e));
		}

	}
}