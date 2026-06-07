export type HttpSuccessResponse<TData = unknown> = {
    success: true;
    data: TData;
    message: string;
};
