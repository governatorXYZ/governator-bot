import * as winston from 'winston';

const config = {
	levels: { error: 0, warn: 1, info: 2, debug: 3, data: 4 },
	colors: { error: 'bold red', debug: 'bold blue', warn: 'bold yellow', info: 'bold green', data: 'bold magenta' },
};

winston.addColors(config.colors);

const log = winston.createLogger({
	// set log level here !
	level: process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info',
	levels: config.levels,
	format: winston.format.combine(
		winston.format.colorize({ all: true }),
		winston.format.label({ label: `[Governator-bot:${process.env.NODE_ENV}]` }),
		winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
		winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label', 'moduleName'] }),
		winston.format.printf(options => {
			let msg = `${options.label} - ${options.timestamp} ${options.level} [${options.moduleName}] ${options.message}`;
			if (Object.entries(options.metadata).length !== 0) {
				msg = msg + `\n[Meta] ${JSON.stringify(options.metadata, null, 2)}`;
			}
			return msg;
		}),
	),
	transports: [
		new winston.transports.Console(),
	],
});

export const createLogger = function(name = 'logger') {
	// set the default moduleName of the child
	return log.child({ moduleName: name });
};