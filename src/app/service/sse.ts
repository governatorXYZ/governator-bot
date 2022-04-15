/* eslint-disable no-console */
import Discord, { Client, TextChannel, MessageEmbed, MessageActionRow, MessageButton } from 'discord.js';
import NodeEventSource from 'eventsource';
import axios from "axios";

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
		const row = new MessageActionRow();

		const dest = await client.channels.fetch(channel_id) as TextChannel;
		const msgEmbed = helpEmbed(title, polls, EmojiList, poll._id);
		polls.forEach((option: any, index: number) => {
			row.addComponents(
				new MessageButton()
					.setCustomId(`${poll._id}:${option}`)
					.setLabel(`${EmojiList[index]}`)
					.setStyle('PRIMARY'),
			);
		});

		console.log('msgEmbed', JSON.stringify(msgEmbed));
		await dest.send({ embeds: [ msgEmbed ], components: [row] });
	});

	evtSource.addEventListener('REQUEST_CLIENT_DATA', async function(event) {
		const dataRequest = JSON.parse(event.data);
		console.log(dataRequest);

		if (!(dataRequest.provider_id === 'discord')) return;

		const guild = await client.guilds.fetch(dataRequest.guildId);
		const guildChannels = await guild.channels.cache;

		const channelNames = [];
		Array.from(guildChannels.keys()).forEach((key) => {
			const channelName = guildChannels.get(key).name;
			const obj = {};
			obj[key] = channelName;
			channelNames.push(obj);
		});

		console.log(channelNames);

		switch (dataRequest.method) {
		case 'channels':
			console.log('channels');
			// await respondToDataRequest(dataRequest, [...await client.channels.cache]);
			await respondToDataRequest(dataRequest, channelNames);
			break;
		case 'roles':
			console.log('roles');
			break;
		}

	});

	evtSource.addEventListener('RESPONSE_CLIENT_DATA', async function(event) {
		const dataRequest = JSON.parse(event.data);
		console.log(dataRequest);
	});

};

// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
const respondToDataRequest = async (dataRequest, data) => {
	console.log(JSON.stringify(data[0]));
	console.log(dataRequest);
	const dataPostEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/client/discord/channels`;
	try {
		const dataPostEvent = await axios.post(dataPostEndpoint, {
			uuid: dataRequest.uuid,
			provider_id: dataRequest.provider_id,
			method:dataRequest.method,
			guildId: dataRequest.guildId,
			data: data,
		});

		// console.log('dataPostEvent', dataPostEvent.data);

		return dataPostEvent.data;

	} catch (e) {
		console.log('failed to post requested data', e);

		return null;
	}
};

function helpEmbed(title, polls, EmojiList, id): MessageEmbed {
	const msgEmbed = new Discord.MessageEmbed().setTitle(`GovBot\'s Poll - ${title}`);
	polls.forEach((option: any, index: number) =>{
		msgEmbed.addField(option, `${EmojiList[index]} : ${option}\n`, true);
		msgEmbed.addField('\u200B', '0', true);
		msgEmbed.addField('\u200B', '\u200B', false);
	});

	msgEmbed.setFooter({
		text: id,
	});

	return msgEmbed;
}
