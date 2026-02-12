export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: Record<string, unknown>;
    requestId?: string;
}

/**
 * Structured JSON logger for Edge Functions
 */
export class Logger {
    private requestId: string;

    constructor(requestId?: string) {
        this.requestId = requestId || crypto.randomUUID();
    }

    private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            requestId: this.requestId,
            ...(context && { context }),
        };
        console.log(JSON.stringify(entry));
    }

    debug(message: string, context?: Record<string, unknown>) {
        this.log('debug', message, context);
    }

    info(message: string, context?: Record<string, unknown>) {
        this.log('info', message, context);
    }

    warn(message: string, context?: Record<string, unknown>) {
        this.log('warn', message, context);
    }

    error(message: string, error?: Error, context?: Record<string, unknown>) {
        this.log('error', message, {
            ...context,
            error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined,
        });
    }

    getRequestId(): string {
        return this.requestId;
    }
}

export function createLogger(req?: Request): Logger {
    const requestId = req?.headers.get('x-request-id') || undefined;
    return new Logger(requestId);
}
