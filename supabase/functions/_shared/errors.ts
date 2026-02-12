export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly isOperational: boolean;

    constructor(
        message: string,
        statusCode: number = 500,
        code: string = 'INTERNAL_ERROR',
        isOperational: boolean = true
    ) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, 400, 'VALIDATION_ERROR');
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication required') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string = 'Insufficient permissions') {
        super(message, 403, 'AUTHORIZATION_ERROR');
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string) {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}

export class RateLimitError extends AppError {
    constructor(message: string = 'Rate limit exceeded') {
        super(message, 429, 'RATE_LIMIT_EXCEEDED');
    }
}

export class ExternalServiceError extends AppError {
    constructor(service: string, message: string) {
        super(`${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR');
    }
}

/**
 * Convert error to JSON response
 */
export function errorToResponse(error: Error, requestId?: string): Response {
    if (error instanceof AppError) {
        return new Response(
            JSON.stringify({
                error: {
                    code: error.code,
                    message: error.message,
                },
                requestId,
            }),
            {
                status: error.statusCode,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }

    // Unknown error - don't leak details
    return new Response(
        JSON.stringify({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred',
            },
            requestId,
        }),
        {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        }
    );
}
