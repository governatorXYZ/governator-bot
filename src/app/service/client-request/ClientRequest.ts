import { 
	Collection,
	Guild,
	GuildChannel,
	Role,
	Snowflake,
	TextChannel,
	ThreadChannel,
	ChannelType
 } from 'discord.js';
import axios from 'axios';
import { createLogger } from '../../utils/logger';

const logger = createLogger('ClientDataRequest');

export default async (event, client): Promise<void> => {
	const dataRequest = JSON.parse(event.data);

	if (!(dataRequest.provider_id === 'discord')) return;

	let guild: Guild | null = null;
	try {
		guild = await client.guilds.fetch(dataRequest.guildId);
	} catch (e) {
		logger.info('failed to fetch guild ', e);
		return;
	}

	let guildChannels: Collection <Snowflake, (GuildChannel|ThreadChannel)>;
	let guildRoles: Collection <Snowflake, Role>;
	const filteredChannels: Collection<any, any> = new Collection();

	switch (dataRequest.method) {
	case 'channels':
		try {
			guildChannels = await guild.channels.cache;
		} catch (e) {
			logger.info('failed to fetch channels ', e);
			return;
		}

		if (guildChannels) {

			guildChannels.forEach((channel, key) => {
				if (channel.type === ChannelType.GuildText && (![ChannelType.PublicThread, ChannelType.PrivateThread].includes(channel.type))) {
					const member = (channel as TextChannel).members.get(dataRequest.userId);
					if (member) {
						return filteredChannels.set(key, guildChannels.get(key));
					}
				}
			});
		}
		await respondToDataRequest(dataRequest, mapIdToName(filteredChannels));
		break;
	case 'roles':
		try {
			guildRoles = await guild.roles.cache;
		} catch (e) {
			logger.info('failed to fetch roles ', e);
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

		return dataPostEvent.data;

	} catch (e) {
		logger.info('failed to post requested data', e);

		return null;
	}
};
