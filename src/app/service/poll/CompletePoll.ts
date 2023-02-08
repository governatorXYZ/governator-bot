import { TextChannel, Message, Embed, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createLogger } from '../../utils/logger';
import moment from 'moment';
import { Client } from 'discord.js';
import Api from '../../utils/api';
import { ClientConfigDiscordDto } from '../../types/governator-api/GovernatorApiTypes';
import { PollCompleteEventData } from '../../types/governator-events/GovernatorEventTypes';

const logger = createLogger('CompletePoll');

export default async (eventData: PollCompleteEventData, client: Client): Promise<void> => {

    logger.info(`processing POLL_COMPLETE event for poll ID ${eventData.poll_id}`);

    const poll = await Api.poll.fetchById(eventData.poll_id).catch((e: any) => {
        logger.error('failed to fetch poll', e);
        return null;
    });

    const config = poll?.client_config.find((conf) => conf.provider_id === 'discord') as ClientConfigDiscordDto;

    if (!config.message_id) {
        logger.error(`no message ID specified for poll ID ${eventData.poll_id}`);
        return;
    }

    let pollChannel: TextChannel;
    try {
        pollChannel = await client.channels.fetch(config.channel_id) as TextChannel;
    } catch {
        logger.debug('Failed to fetch poll channel');
        return;
    }

    let pollMessage: Message;
    try {
        pollMessage = await pollChannel.messages.fetch(config.message_id);
    } catch {
        logger.debug('Failed to fetch poll message');
        return;
    }

    const results = await Api.vote.fetchResultSum(eventData.poll_id);

    if (!poll?.poll_options) return;

    let winner = 0;
    const resultsMappedToEmojis = poll.poll_options.map((pollOption) => {
        logger.debug('matching emojis');
        logger.data ('poll option', pollOption);
        const optionResult = results.aggregate.find((result: any) => pollOption.poll_option_id === result._id);
        if (!optionResult) {
            return {
                poll_option_id: pollOption.poll_option_id,
                percent: '0',
                poll_option_value: `${pollOption.poll_option_emoji}  ${pollOption.poll_option_name.trim()}`,
            };
        } else {
            if (Number(optionResult.percent) > winner) winner = Number(optionResult.percent);
            return {
                poll_option_id: pollOption.poll_option_id,
                percent: optionResult.percent,
                poll_option_value: `${pollOption.poll_option_emoji}  ${pollOption.poll_option_name.trim()}`,
            };
        }
    });

    logger.debug('results mapped to emojis');
    logger.data(resultsMappedToEmojis);

    const ts = moment(poll.end_time).utc().format('X');

    const embed: Embed = pollMessage.embeds[0];

    const updateEmbed = new EmbedBuilder();

    const generateProgressBar = (percentage: string) => {
        let st = '';

        for (let i = 0, n = Math.round((20 / 100) * Number(percentage)); i < n; i++) {
            st += '█';
        }

        for (let i = 0, n = 20 - st.length; i < n; i++) {
            st += ' ';
        }

        return '`' + st + '`';
    };

    updateEmbed.setTitle(`${(results.aggregate.length > 0) ? '✅ ' : '❌'} ${poll.title}`)
        .setDescription(embed.description)
        .setAuthor(embed.author)
        .setFooter(embed.footer)
        .setThumbnail(embed.thumbnail ? embed.thumbnail.url : '')
        .addFields(embed.fields)
        .spliceFields(-1, 1, { name: `📅 Ended <t:${ts}:R>`, value: '\u200B', inline: false });

    if(resultsMappedToEmojis) {
        embed.fields.forEach((field: any, index: number) => {

            resultsMappedToEmojis.forEach((result) => {
                if (field.name === result.poll_option_value) {
                    updateEmbed.spliceFields(
                        index,
                        1,
                        {
                            name: `${field.name}`,
                            value: `${generateProgressBar(result.percent)} **| ${result.percent} %** ${(Number(result.percent) === winner) && (winner > 0) ? '🎉' : ''}`,
                            inline: false,
                        },
                    );
                }
            });
        });

        const row = new ActionRowBuilder<ButtonBuilder>();

        row.addComponents(
            new ButtonBuilder()
                .setURL(`https://governator.xyz/community/${(poll.client_config[0] as ClientConfigDiscordDto).guild_id}/polls/results/${poll._id}`)
                .setLabel('Result')
                .setStyle(ButtonStyle.Link),
        );

        // TODO think about race condition
        await pollMessage.edit({ embeds: [updateEmbed], components: [row] });
    } else {
        logger.error('resultsMappedToEmojis not defined');
        await pollMessage.edit({ embeds: [updateEmbed], components: [] });
    }
};
