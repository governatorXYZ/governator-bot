import { SlashCreator, GatewayServer, SlashCommand, CommandContext } from 'slash-create';
import Discord, { Client, ClientOptions, Intents, WSEventType } from 'discord.js';
import path from 'path';
import fs from 'fs';
import Log, { LogUtils } from './utils/Log';
import constants from './constants/constants';
import NodeEventSource from 'eventsource';
import axios from 'axios';

// set api key header for axios globally
axios.defaults.headers.common = {
	'X-API-KEY': process.env.GOVERNATOR_API_KEY,
};

// initialize discordjs client and events
const client: Client = initializeClient();

initializeDiscordJsEvents();

// initialize slash-create
const creator = new SlashCreator({
	applicationID: process.env.DISCORD_BOT_APPLICATION_ID,
	publicKey: process.env.DISCORD_BOT_PUBLIC_KEY,
	token: process.env.DISCORD_BOT_TOKEN,
	disableTimeouts: true,
});

initializeSlashCreateEvents();

// initialize governator SSE
const evtSource = new NodeEventSource(
	constants.SSE_URL,
	{ headers: { 'X-API-KEY': process.env.GOVERNATOR_API_KEY } },
);

initializeGovernatorEvents();

// Register command handlers
creator
	.withServer(
		new GatewayServer((handler) => client.ws.on(<WSEventType>'INTERACTION_CREATE', handler)),
	)
	.registerCommandsIn(path.join(__dirname, 'commands'))
	.syncCommands();


// reload client
client.destroy();

client.login(process.env.DISCORD_BOT_TOKEN);

function initializeClient(): Client {
	const clientOptions: ClientOptions = {
		intents: [
			Intents.FLAGS.GUILDS,
			Intents.FLAGS.GUILD_BANS,
			Intents.FLAGS.GUILD_MEMBERS,
			Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
			Intents.FLAGS.GUILD_VOICE_STATES,
			Intents.FLAGS.GUILD_PRESENCES,
			Intents.FLAGS.GUILD_MESSAGES,
			Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
			Intents.FLAGS.DIRECT_MESSAGES,
			Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
		],
		partials: ['MESSAGE', 'CHANNEL', 'REACTION', 'USER'],
	};
	return new Discord.Client(clientOptions);
}

function initializeDiscordJsEvents(): void {
	// Log client errors
	client.on('error', Log.error);

	const eventFiles = fs.readdirSync(path.join(__dirname, '/events/events-discordjs')).filter(file => file.endsWith('.js'));
	eventFiles.forEach(file => {
		const event = new (require(`./events/events-discordjs/${file}`).default)();
		try {
			if (event.once) {
				client.once(event.name, (...args) => event.execute(...args, client));
			} else {
				client.on(event.name, (...args) => event.execute(...args, client));
			}
		} catch (e) {
			Log.error('Event failed to process', {
				indexMeta: true,
				meta: {
					name: e.name,
					message: e.message,
					stack: e.stack,
					event,
				},
			});
		}
	});
}

function initializeSlashCreateEvents(): void {
	creator.on('debug', (message) => Log.debug(`debug: ${ message }`));
	creator.on('warn', (message) => Log.warn(`warn: ${ message }`));
	creator.on('error', (error: Error) => Log.error(`error: ${ error }`));
	creator.on('synced', () => Log.debug('Commands synced!'));
	creator.on('commandRegister', (command: SlashCommand) => Log.debug(`Registered command ${command.commandName}`));
	creator.on('commandError', (command: SlashCommand, error: Error) => Log.error(`Command ${command.commandName}:`, {
		indexMeta: true,
		meta: {
			name: error.name,
			message: error.message,
			stack: error.stack,
			command,
		},
	}));
	// Ran after the command has completed
	creator.on('commandRun', (command:SlashCommand, result: Promise<any>, ctx: CommandContext) => {
		LogUtils.logCommandEnd(ctx);
	});

	const eventFiles = fs.readdirSync(path.join(__dirname, '/events/events-slash-create')).filter(file => file.endsWith('.js'));
	eventFiles.forEach(file => {
		const event = new (require(`./events/events-slash-create/${file}`).default)();
		try {
			if (event.once) {
				creator.once(event.name, (...args) => event.execute(...args, client));
			} else {
				creator.on(event.name, (...args) => event.execute(...args, client));
			}
		} catch (e) {
			Log.error('Slash-create event failed to process', {
				indexMeta: true,
				meta: {
					name: e.name,
					message: e.message,
					stack: e.stack,
					event,
				},
			});
		}
	});
}

function initializeGovernatorEvents(): void {
	evtSource.onerror = function(err) {
		if (err) {
			if (err.status === 401 || err.status === 403) {
				Log.error('not authorized');
			}
		}
	};
	const eventFiles = fs.readdirSync(path.join(__dirname, '/events/events-governator')).filter(file => file.endsWith('.js'));
	eventFiles.forEach(file => {
		const event = new (require(`./events/events-governator/${file}`).default)();
		try {
			evtSource.addEventListener(event.name, async (...args) => event.execute(...args, client));
		} catch (e) {
			console.log(e);
			Log.error('Governator event failed to process', {
				indexMeta: true,
				meta: {
					name: e.name,
					message: e.message,
					stack: e.stack,
					event,
				},
			});
		}
	});
}


export default client;
