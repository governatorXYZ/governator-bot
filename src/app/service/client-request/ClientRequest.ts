import {
    Collection,
    Guild,
    GuildChannel,
    Role,
    Snowflake,
    // TextChannel,
    ThreadChannel,
    ChannelType,
    Client,
    // PermissionFlagsBits,
} from 'discord.js';
import { createLogger } from '../../utils/logger';
import Api from '../../utils/api';
import { DiscordResponseDto, CommunityResponseDto } from 'governator-sdk';
import { DiscordRequestDto } from '../../types/governator-events/GovernatorEventTypes';
import { CommunityClientConfigDiscordDto } from '../../types/governator-api/GovernatorApiTypes';

const logger = createLogger('ClientDataRequest');

export default async (dataRequest: DiscordRequestDto, client: Client): Promise<void> => {

    if (!(dataRequest.provider_id === 'discord')) return;

    let guild: Guild | null = null;

    try {
        guild = await client.guilds.fetch(dataRequest.guildId);

        logger.debug('fetched guild');

    } catch (e) {
        logger.error('failed to fetch guild ', e);

        return;
    }

    let guildChannels: Collection <Snowflake, (GuildChannel|ThreadChannel)>;

    let guildRoles: Collection <Snowflake, Role>;

    const filteredChannels: Collection<any, any> = new Collection();

    let communityConfig: CommunityResponseDto;
    let discordConfig: CommunityClientConfigDiscordDto;

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

            guildChannels = guild.channels.cache;

            // logger.debug(guildChannels);

        } catch (e) {
            logger.info('failed to fetch channels ', e);

            return;
        }

        communityConfig = await Api.community.getByGuildId(dataRequest.guildId);

        if (communityConfig) {
            discordConfig = communityConfig.client_config.find((config) => config.provider_id === 'discord') as CommunityClientConfigDiscordDto;
        }

        if (guildChannels) {
            guildChannels.forEach((channel, key) => {
                
                if (([ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.PublicThread, ChannelType.PrivateThread].includes(channel.type))) {

                    if (discordConfig && Array.isArray(discordConfig.channel_allowlist) && discordConfig.channel_allowlist.length && !discordConfig.channel_allowlist.includes(channel.id)) return;

                    if (discordConfig && Array.isArray(discordConfig.channel_denylist) && discordConfig.channel_denylist.length && discordConfig.channel_denylist.includes(channel.id)) return;

                    return filteredChannels.set(key, guildChannels.get(key));
                    // const member = (channel as TextChannel).members.get(dataRequest.userId);

                    // logger.debug('found member');

                    // if (member) {
                    //     if ((channel as TextChannel).permissionsFor(member).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel])) {
                    //         logger.debug('setting levels');
                    //         return filteredChannels.set(key, guildChannels.get(key));
                    //     }
                    // }
                }
            });
        }

        responseData.data = mapIdToName(filteredChannels);

        // logger.data('responseData', responseData);

        Api.dataRequest.respondToDataRequest(responseData);

        break;

    case 'roles':
        try {

            await guild.roles.fetch();

            guildRoles = guild.roles.cache;

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
