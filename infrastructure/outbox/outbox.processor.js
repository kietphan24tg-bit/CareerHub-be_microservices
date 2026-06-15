"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxProcessor = void 0;
const common_1 = require("@nestjs/common");
class OutboxProcessor {
    options;
    logger;
    backlogRunning = false;
    backlogStateKey = 'pending=0|processing=0|failed=0|oldest=n/a';
    backlogTimer;
    cleanupRunning = false;
    cleanupTimer;
    pollingTimer;
    publishRunning = false;
    constructor(options) {
        this.options = options;
        this.logger = new common_1.Logger(options.loggerName);
    }
    async onModuleInit() {
        if (!this.options.publisher.isEnabled()) {
            this.logger.log(this.options.disabledLogMessage);
            return;
        }
        await this.runPublishCycle();
        await this.runBacklogCycle();
        await this.runCleanupCycle();
        this.pollingTimer = setInterval(() => {
            void this.runPublishCycle();
        }, this.options.runtimeConfig.outboxPollIntervalMs);
        this.backlogTimer = setInterval(() => {
            void this.runBacklogCycle();
        }, this.options.runtimeConfig.outboxBacklogIntervalMs);
        if (this.options.runtimeConfig.outboxCleanupEnabled) {
            this.cleanupTimer = setInterval(() => {
                void this.runCleanupCycle();
            }, this.options.runtimeConfig.outboxCleanupIntervalMs);
        }
    }
    async onModuleDestroy() {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = undefined;
        }
        if (this.backlogTimer) {
            clearInterval(this.backlogTimer);
            this.backlogTimer = undefined;
        }
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
    }
    async runCleanupCycle() {
        if (!this.options.runtimeConfig.outboxCleanupEnabled ||
            this.cleanupRunning) {
            return;
        }
        this.cleanupRunning = true;
        try {
            const cutoff = new Date(Date.now() - this.options.runtimeConfig.outboxProcessedRetentionMs);
            const deleted = await this.options.repository.deleteProcessedBatch(cutoff, this.options.runtimeConfig.outboxCleanupBatchSize);
            if (deleted > 0) {
                this.options.metricsRegistry.recordOutboxCleanup({
                    deletedCount: deleted,
                    service: this.options.serviceName
                });
                this.logger.log(`Outbox cleanup deleted ${deleted} processed records older than ${cutoff.toISOString()}`);
            }
        }
        finally {
            this.cleanupRunning = false;
        }
    }
    async runPublishCycle() {
        if (this.publishRunning) {
            return;
        }
        this.publishRunning = true;
        try {
            const now = new Date();
            await this.options.repository.requeueStaleProcessing(new Date(now.getTime() -
                this.options.runtimeConfig.outboxStaleProcessingTimeoutMs));
            await this.options.repository.requeueRetryableFailed(now, this.options.runtimeConfig.outboxMaxRetryCount);
            const pendingRecords = await this.options.repository.findPendingBatch(this.options.runtimeConfig.outboxBatchSize);
            for (const record of pendingRecords) {
                await this.processRecord(record.id);
            }
        }
        finally {
            this.publishRunning = false;
        }
    }
    async runBacklogCycle() {
        if (this.backlogRunning) {
            return;
        }
        this.backlogRunning = true;
        try {
            const summary = await this.options.repository.summarizeBacklog();
            const oldestPendingAgeSeconds = summary.oldestPendingOccurredAt
                ? Math.max(0, Math.floor((Date.now() - summary.oldestPendingOccurredAt.getTime()) / 1000))
                : 0;
            this.options.metricsRegistry.recordOutboxBacklog({
                failed: summary.failed,
                oldestPendingAgeSeconds,
                pending: summary.pending,
                processing: summary.processing,
                service: this.options.serviceName
            });
            const nextStateKey = this.createBacklogStateKey(summary);
            if (nextStateKey === this.backlogStateKey) {
                return;
            }
            const hadBacklog = !this.backlogStateKey.startsWith('pending=0|processing=0|failed=0|');
            const hasBacklog = summary.pending > 0 || summary.processing > 0 || summary.failed > 0;
            if (hasBacklog) {
                this.logger.log(`Outbox backlog pending=${summary.pending} processing=${summary.processing} failed=${summary.failed} oldestPending=${summary.oldestPendingOccurredAt?.toISOString() ?? 'n/a'}`);
            }
            else if (hadBacklog) {
                this.logger.log('Outbox backlog cleared');
            }
            this.backlogStateKey = nextStateKey;
        }
        finally {
            this.backlogRunning = false;
        }
    }
    async processRecord(recordId) {
        const claimedRecord = await this.options.repository.claimPending(recordId, new Date());
        if (!claimedRecord) {
            return;
        }
        try {
            await this.options.publisher.publish(claimedRecord);
            await this.options.repository.markProcessed(claimedRecord.id, new Date());
        }
        catch (error) {
            await this.options.repository.markFailed(claimedRecord.id, this.buildFailureRecord(claimedRecord, error));
            const errorMessage = error instanceof Error ? error.message : 'Unknown outbox publish error';
            this.logger.warn(`Failed to publish ${this.options.serviceName} outbox record ${claimedRecord.id}: ${errorMessage}`);
        }
    }
    buildFailureRecord(record, error) {
        const retryCount = record.retryCount + 1;
        const shouldRetry = retryCount < this.options.runtimeConfig.outboxMaxRetryCount;
        const message = error instanceof Error ? error.message : String(error);
        return {
            lastError: message,
            nextRetryAt: shouldRetry
                ? new Date(Date.now() + this.options.runtimeConfig.outboxRetryDelayMs)
                : undefined,
            retryCount
        };
    }
    createBacklogStateKey(summary) {
        return [
            `pending=${summary.pending}`,
            `processing=${summary.processing}`,
            `failed=${summary.failed}`,
            `oldest=${summary.oldestPendingOccurredAt?.toISOString() ?? 'n/a'}`
        ].join('|');
    }
}
exports.OutboxProcessor = OutboxProcessor;
