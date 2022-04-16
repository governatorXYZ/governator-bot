import { ButtonInteraction } from 'discord.js';
import { DiscordEvent } from '../types/discord/DiscordEvent';
import { LogUtils } from '../utils/Log';
import ButtonInteractionAddVote from './vote/ButtonInteractionAddVote';

export default class implements DiscordEvent {

	name = 'interactionCreate';
	once = false;

	/*
     * Function that is called when event is emitted, Different events pass in a
     * varying number of arguments. See discord.js documentation for arguments
     * returned by emitted events. Client can be omitted as a function parameter
     * if it is not used.
     */
	async execute(interaction:ButtonInteraction): Promise<any> {

		if (interaction.isButton()) {
			await ButtonInteractionAddVote(interaction).catch(e => LogUtils.logError('failed to react to poll', e));
		}

	}
}
