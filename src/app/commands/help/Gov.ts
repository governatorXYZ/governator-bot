import {
	CommandContext,
	CommandOptionType, MessageOptions,
	SlashCommand,
	SlashCreator,
} from 'slash-create';
import GovInfo from '../../service/help/GovInfo';
import HelpMe from '../../service/help/HelpMe';
import { LogUtils } from '../../utils/Log';

export default class Help extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'gov',
			description: 'Getting more info on governator-bot!',
			options: [
				{
					name: 'info',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Information that might governator poll.',
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
		
		let messageOptions: MessageOptions;
		switch (ctx.subcommands[0]) {
		case 'info':
			messageOptions = GovInfo();
			break;
		}
		return ctx.send(messageOptions);
	}
}