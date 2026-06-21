import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RegistrationSagaOrchestrator } from '../../application';
import {
  getWorkflowRuntimeConfig,
  type WorkflowEnvironmentVariables,
  type WorkflowRuntimeConfig
} from '../../config';

@Injectable()
export class RegistrationSagaRecoveryProcessor
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RegistrationSagaRecoveryProcessor.name);
  private readonly runtimeConfig: WorkflowRuntimeConfig;
  private recoveryRunning = false;
  private shutdownResolve?: () => void;
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly registrationSagaOrchestrator: RegistrationSagaOrchestrator,
    @Inject(ConfigService)
    configService: ConfigService<WorkflowEnvironmentVariables, true>
  ) {
    this.runtimeConfig = getWorkflowRuntimeConfig(configService);
  }

  async onModuleInit(): Promise<void> {
    if (!this.runtimeConfig.registrationSagaRecoveryEnabled) {
      this.logger.log('Registration saga recovery processor is disabled');
      return;
    }

    await this.runRecoveryCycle();

    this.timer = setInterval(() => {
      void this.runRecoveryCycle();
    }, this.runtimeConfig.registrationSagaRecoveryPollIntervalMs);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    if (!this.recoveryRunning) {
      return;
    }

    await Promise.race([
      new Promise<void>((resolve) => {
        this.shutdownResolve = resolve;
      }),
      new Promise<void>((resolve) => setTimeout(resolve, 5_000))
    ]);
  }

  private async runRecoveryCycle(): Promise<void> {
    if (
      this.recoveryRunning ||
      !this.runtimeConfig.registrationSagaRecoveryEnabled
    ) {
      return;
    }

    this.recoveryRunning = true;

    try {
      const claimed =
        await this.registrationSagaOrchestrator.recoverStaleSagas({
          limit: this.runtimeConfig.registrationSagaRecoveryBatchSize,
          staleBefore: new Date(
            Date.now() -
              this.runtimeConfig.registrationSagaRecoveryStaleAfterMs
          )
        });

      if (claimed > 0) {
        this.logger.log(
          `Claimed ${claimed} stale registration saga(s) for recovery`
        );
      }
    } finally {
      this.recoveryRunning = false;
      this.shutdownResolve?.();
    }
  }
}
