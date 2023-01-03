import {
    Configuration,
    UserApi,
    AccountApi,
    VoteApi,
    StrategiesApi,
    PollCreateDto,
    PollApi,
    PollUpdateDto,
    DiscordAccountCreateDto,
    VoteRequestDto,
    RequestDataFromClientApi,
    DiscordResponseDto,
} from 'governator-api';
import { Strategy, VoteByPollAggregate } from '../types/governator-api/GovernatorApiTypes';

const configuration = new Configuration({
    basePath: `${process.env.GOVERNATOR_API_BASE_PATH}`,
    apiKey: process.env.GOVERNATOR_API_KEY,
});

const ApiUtils = {

    poll: {
        async fetchAll() {
            return (await new PollApi(configuration).pollControllerFetchAllPolls()).data;
        },
        async create(pollCreateDto: PollCreateDto) {
            return (await new PollApi(configuration).pollControllerCreatePoll(pollCreateDto)).data;
        },
        async update(pollId: string, pollUpdateDto: PollUpdateDto) {
            return (await new PollApi(configuration).pollControllerUpdatePoll(pollId, pollUpdateDto)).data;
        },
        async fetchById(pollId: string) {
            return (await new PollApi(configuration).pollControllerFetchPollById(pollId)).data;
        },
    },

    user: {
        async fetchByUserId(govnatorUserId: string) {
            return (await new UserApi(configuration).userControllerFetchUserById(govnatorUserId)).data;
        },

        async fetchByDiscordId(discordUserId: string) {
            return (await new UserApi(configuration).userControllerFetchUserByProvider(discordUserId, 'discord')).data;
        },

        async fetchByEthAddress(userEthAddress: string) {
            return (await new UserApi(configuration).userControllerFetchUserByProvider(userEthAddress, 'ethereum')).data;
        },
    },

    strategy: {
        async fetchById(strategyId: string) {
            // TODO: find out why it is named this way and fix it
            return (await new StrategiesApi(configuration).daoPunksStrategyGet(strategyId)).data as Strategy;
        },
    },

    account: {
        async fetchByDiscordUser(discordUserId: string) {
            return (await new AccountApi(configuration).accountControllerFindOneDiscordAccountByProviderAccountId(discordUserId)).data;
        },

        async create(discordAccountCreateDto: DiscordAccountCreateDto) {
            return (await new AccountApi(configuration).accountControllerCheckAndCreateDiscordAccount(discordAccountCreateDto)).data;
        },
    },

    vote: {
        async create(pollId: string, voteRequestDto: VoteRequestDto) {
            return (await new VoteApi(configuration).voteControllerCreateVote(pollId, voteRequestDto)).data;
        },
        async fetchVoteUserCount(pollId: string) {
            return (await new VoteApi(configuration).voteControllerFetchVoteUserCount(pollId)).data;
        },

        async fetchResultSum(pollId: string) {
            return (await new VoteApi(configuration).voteControllerFetchVoteByPollSumAggregate(pollId)).data as VoteByPollAggregate;
        },
    },

    dataRequest: {
        async respondToDataRequest(dataResponse: DiscordResponseDto) {
            return (await new RequestDataFromClientApi(configuration).clientRequestControllerSendResponse(dataResponse)).data;
        },
    },
};

export default ApiUtils;