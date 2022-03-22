import Discord, { Client, TextChannel, MessageEmbed } from 'discord.js';
import NodeEventSource from 'eventsource';

const EmojiList = [
	'🇦', '🇧', '🇨', '🇩', '🇪', '🇫', '🇬', '🇭', '🇮',
	'🇯', '🇰', '🇱', '🇲', '🇳', '🇴', '🇵', '🇶', '🇷',
	'🇸', '🇹', '🇺', '🇻', '🇼', '🇽', '🇾', '🇿',
];
const TextList = [
	'Monday', 'Tuesday', 'Wednesday', 'Thursday',
	'Friday', 'Saturday', 'Sunday',
];

const emojiInfo = {};
const MAX_REACTIONS = 3;
module.exports = (evtSource: NodeEventSource, client: Client, title = 'testing') => {
	evtSource.onmessage = async ({ data, lastEventId }) => {
		let text = '*To vote, react using the correspoding emoji.*\n\n';
		const message = JSON.parse(data);
		// eslint-disable-next-line no-console
		console.log('New message', message, lastEventId);
		const dest = client.channels.cache.get('926253526768828527') as TextChannel;
		// dest.send('New message');
		// const options = (['jerry', 'tom', 'pluto', 'micky', 'mini'] as const).filter(e => [e]);
		// pollEmbed(dest, 'Test poll', options);
		parseJSON(message);
		TextList.forEach((option: any, index: number) =>{
			emojiInfo[EmojiList[index]] = { option: EmojiList[index], votes: 0 };
		});
		const usedEmojis = Object.keys(emojiInfo);
		// eslint-disable-next-line no-console
		console.log('usedEmojis', JSON.stringify(usedEmojis));
		const poll = await dest.send({ embeds: [ helpEmbed(title) ] });
		for (const emoji of usedEmojis) await poll.react(emoji);

		const filter = (reaction, user) => usedEmojis.includes(reaction.emoji.name) && !user.bot;

		const reactionCollector = poll.createReactionCollector({
			filter,
			max: MAX_REACTIONS,
		});

		const voterInfo = new Map();
		reactionCollector.on('collect', (reaction, user) => {
			if (usedEmojis.includes(reaction.emoji.name)) {
				if (!voterInfo.has(user.id)) voterInfo.set(user.id, { emoji: reaction.emoji.name });
				const votedEmoji = voterInfo.get(user.id).emoji;
				if (votedEmoji !== reaction.emoji.name) {
					// const lastVote = poll.reactions.get(votedEmoji);
					const lastVote = reaction;
					lastVote.count -= 1;
					lastVote.users.remove(user.id);
					emojiInfo[votedEmoji].votes -= 1;
					voterInfo.set(user.id, { emoji: reaction.emoji.name });
				}
				emojiInfo[reaction.emoji.name].votes += 1;
			}
		});

		reactionCollector.on('dispose', (reaction, user) => {
			if (usedEmojis.includes(reaction.emoji.name)) {
				voterInfo.delete(user.id);
				emojiInfo[reaction.emoji.name].votes -= 1;
			}
		});
	
		reactionCollector.on('end', () => {
			text = '*Ding! Ding! Ding! Time\'s up!\n Results are in,*\n\n';
			for (const emoji in emojiInfo) text += `\`${emojiInfo[emoji].option}\` - \`${emojiInfo[emoji].votes}\`\n\n`;
			poll.delete();
			dest.send({ embeds: [ helpEmbed(title).setDescription(text) ] });
		});

	};
};

function parseJSON(data:JSON) {
	for(const name in data) {
		// eslint-disable-next-line no-console
		console.log(name + ': ' + data[name]);
	}
}

function helpEmbed(title): MessageEmbed {
	const msgEmbed = new Discord.MessageEmbed().setTitle(`GovBot\'s Poll - ${title}`);
	TextList.forEach((option: any, index: number) =>{
		msgEmbed.addField(option, `${EmojiList[index]} : ${TextList[index]}\n`);
	});

	return msgEmbed;
}
