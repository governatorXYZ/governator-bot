import {
    Collection,
    Guild,
    GuildChannel,
    Role,
    Snowflake,
    TextChannel,
    ThreadChannel,
    ChannelType,
    Client,
} from 'discord.js';
import { createLogger } from '../../utils/logger';
import Api from '../../utils/api';
import { DiscordResponseDto } from 'governator-api';
import { DiscordRequestDto } from '../../types/governator-events/GovernatorEventTypes';

const logger = createLogger('ClientDataRequest');

export default async (dataRequest: DiscordRequestDto, client: Client): Promise<void> => {

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

    const responseData: DiscordResponseDto = {
        uuid: dataRequest.uuid,
        provider_id: dataRequest.provider_id,
        method:dataRequest.method,
        guildId: dataRequest.guildId,
        data: [{}],
    };

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

        responseData.data = mapIdToName(filteredChannels);

        logger.data('responseData', responseData);

        Api.dataRequest.respondToDataRequest(responseData);

        break;

    case 'roles':
        try {
            guildRoles = await guild.roles.cache;

        } catch (e) {
            logger.info('failed to fetch roles ', e);

            return;
        }

        responseData.data = mapIdToName(guildRoles);

        logger.data('responseData', responseData);

        Api.dataRequest.respondToDataRequest(responseData);

        break;
    }
};

const mapIdToName = (discordCollection: Collection<any, any>): Array<object> => {
    const responseDataSet: Array<object> = [];

    Array.from(discordCollection.keys()).forEach((key) => {
        const channelName = discordCollection.get(key).name;

        const obj: any = {};

        obj[key] = channelName;

        responseDataSet.push(obj);

    });

    return responseDataSet;
};

// const respondToDataRequest = async (dataRequest: DiscordRequestDto, data: Record<string, string>[]) => {
//     const dataPostEndpoint = `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/client/discord/data-response`;
//     try {
//         const dataPostEvent = await axios.post(dataPostEndpoint, {
//             uuid: dataRequest.uuid,
//             provider_id: dataRequest.provider_id,
//             method:dataRequest.method,
//             guildId: dataRequest.guildId,
//             data: data,
//         });

//         return dataPostEvent.data;

//     } catch (e) {
//         logger.info('failed to post requested data', e);

//         return null;
//     }
// };
