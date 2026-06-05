import { UniqueEntityID } from '@careerhub/shared-kernel';
import {
  Email,
  Identity,
  IdentityStatus,
  PasswordHash,
  Role
} from '../../../domain';
import type {
  IdentityPersistenceRecord,
  PrismaIdentityCreateInput
} from '../prisma/iam-prisma.types';

function toDomainStatus(status: IdentityPersistenceRecord['status']): IdentityStatus {
  if (status === 'pending_profile') {
    return IdentityStatus.pendingProfile();
  }

  if (status === 'active') {
    return IdentityStatus.active();
  }

  return IdentityStatus.disabled();
}

export function toIdentityPersistence(identity: Identity): PrismaIdentityCreateInput {
  return {
    acceptedTerms: identity.acceptedTerms,
    createdAt: identity.createdAt ?? new Date(),
    email: identity.email.value,
    id: identity.id.toString(),
    passwordHash: identity.passwordHash.value,
    role: identity.role.value,
    status: identity.status.value,
    updatedAt: identity.updatedAt ?? identity.createdAt ?? new Date()
  };
}

export function toIdentityDomain(record: IdentityPersistenceRecord): Identity {
  return Identity.reconstitute({
    createdAt: record.createdAt,
    id: new UniqueEntityID(record.id),
    props: {
      acceptedTerms: record.acceptedTerms,
      email: new Email(record.email),
      passwordHash: new PasswordHash(record.passwordHash),
      role: new Role(record.role),
      status: toDomainStatus(record.status)
    },
    updatedAt: record.updatedAt
  });
}
