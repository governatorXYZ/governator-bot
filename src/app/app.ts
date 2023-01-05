import { SlashCreator, GatewayServer, SlashCommand, CommandContext } from 'slash-create';
import Discord, { Client, ClientOptions, GatewayIntentBits, Partials, GatewayDispatchEvents } from 'discord.js';
import path from 'path';
import fs from 'fs';
import { createLogger } from './utils/logger';
import constants from './constants/constants';
import NodeEventSource from 'eventsource';
import axios from 'axios';
// import { Cache } from './utils/cache';

// set api key header for axios globally
axios.defaults.headers.common = {
	'X-API-KEY': process.env.GOVERNATOR_API_KEY,
};

// initialize governator SSE
const evtSource = new NodeEventSource(
	constants.SSE_URL,
	{ headers: { 'X-API-KEY': process.env.GOVERNATOR_API_KEY } },
);

// initialize cache
// export const cache = new Cache();

initializeGovernatorEvents();

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

// Register command handlers
creator
	.withServer(
		new GatewayServer((handler) => client.ws.on(GatewayDispatchEvents.InteractionCreate, handler)),
	)
	.registerCommandsIn(path.join(__dirname, 'commands'))
	.syncCommands();


// reload client
client.destroy();

client.login(process.env.DISCORD_BOT_TOKEN);

function initializeClient(): Client {
	const clientOptions: ClientOptions = {
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMembers,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.GuildPresences,
		],
		partials: [
			Partials.Message,
			Partials.Channel,
			Partials.User
		],
	};
	return new Discord.Client(clientOptions);
}

function initializeDiscordJsEvents(): void {
	// get new winston child logger
	const logger = createLogger('app:discordjs-events');
	// Log client errors
	client.on('error', (statement: string | any) => { logger.error(statement); });

	const eventFiles = fs.readdirSync(path.join(__dirname, '/events/events-discordjs')).filter(file => file.endsWith('.js'));
	eventFiles.forEach(file => {
		const event = new (require(`./events/events-discordjs/${file}`).default)();
		try {
			if (event.once) {
				client.once(event.name, (...args) => event.execute(...args, client));
			} else {
				client.on(event.name, (...args) => event.execute(...args, client));
			}
			logger.debug(`Registered event ${event.name}`);
		} catch (e) {
			logger.error('Event failed to process', {
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
	// get new winston child logger
	const logger = createLogger('app:slash-create-events');
	creator.on('debug', (message) => logger.debug(message));
	creator.on('warn', (message) => logger.warn(message));
	creator.on('error', (error: Error) => logger.error(error));
	creator.on('synced', () => logger.info('Commands synced!'));
	// creator.on('commandRegister', (command: SlashCommand) => logger.info(`Registered command ${command.commandName}`));
	creator.on('commandError', (command: SlashCommand, error: Error) => logger.error(`Command ${command.commandName}:`, {
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
		logger.debug(`${ctx.user.username}#${ctx.user.discriminator} ran /${ctx.commandName}`, {
			indexMeta: true,
			meta: {
				guildId: ctx.guildID,
				userTag: `${ctx.user.username}#${ctx.user.discriminator}`,
				userId: ctx.user.id,
				params: ctx.options,
			},
		});
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
			logger.debug(`Registered event ${event.name}`);
		} catch (e) {
			logger.error('Slash-create event failed to process', {
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
	const logger = createLogger('app:governator-events');

	evtSource.onerror = function(err) {
		if (err) {
			if (err.status === 401 || err.status === 403) {
				logger.error('not authorized');
			} else {
				logger.error(err);
			}
		}
	};

	const eventFiles = fs.readdirSync(path.join(__dirname, '/events/events-governator')).filter(file => file.endsWith('.js'));
	eventFiles.forEach(file => {
		const event = new (require(`./events/events-governator/${file}`).default)();
		try {
			evtSource.addEventListener(event.name, async (...args) => event.execute(...args, client));
			logger.debug(`Registered event ${event.name}`);
		} catch (e) {
			logger.error(e);
			logger.error('event failed to process', {
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