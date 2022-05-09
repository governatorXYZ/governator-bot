import { CommandContext } from 'slash-create';

export default async (ctx?: CommandContext): Promise<void> => {
	ctx?.send({ content: `Hi, ${ctx.user.id}! Welcome!`, ephemeral: true });

	await ctx.send({ content: 'How are you!', ephemeral: true });
};
