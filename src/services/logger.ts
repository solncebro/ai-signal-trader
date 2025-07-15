import pino from "pino";

const pinoLogger = pino({
  level: "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});

export default pinoLogger;
