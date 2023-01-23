import {
    CommandContext,
    SlashCommand,
    SlashCreator,
} from 'slash-create';
import GovInfo from '../service/help/GovInfo';

export default class Help extends SlashCommand {
    constructor(creator: SlashCreator) {
        super(creator, {
            name: 'help',
            description: 'where to get help',
            throttling: {
                usages: 3,
                duration: 1,
            },
            defaultPermission: true,
        });
    }

    async run(ctx: CommandContext): Promise<any> {
        if (ctx.user.bot) return;

        const messageOptions = GovInfo();
        messageOptions.ephemeral = true;
        return ctx.send(messageOptions);
    }
}