/* eslint-disable no-console */
import Discord, { Client, TextChannel, MessageEmbed } from 'discord.js';
import NodeEventSource from 'eventsource';

const EmojiList = [
	'🇦', '🇧', '🇨', '🇩', '🇪', '🇫', '🇬', '🇭', '🇮',
	'🇯', '🇰', '🇱', '🇲', '🇳', '🇴', '🇵', '🇶', '🇷',
	'🇸', '🇹', '🇺', '🇻', '🇼', '🇽', '🇾', '🇿',
];

const emojiInfo = {};
const MAX_REACTIONS = 10;
module.exports = (evtSource: NodeEventSource, client: Client) => {
	evtSource.addEventListener("POLL_CREATE", function(event) {
		const message = JSON.parse(event.data);
		// eslint-disable-next-line no-console
		console.log('New message', message);
		const title = message.title;
		console.log('title:', title);
		const channel_id = message.channel_id;
		console.log('channel_id:', channel_id);
		const poll_options = message.poll_options;
		const dest = client.channels.cache.get(channel_id) as TextChannel;
		const polls = [];
		poll_options.forEach((option: any, index: number) =>{
			emojiInfo[EmojiList[index]] = { option: EmojiList[index], votes: 0 };
			polls.push(option.Name);
		});
		console.log('polls:', polls);
		const usedEmojis = Object.keys(emojiInfo);
		// eslint-disable-next-line no-console
		console.log('usedEmojis', JSON.stringify(usedEmojis));
		const poll = await dest.send({ embeds: [ helpEmbed(title, polls) ] });
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
				// new vote
				if (votedEmoji !== reaction.emoji.name) {
					// FIXME:the current version of ReactionManager does not have Property 'get' anymore
					// const lastVote = poll.reactions.get(votedEmoji);
					const lastVote = reaction;
					lastVote.count -= 1;
					lastVote.users.remove(user.id);
					if (emojiInfo[votedEmoji].votes > 0) {
						emojiInfo[votedEmoji].votes -= 1;
					}
					voterInfo.set(user.id, { emoji: reaction.emoji.name });
					console.log('>votedEmoji:', votedEmoji);
					console.log('>reaction.emoji.name:', reaction.emoji.name);
					console.log(`>${reaction.emoji.name} votes:`, emojiInfo[reaction.emoji.name].votes);
				} else {
					if (emojiInfo[votedEmoji].votes > 0) {
						emojiInfo[votedEmoji].votes -= 1;
					}
				}
				emojiInfo[reaction.emoji.name].votes += 1;
				console.log('user.id:', user.id);
				console.log('votedEmoji:', votedEmoji);
				console.log('reaction.emoji.name:', reaction.emoji.name);
				console.log(`${votedEmoji} old votes:`, emojiInfo[votedEmoji].votes);
				console.log(`${reaction.emoji.name} new votes:`, emojiInfo[reaction.emoji.name].votes);

			} else {
				// Add new emoji not on the list, ignore it for now.
				console.log('ignore new emoji:', reaction.emoji.name);
			}
		});

		reactionCollector.on('dispose', (reaction, user) => {
			if (usedEmojis.includes(reaction.emoji.name)) {
				voterInfo.delete(user.id);
				emojiInfo[reaction.emoji.name].votes -= 1;
			}
		});
	
		reactionCollector.on('end', () => {
			let text = '*Ding! Ding! Ding! Time\'s up!\n Results are in,*\n\n';
			for (const emoji in emojiInfo) text += `\`${emojiInfo[emoji].option}\` - \`${emojiInfo[emoji].votes}\`\n\n`;
			poll.delete();
			dest.send({ embeds: [ helpEmbed(title, polls).setDescription(text) ] });
		});

	});
};

function helpEmbed(title, polls): MessageEmbed {
	const msgEmbed = new Discord.MessageEmbed().setTitle(`GovBot\'s Poll - ${title}`);
	polls.forEach((option: any, index: number) =>{
		msgEmbed.addField(option, `${EmojiList[index]} : ${option}\n`);
	});

	return msgEmbed;
}
