#!/usr/bin/env node
import {
  getCommunicationDlqTopology,
  peekCommunicationDlq,
  replayCommunicationDlq
} from './replay-communication-dlq';

type CliCommand = 'help' | 'list' | 'peek' | 'replay';

type CliOptions = {
  command: CliCommand;
  count: number;
  dryRun: boolean;
  maxScan: number;
  messageId?: string;
  routingKey?: string;
};

function printHelp(): void {
  console.log(`communication-dlq — inspect and replay communication notification DLQ messages

Usage:
  communication-dlq list [--count N]
  communication-dlq peek [--count N]
  communication-dlq replay [--count N] [--message-id <id>] [--routing-key <key>] [--dry-run]

Commands:
  list, peek   View messages in DLQ without ack (messages are requeued after inspection)
  replay       Republish messages from DLQ to the main events exchange

Options:
  --count N            Number of messages to inspect or replay (default: 10 for list/peek, 1 for replay)
  --message-id <id>    Replay a specific message by AMQP messageId (scans up to --max-scan messages)
  --routing-key <key>  Override routing key used when republishing
  --max-scan N         Max DLQ messages to scan when filtering by messageId (default: 1000)
  --dry-run            Print messages that would be replayed without publishing or acking

Environment:
  Uses the same BROKER_* variables as communication-service (BROKER_URL, BROKER_EXCHANGE_PREFIX, etc.)

Examples:
  communication-dlq list --count 5
  communication-dlq replay --dry-run --count 2
  communication-dlq replay --message-id outbox-record-123
  communication-dlq replay --count 10 --routing-key notifications.application-received.v1
`);
}

function parseArgs(argv: string[]): CliOptions {
  const positional = argv.filter((arg) => !arg.startsWith('--'));
  const commandArg = positional[0] ?? 'help';
  const command: CliCommand =
    commandArg === 'list' ||
    commandArg === 'peek' ||
    commandArg === 'replay' ||
    commandArg === 'help'
      ? commandArg
      : 'help';

  const readValue = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    if (index === -1) {
      return undefined;
    }

    return argv[index + 1];
  };

  const countValue = readValue('--count');
  const maxScanValue = readValue('--max-scan');
  const defaultCount = command === 'replay' ? 1 : 10;

  return {
    command,
    count: countValue ? Number.parseInt(countValue, 10) : defaultCount,
    dryRun: argv.includes('--dry-run'),
    maxScan: maxScanValue ? Number.parseInt(maxScanValue, 10) : 1000,
    messageId: readValue('--message-id'),
    routingKey: readValue('--routing-key')
  };
}

function printReplayResults(results: Awaited<ReturnType<typeof replayCommunicationDlq>>): void {
  for (const result of results) {
    if (result.parsed) {
      console.log(
        `[${result.outcome}] messageId=${result.parsed.messageId} eventName=${result.parsed.eventName} ` +
          `sourceEventId=${result.parsed.sourceEventId ?? 'n/a'} routingKey=${result.parsed.routingKey}`
      );
      if (result.outcome === 'dry_run') {
        console.log(`  payload=${result.parsed.payloadPreview}`);
      }
    } else {
      console.log(`[${result.outcome}]`);
    }

    if (result.error) {
      console.log(`  error=${result.error}`);
    }
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.command === 'help') {
    printHelp();
    return;
  }

  const topology = getCommunicationDlqTopology();
  console.log(
    `DLQ target: exchange=${topology.exchange}, dlq=${topology.deadLetterQueue}, dlx=${topology.deadLetterExchange}`
  );

  if (options.command === 'list' || options.command === 'peek') {
    const peekResult = await peekCommunicationDlq({
      count: options.count,
      routingKey: options.routingKey
    });

    console.log(`queueDepth=${peekResult.queueDepth}`);
    for (const message of peekResult.messages) {
      console.log(
        `messageId=${message.messageId} eventName=${message.eventName} ` +
          `sourceEventId=${message.sourceEventId ?? 'n/a'} routingKey=${message.routingKey}`
      );
      console.log(`  payload=${message.payloadPreview}`);
    }

    return;
  }

  const replayResults = await replayCommunicationDlq({
    count: options.count,
    dryRun: options.dryRun,
    maxScan: options.maxScan,
    messageId: options.messageId,
    routingKey: options.routingKey
  });
  printReplayResults(replayResults);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'unknown error';
  console.error(`communication-dlq failed: ${message}`);
  process.exitCode = 1;
});
