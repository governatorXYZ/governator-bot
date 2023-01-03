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
} from 'governator-api';
import { ClientConfigDiscordDto, Account } from '../../types/governator-api/GovernatorApiTypes';

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
    // let account = await fetchAccount(componentContext.user.id);
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

    await updateEmbedCount(poll._id, componentContext);

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

const updateEmbedCount = async (pollId: string, componentContext: ComponentContext) => {

    const count = await Api.vote.fetchVoteUserCount(pollId).catch((e: any) => {
        logger.error('failed to fetch poll', e);
        return '0';
    });

    logger.info(`Vote count: ${count}`);

    const pad = (num: string, size: number): string => {
        const s = '0000000' + num;
        return s.slice(s.length - size);
    };

    const embed = componentContext.message.embeds[0];

    if (!embed.fields) return;

    embed.fields[embed.fields.length - 2].value = '```' + `${pad(count, 4)}` + '```';

    const msg = componentContext.message;

    logger.info('Updated embed');

    await msg.edit({ embeds:[embed] });
};

// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
// const createVote = async (pollId, voteParams) => {
//     const voteRequestEndpoint = `${Api.getBasePath()}/vote/${pollId}`;

//     logger.debug({
//         poll_option_id: voteParams.poll_option_id,
//         account_id: voteParams.account_id,
//         provider_id: voteParams.provider_id,
//     });

//     try {
//         const vote: AxiosResponse = await axios.post(voteRequestEndpoint, {
//             poll_option_id: voteParams.poll_option_id,
//             account_id: voteParams.account_id,
//             provider_id: voteParams.provider_id,
//         });

//         logger.info('Vote request posted');
//         logger.data('Vote request:', vote.data);

//         return vote.data;

//     } catch (e) {
//         logger.error('vote request failed', e);

//         return null;
//     }
// };

// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
// export const fetchPoll = async (pollId) => {
//     const getPollByIdEndpoint = `${Api.getBasePath()}/poll/${pollId}`;

//     try {
//         const poll: AxiosResponse = await axios.get(getPollByIdEndpoint);

//         logger.info('Fetched poll');
//         logger.data('Fetched poll', poll.data);

//         return poll.data;

//     }	catch(e) {
//         logger.error('Failed to fetch poll', e);

//         return null;
//     }
// };

// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
// const fetchAccount = async (clientAccountId) => {
//     const accountGetEndpoint = `${Api.getBasePath()}/account/discord/get-by-account-id/${clientAccountId}`;

//     try {
//         const account: AxiosResponse = await axios.get(accountGetEndpoint);

//         logger.info('Fetched account');
//         logger.data('Fetched account', account.data);

//         return account.data;

//     } catch (e) {
//         logger.error('Failed to fetch account', e);

//         return null;
//     }
// };

// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
// const fetchDiscordUser = async (clientAccountId) => {
//     const userGetEndpoint = `${Api.getBasePath()}/user/discord/${clientAccountId}`;

//     try {
//         const user: AxiosResponse = await axios.get(userGetEndpoint);

//         logger.info('Fetched user');
//         logger.data('Fetched user', user.data);

//         return user.data;

//     } catch (e) {
//         logger.error('Failed to fetch user', e);

//         return null;
//     }
// };

// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
// export const fetchGovernatorUser = async (governatorUserId: string) => {

//     return Api.user.fetchByUserId(governatorUserId);

// const userGetEndpoint = `${Api.getBasePath()}/user/${governatorUserId}`;

// try {
//     const user: AxiosResponse = await axios.get(userGetEndpoint);

//     logger.info('Fetched user');
//     logger.data('Fetched user', user.data);

//     return user.data;

// } catch (e) {
//     logger.error('Failed to fetch user', e);

//     return null;
// }
// };

// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
// const createAccount = async (id, username) => {
//     const accountCreateEndpoint = `${Api.getBasePath()}/account/discord/create`;

//     try {
//         const account: AxiosResponse = await axios.post(accountCreateEndpoint, {
//             _id: id,
//             discord_username: username,
//         });

//         logger.info('Created account');
//         logger.data('Created account', account.data);

//         return account.data;

//     }	catch(e) {
//         logger.error('failed to create account', e);

//         return null;
//     }
// };

// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
// export const fetchResultSum = async (pollId) => {
//     const resultsSumGetEndpoint = `${Api.getBasePath()}/vote/results/sum/${pollId}`;

//     try {
//         const results: AxiosResponse = await axios.get(resultsSumGetEndpoint);

//         logger.info('Fetched results');
//         logger.data(results.data);

//         return results.data;

//     } catch (e) {
//         logger.error('Failed to fetch results', e);

//         return null;
//     }
// };

// FIXME we will change this to openapi client in the future so we won't have to specify endpoints manually
// export const fetchResultPerUserCount = async (pollId) => {
//     const resultsSumGetEndpoint = `${Api.getBasePath()}/vote/results/votes-per-user/count/${pollId}`;

//     try {
//         const results: AxiosResponse = await axios.get(resultsSumGetEndpoint);

//         logger.info('Fetched results');
//         logger.data(results.data);

//         return results.data;

//     } catch (e) {
//         logger.error('Failed to fetch results', e);

//         return null;
//     }
// };