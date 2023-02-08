import Discord, {
    Client,
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
    TextChannel,
    ButtonStyle,
    User,
} from 'discord.js';
import { createLogger } from '../../utils/logger';
import moment from 'moment';
import Api from '../../utils/api';
import {
    PollResponseDto,
    PollOptionDto,
    StrategyConfig,
    DiscordAccountResponseDto,
} from 'governator-api';
import { ClientConfigDiscordDto } from '../../types/governator-api/GovernatorApiTypes';

const logger = createLogger('CreatePoll');

export default async (poll: PollResponseDto, client: Client): Promise<void> => {
    const emojiInfo: Record<string, any> = {};

    const clientConfig = poll.client_config.find((obj) => {
        return obj.provider_id === 'discord';
    }) as ClientConfigDiscordDto;
    
    if (!clientConfig) return;

    logger.info(`New poll received - ${poll.title} -`);
    logger.debug(`Posting in channel - ${clientConfig.channel_id} -`);
    logger.data('New poll received', poll);

    const poll_options = poll.poll_options as PollOptionDto[];

    const emojiList: string[] = [];

    poll_options.forEach((option) => {
        emojiList.push(option.poll_option_emoji);
    });

    const polls: string[] = [];

    poll_options.forEach((option: any, index: number) => {
        emojiInfo[emojiList[index]] = { option: emojiList[index], votes: 0 };

        polls.push(option.poll_option_id);
    });

    logger.data('Poll options', polls);

    const usedEmojis = Object.keys(emojiInfo);

    logger.data('usedEmojis', usedEmojis);

    const row = new ActionRowBuilder<ButtonBuilder>();

    const dest = await client.channels.fetch(clientConfig.channel_id).catch((e) => {
        logger.error(e);
        return null;
    }) as TextChannel;

    if (!dest) return;

    const govUser = await Api.user.fetchByUserId(poll.author_user_id).catch((e: any) => {
        logger.error('failed to fetch governator user', e);
        return null;
    });

    if (!govUser) return;
    if (!govUser.provider_accounts) return;

    logger.data('govUser', govUser);

    const discordAccount = govUser.provider_accounts.find((account) => {
        return account.provider_id === 'discord';
    }) as DiscordAccountResponseDto;

    logger.data('authorDiscordUserId', discordAccount._id);

    const author = await client.users.fetch(discordAccount._id).catch((e) => {
        logger.error(e);
        return null;
    }) as User;
        
    if (!author) {
        logger.error('poll author not found');
        return;
    }

    logger.data(author.username);

    const pollEmbedParams = {
        author: author,
        poll: poll,
        emojiList: emojiList,
    };

    const msgEmbed = await pollEmbed(pollEmbedParams);

    polls.forEach((option: any, index: number) => {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`${poll._id}:${option}`)
                .setLabel(`${emojiList[index]}`)
                .setStyle(ButtonStyle.Secondary),
        );
    });

    logger.data('msgEmbed', msgEmbed);

    const pollMessage = await dest.send({ embeds: [msgEmbed], components: [row] }).catch((e) => {
        logger.error(e);
        return null;
    });

    if (!pollMessage) return;

    await updatePoll(poll, pollMessage.id);

    logger.info('Poll posted successfully');
};

const updatePoll = async (poll: PollResponseDto, messageId: string): Promise<void> => {

    poll.client_config.forEach((conf) => {
        if (conf.provider_id === 'discord') {
            (conf as ClientConfigDiscordDto)['message_id'] = messageId;
        }
    });

    logger.debug('update poll: ');
    logger.data(poll.client_config);

    await Api.poll.update(poll._id ?? '', { client_config: poll.client_config }).catch((e: any) => {
        logger.error('failed to update poll', e);
        return null;
    });
};

interface PollEmbedParams {
    author: User | null,
    poll: PollResponseDto,
    emojiList: string[],
}

const pollEmbed = async (pollEmbedParams: PollEmbedParams): Promise<EmbedBuilder> => {

    logger.data('creating Poll Embed with inputs: ', pollEmbedParams);

    const strategy = await Api.strategy.fetchById((pollEmbedParams.poll.strategy_config as StrategyConfig[])[0].strategy_id);

    const ts = moment(pollEmbedParams.poll.end_time).utc().format('X');

    const msgEmbed = new Discord.EmbedBuilder().setTitle(`${pollEmbedParams.poll.title}`)
        .setDescription(pollEmbedParams.poll.description)
        .setAuthor({
            name: (pollEmbedParams.author as Discord.User).username,
            iconURL: (pollEmbedParams.author as Discord.User).avatarURL() as string,
        })
        .setFooter({ text: pollEmbedParams.poll._id as string })
        .setThumbnail(process.env.GOVERNATOR_LOGO_URL?.toString() as string)
        .addFields([
            { name: '\u200B', value: '\u200B', inline: false },
        ]);

    logger.info(`poll end time: ${pollEmbedParams.poll.end_time}, timestamp: ${ts}`);

    (pollEmbedParams.poll.poll_options as PollOptionDto[]).forEach((option: any, index: number) => {
        msgEmbed.addFields([{ name: `${pollEmbedParams.emojiList[index]} ${option.poll_option_name}`, value: '\u200B', inline: false }]);
    });

    const clientConfig = pollEmbedParams.poll.client_config.find(config => config.provider_id === 'discord') as ClientConfigDiscordDto;

    clientConfig.role_restrictions.forEach((role, index) => {
        if (index === 0) {
            msgEmbed.addFields([{ name: '\u200B', value: '🚫 **Role restrictions**', inline: false }]);
        }
        msgEmbed.addFields([{ name: '\u200B', value: `<@&${role}>`, inline: false }]);

        if (index === (clientConfig.role_restrictions.length - 1)) {
            msgEmbed.addFields([{ name: '\u200B', value: '\u200B', inline: false }]);
        }
    });

    msgEmbed.addFields([
        { name: '♜ Strategy', value: ('```' + strategy.name + '```'), inline: true },
        { name: '🗳️ Votes', value: '```' + '0000' + '```', inline: true },
        { name: `📅 Ends <t:${ts}:R>`, value: '\u200B', inline: false },
    ]);

    return msgEmbed;
};