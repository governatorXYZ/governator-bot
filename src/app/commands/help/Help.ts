import {
	CommandContext,
	CommandOptionType, MessageOptions,
	SlashCommand,
	SlashCreator,
} from 'slash-create';
import HelpMe from '../../service/help/HelpMe';
import ExampleButton from '../../service/help/ExampleButton';
import ExampleEmoji from '../../service/help/ExampleEmoji';
import { LogUtils } from '../../utils/Log';
import ValidationError from '../../errors/ValidationError'

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
							name: 'example1',
							type: CommandOptionType.SUB_COMMAND,
							description: 'Example of governator poll with button.',
						},
						{
							name: 'example2',
							type: CommandOptionType.SUB_COMMAND,
							description: 'Example of governator poll with emoji.',
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
		let command: Promise<any>;
		switch (subCommand) {
		case 'help':
			switch (ctx.subcommands[1]) {
			case 'example1':
				messageOptions = ExampleButton();
				return ctx.send(messageOptions);
				break;
			case 'example2':
				command = ExampleEmoji(ctx);
				break;
			case 'info':
			default:
				messageOptions = HelpMe();
				return ctx.send(messageOptions);
			}
		}
		this.handleCommandError(ctx, command);
	}
	handleCommandError(ctx: CommandContext, command: Promise<any>): void {
		command.catch(async e => {
			if (!(e instanceof ValidationError)) {
				// await ServiceUtils.sendOutErrorMessage(ctx);
				await ctx.send({
					content: 'Something is not working. Please reach out to us and a support member will happily assist!',
					ephemeral: true,
				});
				return;
			}
		});
	}
}