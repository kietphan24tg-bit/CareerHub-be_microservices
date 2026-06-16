export const COMMUNICATION_PORT_TOKENS = {
  idGenerator: Symbol('COMMUNICATION_PORT_TOKENS.idGenerator'),
  identityLookup: Symbol('COMMUNICATION_PORT_TOKENS.identityLookup'),
  notificationRepository: Symbol(
    'COMMUNICATION_PORT_TOKENS.notificationRepository'
  ),
  recruitmentMailDeliveryRepository: Symbol(
    'COMMUNICATION_PORT_TOKENS.recruitmentMailDeliveryRepository'
  )
} as const;
