import { MessageOptions } from 'slash-create';

export default (): MessageOptions => {
    return {
        embeds: [{
            title: 'Governator Help',
            description: 'Governator.xyz is a web3 governance solutions platform. '
			+ 'Governator-bot is the discord bot used to run web3 enabled polls in your discord server. '
			+ 'Polls can be created and managed using the web frontend at [governator.xyz](https://www.governator.xyz)',
            fields: [
                {
                    name: '-> Useful Links',
                    value: '[Governator Notion Page](https://governator.notion.site/Governator-Support-Center-2ebc542d891a4fbba9c014cef66a6d64)\n',
                    inline: false,
                },
            ],
        }],
    };
};