import { PollResponseDto } from 'governator-sdk';

export interface PollCompleteEvent extends MessageEvent {
	data: PollCompleteEventData;
}

export interface PollCompleteEventData { poll_id: string }

export interface PollCreateEvent extends MessageEvent {
	data: PollResponseDto;
}

export interface PollDeleteEvent extends MessageEvent {
	data: PollResponseDto;
}

export interface DiscordRequestDto {
	uuid: string;
	provider_id: string;
	method: string;
	guildId: string;
	userId: string;
}

export interface RequestClientDataEvent extends MessageEvent {
	data: DiscordRequestDto;
}

