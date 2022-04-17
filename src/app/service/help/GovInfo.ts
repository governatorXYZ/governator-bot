import { MessageOptions } from 'slash-create';

export default (): MessageOptions => {
	return {
		embeds: [{
			title: 'Governator Command Template',
			description: 'Template of Governator bot commands.',
			fields: [
				{
					name: '-> /gov info',
					value: 'Display ',
					inline: false,
				},
				{
					name: '-> Useful Links',
					value: '[BanklessDAO Product Support Center invite](https://discord.gg/85Kb6Qv6gd)\n',
					inline: false,
				},
			],
		}],
	};
};