import pino from 'pino';

// Data masking (sanitization) options for sensitive data
const redactOptions = {
  paths: [
    'password',
    'token',
    '*.password',
    '*.token',
    'email',
    '*.email',
    'phone',
    '*.phone',
    'cpf',
    '*.cpf',
    'secret',
    '*.secret',
    'credentials',
    '*.credentials',
    'creditCard',
    '*.creditCard'
  ],
  censor: '[MASKED]'
};

// Helper for safe JSON stringify handling circular references
const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key: string, value: any) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return "[Circular]";
      }
      seen.add(value);
    }
    return value;
  };
};

// Create a professional structured logger
const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: redactOptions,
  browser: {
    asObject: true, // Use structured JSON in browser console as well
    write: (o) => {
      try {
        console.log(JSON.stringify(o, getCircularReplacer()));
      } catch (err) {
        console.log(o);
      }
    }
  },
  base: {
    env: process.env.NODE_ENV,
    appName: 'smileprox'
  }
});

// Helper to create a child logger with context (like userId, action, requestId)
export const createLoggerContext = (context: Record<string, any>) => {
  return logger.child(context);
};

export default logger;
