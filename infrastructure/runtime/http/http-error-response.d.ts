export type HttpErrorResponse = {
    success: false;
    error: {
        code: string;
        details?: unknown;
        message: string;
    };
    path?: string;
    requestId?: string;
    statusCode: number;
    timestamp: string;
};
