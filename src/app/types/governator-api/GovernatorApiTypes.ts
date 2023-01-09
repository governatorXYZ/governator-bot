import {
    ClientConfigBase,
    DiscordAccountResponseDto,
    EthereumAccountResponseDto,
    CommunityClientConfigBase,
} from 'governator-api';

export type Account = DiscordAccountResponseDto | EthereumAccountResponseDto;

export interface Strategy {
    _id: string,
    description: string,
    endpoint: string,
    name: string,
    strategy_type: string,
    createdAt: string,
    updatedAt: string,
}

export interface ClientConfigDiscordDto extends ClientConfigBase {
    guild_id: string;
    channel_id: string;
    message_id: string;
    role_restrictions: string[];
}

export interface VoteByPollAggregate {
    aggregate: any[];
    votes: {
        _id: string;
    }[];
}

export interface CommunityClientConfigDiscordDto extends CommunityClientConfigBase {
    guild_id: string;
    channel_allowlist: string[];
    channel_denylist: string[];
    role_allowlist: string[];
    role_denylist: string[];
    user_allowlist: string[];
    user_denylist: string[];
}