import type { SharedOutboxProcessorOptions } from './outbox.types';
export declare class OutboxProcessor {
    private readonly options;
    private readonly logger;
    private backlogRunning;
    private backlogStateKey;
    private backlogTimer?;
    private cleanupRunning;
    private cleanupTimer?;
    private pollingTimer?;
    private publishRunning;
    constructor(options: SharedOutboxProcessorOptions);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    runCleanupCycle(): Promise<void>;
    runPublishCycle(): Promise<void>;
    runBacklogCycle(): Promise<void>;
    private processRecord;
    private buildFailureRecord;
    private createBacklogStateKey;
}
