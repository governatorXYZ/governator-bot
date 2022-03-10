import { ButtonInteraction, User } from 'discord.js';
import { DiscordEvent } from '../types/discord/DiscordEvent';
import Log from '../utils/Log';

export default class implements DiscordEvent {

	name = 'interactionCreate';
	once = false;

	/* 
     * Function that is called when event is emitted, Different events pass in a 
     * varying number of arguments. See discord.js documentation for arguments 
     * returned by emitted events. Client can be omitted as a function parameter 
     * if it is not used. 
     */
	async execute(reaction:ButtonInteraction): Promise<any> { 
		if (!reaction.isButton()) return;
		Log.info(reaction);
	}
}