import assert from 'node:assert/strict';
import test from 'node:test';
import { createPgClient, type SqlClient } from './helpers/live-db';
import { createRequestId, createUniqueEmail } from './helpers/live-http';
import { pollUntil } from './helpers/live-polling';
import {
  getCandidateProfile,
  getMe,
  login,
  registerCandidate
} from './helpers/live-gateway-auth';

type IdentityRow = {
  accepted_terms: boolean;
  email: string;
  id: string;
  role: 'candidate' | 'employer';
  status: string;
};

type CandidateProfileRow = {
  created_at: Date;
  full_name: string;
  id: string;
  identity_id: string;
  phone: string | null;
  updated_at: Date;
};

async function findIdentityByEmail(
  client: SqlClient,
  email: string
): Promise<IdentityRow | null> {
  const result = await client.query<IdentityRow>(
    `
      select
        id,
        email,
        role,
        status,
        accepted_terms
      from identities
      where email = $1
    `,
    [email]
  );

  return result.rows[0] ?? null;
}

async function findCandidateProfileByIdentityId(
  client: SqlClient,
  identityId: string
): Promise<CandidateProfileRow | null> {
  const result = await client.query<CandidateProfileRow>(
    `
      select
        id,
        identity_id,
        full_name,
        phone,
        created_at,
        updated_at
      from candidate_profiles
      where identity_id = $1
    `,
    [identityId]
  );

  return result.rows[0] ?? null;
}

test(
  'candidate registration integration flow creates active IAM identity and candidate profile',
  { timeout: 30_000 },
  async () => {
    const email = createUniqueEmail('candidate.register.integration');
    const fullName = 'Candidate Register Integration';
    const phone = '0911222333';
    const registerRequestId = createRequestId('integration-register-candidate');
    const loginRequestId = createRequestId('integration-login-candidate');
    const meRequestId = createRequestId('integration-me-candidate');
    const profileRequestId = createRequestId('integration-profile-candidate');

    const iamClient = createPgClient('iam-service');
    const candidateClient = createPgClient('candidate-service');
    await iamClient.connect();
    await candidateClient.connect();

    try {
      const registerResult = await registerCandidate({
        email,
        fullName,
        phone,
        requestId: registerRequestId
      });

      assert.equal(registerResult.data.email, email);
      assert.equal(registerResult.data.role, 'candidate');

      const identityRow = await pollUntil(async () => {
        const row = await findIdentityByEmail(iamClient, email);
        return row?.status === 'active' ? row : null;
      });

      assert.equal(identityRow.id, registerResult.data.userId);
      assert.equal(identityRow.role, 'candidate');
      assert.equal(identityRow.accepted_terms, true);

      const profileRow = await pollUntil(async () => {
        const row = await findCandidateProfileByIdentityId(
          candidateClient,
          identityRow.id
        );
        return row ?? null;
      });

      assert.equal(profileRow.identity_id, identityRow.id);
      assert.equal(profileRow.full_name, fullName);
      assert.equal(profileRow.phone, phone);
      assert.ok(profileRow.created_at instanceof Date);
      assert.ok(profileRow.updated_at instanceof Date);

      const loginResult = await login({
        email,
        password: '12345678',
        requestId: loginRequestId
      });
      assert.equal(loginResult.response.status, 200);
      assert.equal(loginResult.body.success, true);

      const meResult = await getMe({
        accessToken: loginResult.accessToken,
        requestId: meRequestId
      });
      assert.equal(meResult.data.user.id, identityRow.id);
      assert.equal(meResult.data.user.email, email);
      assert.equal(meResult.data.user.role, 'candidate');
      assert.equal(meResult.data.user.status, 'active');

      const candidateProfileResult = await getCandidateProfile({
        accessToken: loginResult.accessToken,
        requestId: profileRequestId
      });
      assert.equal(candidateProfileResult.data.profile.identityId, identityRow.id);
      assert.equal(candidateProfileResult.data.profile.fullName, fullName);
      assert.equal(candidateProfileResult.data.profile.phone, phone);
    } finally {
      await candidateClient.end();
      await iamClient.end();
    }
  }
);
