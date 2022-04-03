/* eslint-disable no-console */
import Discord, { Client, TextChannel, MessageEmbed } from 'discord.js';
import NodeEventSource from 'eventsource';

const emojiInfo = {};
module.exports = (evtSource: NodeEventSource, client: Client) => {
	evtSource.addEventListener('POLL_CREATE', async function(event) {
		const poll = JSON.parse(event.data);
		// eslint-disable-next-line no-console
		console.log('New message', poll);
		const title = poll.title;
		console.log('title:', title);
		const channel_id = poll.channel_id;
		console.log('channel_id:', channel_id);
		const poll_options = poll.poll_options;
		const EmojiList = [];
		poll_options.forEach((option) => {
			EmojiList.push(option.poll_option_emoji);
		});
		const polls = [];
		poll_options.forEach((option: any, index: number) =>{
			emojiInfo[EmojiList[index]] = { option: EmojiList[index], votes: 0 };
			polls.push(option.poll_option_name);
		});
		console.log('polls:', polls);
		const usedEmojis = Object.keys(emojiInfo);
		// eslint-disable-next-line no-console
		console.log('usedEmojis', JSON.stringify(usedEmojis));
		const dest = await client.channels.fetch(channel_id) as TextChannel;
		const msgEmbed = helpEmbed(title, polls, EmojiList, poll._id);
		console.log('msgEmbed', JSON.stringify(msgEmbed));
		const message = await dest.send({ embeds: [ msgEmbed ] });
		for (const emoji of usedEmojis) await message.react(emoji);
	});
};

function helpEmbed(title, polls, EmojiList, id): MessageEmbed {
	const msgEmbed = new Discord.MessageEmbed().setTitle(`GovBot\'s Poll - ${title}`);
	polls.forEach((option: any, index: number) =>{
		msgEmbed.addField(option, `${EmojiList[index]} : ${option}\n`);
	});

	msgEmbed.setFooter({
		text: id,
	});

	return msgEmbed;
}
