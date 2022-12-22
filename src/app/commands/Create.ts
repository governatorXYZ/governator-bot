import {
	CommandContext,
	SlashCommand,
	SlashCreator,
} from 'slash-create';

export default class Help extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'create',
			description: 'Create a Poll',
			throttling: {
				usages: 3,
				duration: 1,
			},
			defaultPermission: true,
		});
	}

	async run(ctx: CommandContext): Promise<any> {
		if (ctx.user.bot) return;

		return ctx.send({ content: 'In order to create a poll, login to [governator.xyz](https://www.governator.xyz)', ephemeral: true });
	}
}