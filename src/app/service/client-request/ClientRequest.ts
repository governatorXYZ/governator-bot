import { Collection, Guild, GuildChannel, Role, Snowflake, ThreadChannel } from 'discord.js';
import axios from 'axios';

export default async (event, client): Promise<void> => {
	const dataRequest = JSON.parse(event.data);

	if (!(dataRequest.provider_id === 'discord')) return;

	let guild: Guild | null = null;
	try {
		guild = await client.guilds.fetch(dataRequest.guildId);
	} catch (e) {
		console.log('failed to fetch guild ', e);
		return;
	}

	let guildChannels: Collection <Snowflake, (GuildChannel|ThreadChannel)>;
	let guildRoles: Collection <Snowflake, Role>;

	switch (dataRequest.method) {
	case 'channels':
		try {
			guildChannels = await guild.channels.cache;
		} catch (e) {
			console.log('failed to fetch channels ', e);
			return;
		}
		await respondToDataRequest(dataRequest, mapIdToName(guildChannels));
		break;
	case 'roles':
		try {
			guildRoles = await guild.roles.cache;
		} catch (e) {
			console.log('failed to fetch roles ', e);
			return;
		}
		await respondToDataRequest(dataRequest, mapIdToName(guildRoles));
		break;
	}
};

const mapIdToName = (discordCollection: Collection<any, any>) => {
	const responseDataSet = [];
	Array.from(discordCollection.keys()).forEach((key) => {
		const channelName = discordCollection.get(key).name;
		const obj = {};
		obj[key] = channelName;
		responseDataSet.push(obj);
	});
	return responseDataSet;
};

const respondToDataRequest = async (dataRequest, data) => {
	const dataPostEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/client/discord/data-response`;
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
