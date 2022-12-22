import { MessageOptions } from 'slash-create';

export default (): MessageOptions => {
	return {
		embeds: [{
			title: 'Governator Help',
			description: 'Governator.xyz is a web3 governance solutions platform. ' 
			+ 'Governator-bot is the discord bot used to run web3 enabled polls in your discord server.' 
			+ 'Polls can be created and managed using the web frontend at https://www.governator.xyz',
			fields: [
				{
					name: '-> Useful Links',
					value: '[BanklessDAO Product Support Center invite](https://discord.gg/85Kb6Qv6gd)\n',
					inline: false,
				},
			],
		}],
	};
};