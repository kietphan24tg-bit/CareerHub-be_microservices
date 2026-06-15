import {
  isNotificationRequestedEvent,
  resolveNotificationEventName
} from '@careerhub/contracts';
import type { GetMessage } from 'amqplib';

export type ParsedDlqMessage = {
  eventName: string;
  messageId: string;
  payloadPreview: string;
  routingKey: string;
  sourceEventId?: string;
};

type DeathRecord = {
  'routing-keys'?: string[];
};

function readDeathRoutingKey(message: GetMessage): string | undefined {
  const deaths = message.properties.headers?.['x-death'];
  if (!Array.isArray(deaths) || deaths.length === 0) {
    return undefined;
  }

  const firstDeath = deaths[0] as DeathRecord;
  const routingKeys = firstDeath['routing-keys'];
  if (!Array.isArray(routingKeys) || routingKeys.length === 0) {
    return undefined;
  }

  const routingKey = routingKeys[0];
  return typeof routingKey === 'string' && routingKey.length > 0 ? routingKey : undefined;
}

export function resolveDlqRoutingKey(
  message: GetMessage,
  routingKeyOverride?: string
): string {
  if (routingKeyOverride && routingKeyOverride.length > 0) {
    return routingKeyOverride;
  }

  const typeProperty = message.properties.type;
  if (typeof typeProperty === 'string' && typeProperty.length > 0) {
    return typeProperty;
  }

  const deathRoutingKey = readDeathRoutingKey(message);
  if (deathRoutingKey) {
    return deathRoutingKey;
  }

  try {
    const parsed = JSON.parse(message.content.toString('utf8')) as unknown;
    if (isNotificationRequestedEvent(parsed)) {
      return parsed.name;
    }

    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as { name?: unknown }).name === 'string'
    ) {
      return (parsed as { name: string }).name;
    }

    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as { payload?: { type?: unknown } }).payload?.type === 'string'
    ) {
      const derived = resolveNotificationEventName(
        (parsed as { payload: { type: string } }).payload.type
      );
      if (derived) {
        return derived;
      }
    }
  } catch {
    // fall through to unknown
  }

  return 'unknown';
}

export function parseDlqMessage(
  message: GetMessage,
  routingKeyOverride?: string
): ParsedDlqMessage {
  const messageId =
    typeof message.properties.messageId === 'string' && message.properties.messageId.length > 0
      ? message.properties.messageId
      : 'unknown';
  const routingKey = resolveDlqRoutingKey(message, routingKeyOverride);
  let eventName = routingKey;
  let sourceEventId: string | undefined;

  try {
    const parsed = JSON.parse(message.content.toString('utf8')) as unknown;
    if (isNotificationRequestedEvent(parsed)) {
      eventName = parsed.name;
      sourceEventId = parsed.payload.sourceEventId;
    } else if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as { name?: unknown }).name === 'string'
    ) {
      eventName = (parsed as { name: string }).name;
      const payload = (parsed as { payload?: { sourceEventId?: unknown } }).payload;
      if (payload && typeof payload.sourceEventId === 'string') {
        sourceEventId = payload.sourceEventId;
      }
    }
  } catch {
    eventName = 'unknown';
  }

  const payloadPreview = message.content.toString('utf8').slice(0, 240);

  return {
    eventName,
    messageId,
    payloadPreview,
    routingKey,
    sourceEventId
  };
}

export function messageMatchesId(message: GetMessage, messageId: string): boolean {
  return message.properties.messageId === messageId;
}
