import { channel } from 'diagnostics_channel';
import { CommandContext } from 'slash-create';
import Log, { LogUtils } from '../../utils/Log';

export default async (ctx?: CommandContext): Promise<void> => {
	ctx?.send({ content: `Hi, ${ctx.user.id}! Welcome!`, ephemeral: true });

	await ctx.send({ content: 'How are you!', ephemeral: true });
};
