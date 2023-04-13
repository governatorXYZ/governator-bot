import { ComponentContext } from 'slash-create';
import { createLogger } from '../../utils/logger';
import client from '../../app';
import { ethers } from 'ethers';
import { strategyTypes } from '../../constants/constants';
import Api from '../../utils/api';
import { DiscordAccountCreateDto,
    VoteResponseDto,
    VoteRequestDto,
    PollResponseDto,
    EthereumAccountResponseDto,
} from 'governator-sdk';
import { ClientConfigDiscordDto, Account } from '../../types/governator-api/GovernatorApiTypes';
import { Embed, EmbedBuilder, Message } from 'discord.js';

const logger = createLogger('Vote');

export default async (componentContext:ComponentContext): Promise<any> => {

    const pollInfo = componentContext.customID;
    const pollId = pollInfo.substring(0, pollInfo.indexOf(':'));
    const pollOptionId = pollInfo.substring(pollInfo.indexOf(':') + 1);

    // fetch poll from db
    const poll = await Api.poll.fetchById(pollId).catch((e: any) => {
        logger.error('failed to fetch poll', e);
        return null;
    });

    if (!poll) return;
	
    const clientConfig = poll.client_config.find((obj) => {
        return obj.provider_id === 'discord';
    }) as ClientConfigDiscordDto;

    if (clientConfig.role_restrictions && clientConfig.role_restrictions.length > 0) {
        if (await roleRestricted(componentContext, clientConfig.role_restrictions)) {
            await componentContext.send({ content: 'You do not have the required role to vote on this poll' });
            return;
        }
    }

    // create list of poll options
    const PollOptionIdList: string[] = [];
    poll.poll_options?.forEach((option) => {
        PollOptionIdList.push(option.poll_option_id);
    });

    if (!PollOptionIdList.includes(pollOptionId)) return;

    const chosenOption = poll.poll_options?.find(obj => {
        return obj.poll_option_id === pollOptionId;
    });

    // try to fetch account
    let account = await Api.account.fetchByDiscordUser(componentContext.user.id).catch((e: any) => {
        logger.error('failed to fetch account', e);
        return null;
    });

    // if no user found create user
    if (!account) {

        const discordAccount: DiscordAccountCreateDto = {
            _id: componentContext.user.id,
            discord_username: componentContext.user.username,
        };

        account = await Api.account.create(discordAccount).catch((e: any) => {
            logger.error('failed to fetch account', e);
            return null;
        });

        // return if account could not be created
        if (!account) return;

        // fetch again
        account = await Api.account.fetchByDiscordUser(componentContext.user.id).catch((e: any) => {
            logger.error('failed to fetch account', e);
            return null;
        });
    }

    // if user not found something is wrong
    if (!account) return;

    // if token weighted poll, verify if account has wallet linked
    const strategyType = poll.strategy_config ? poll.strategy_config[0].strategy_type : '';
    if (await noEthAccountLinked(componentContext) && (strategyType === strategyTypes.STRATEGY_TYPE_TOKEN_WEIGHTED)) {
        await componentContext.send({
            content: 'No verified ethereum accounts found. To enable token voting, please ' +
			'connect & verify your wallet on [governator.xyz](https://www.governator.xyz/account)',
        });
        return;
    }

    const voteParams = {
        poll_option_id: chosenOption?.poll_option_id,
        account_id: componentContext.user.id,
        provider_id: 'discord',
    } as VoteRequestDto;

    if (!poll._id) return;

    const votes = await Api.vote.create(poll._id, voteParams).catch((e: any) => {
        logger.error('failed to fetch account', e);
        return [];
    });

    if (votes.length === 0) {
        await componentContext.send({ content: 'No tokens found with your account(s).' });
        return;
    }

    await componentContext.send({ content: `${formatMessage(votes as VoteResponseDto[], poll)}` });
};

