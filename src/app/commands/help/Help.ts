import {
	CommandContext,
	CommandOptionType, MessageOptions,
	SlashCommand,
	SlashCreator,
} from 'slash-create';
import HelpMe from '../../service/help/HelpMe';
import Examples from '../../service/help/Examples';
import { LogUtils } from '../../utils/Log';

export default class Help extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'vote',
			description: 'Getting more info on governator-bot!',
			options: [
				{
					name: 'help',
					type: CommandOptionType.SUB_COMMAND_GROUP,
					description: 'Configure users and roles to be added to election candidate.',
					options: [
						{
							name: 'info',
							type: CommandOptionType.SUB_COMMAND,
							description: 'Information that might governator vote.',
						},
						{
							name: 'examples',
							type: CommandOptionType.SUB_COMMAND,
							description: 'Examples of governator poll.',
						},

					],
				},
			],
			throttling: {
				usages: 3,
				duration: 1,
			},
			defaultPermission: true,
		});
	}
	
	async run(ctx: CommandContext): Promise<any> {
		LogUtils.logCommandStart(ctx);
		if (ctx.user.bot) return;
		const subCommand: string = ctx.subcommands[0];
		
		let messageOptions: MessageOptions;
		switch (subCommand) {
		case 'help':
			switch (ctx.subcommands[1]) {
			case 'examples':
				messageOptions = Examples();
				break;
			case 'info':
			default:
				messageOptions = HelpMe();
			}
		}

		return ctx.send(messageOptions, { ephemeral:true });
	}
}