const formatMessage = (votes: VoteResponseDto[], poll: PollResponseDto) => {
    let st = '';
    let pollOption: any;
    for (const vote of votes) {

        let voteData: any = vote.data;
        let methodSt = '';
        switch (vote.method) {
        case 'create':
            methodSt = 'secretly cast';
            break;
        case 'update':
            methodSt = 'updated';
            voteData = (vote.data as any).updatedVote;
            break;
        case 'delete':
            methodSt = 'removed';
            break;
        }

        st = `Your vote has been ${methodSt}; results will be calculated and revealed when the poll ends. \n\n`;

        pollOption = poll.poll_options?.find(option => option.poll_option_id === voteData?.poll_option_id);

        st +=
			'`' + 'Option:' + '`' + ` ${ pollOption.poll_option_emoji } : ${ pollOption.poll_option_name }\n`
			+ '`' + 'Voting Weight:' + '`' + ` ${ formatVotePower(poll, voteData.vote_power) }\n`;
        // + '`' + 'Account:' + '`' + ` ${ voteData.account_id } (${ voteData.provider_id })`

    }
    return st.substring(0, 2000);
};

const formatVotePower = (poll: PollResponseDto, votePower: string) => {
    const strategyType = poll.strategy_config ? poll.strategy_config[0].strategy_type : '';
    if (strategyType === strategyTypes.STRATEGY_TYPE_TOKEN_WEIGHTED) {

        if (ethers.BigNumber.from(votePower).gt(ethers.BigNumber.from('10000'))) {

            return truncate(ethers.utils.formatEther(ethers.BigNumber.from(votePower)), 2);
        }
    }

    return votePower;
};

function truncate(str: string, maxDecimalDigits: number) {
    if (str.includes('.')) {
        const parts = str.split('.');
        return parts[0] + '.' + parts[1].slice(0, maxDecimalDigits);
    }
    return str;
}

const noEthAccountLinked = async (componentContext: ComponentContext) => {
    // get all accounts from user object
    const user = await Api.user.fetchByDiscordId(componentContext.user.id).catch((e) => {
        logger.error(e);
        return null;
    });

    if (!user) return false;

    const ethAccounts = [];
    if (user.provider_accounts && user.provider_accounts.length > 1) {
        for (const acct of user.provider_accounts) {
            if ((acct as Account).provider_id === 'ethereum' && (acct as EthereumAccountResponseDto).verified) ethAccounts.push(acct._id);
        }
    }

    if (ethAccounts.length === 0) {
        logger.debug('No verified eth accounts found');
        return true;
    }
    return false;
};

const roleRestricted = async (componentContext: ComponentContext, roleRestrictions: string[]) => {

    logger.info('Role restrictions apply, checking if user has required role');

    await client.guilds.fetch().catch((e) => {
        logger.error(e);
    });

    const guild = client.guilds.cache.get(componentContext.guildID ?? '');

    await guild?.members.fetch().catch((e) => {
        logger.error(e);
    });
    const guildMember = guild?.members.cache.get(componentContext.user.id);

    const restricted = guildMember?.roles.cache.every((value, key) => {
        return !roleRestrictions.includes(key);
    });

    logger.info(`User allowed to vote: ${!restricted}`);

    return restricted;
};

const pad = (num: string, size: number): string => {
    const s = '0000000' + num;
    return s.slice(s.length - size);
};

export const updateCountField = (embed: EmbedBuilder, count: string) => {

    if (!embed.data.fields) return;

    embed.data.fields[embed.data.fields.length - 2].value = '```' + `${pad(count, 4)}` + '```';

    return embed;
};

export const embedToEmbedBuilder = (embed: Embed): EmbedBuilder => {
    return new EmbedBuilder().setTitle(embed.title)
        .setDescription(embed.description)
        .setAuthor({
            name: embed.author?.name ?? '',
            iconURL: embed.author?.iconURL,
        })
        .setFooter(embed.footer)
        // .setThumbnail(embed.thumbnail?.url ?? null)
        .addFields(embed.fields);
};

export const updateMessageEmbed = async (message: Message, embed: EmbedBuilder) => {

    logger.data('update Embed', embed);

    await message.edit({ embeds:[embed] });
};