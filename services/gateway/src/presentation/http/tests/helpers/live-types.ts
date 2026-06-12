export type SuccessEnvelope<T> = {
  data: T;
  message: string;
  success: true;
};

export type ErrorEnvelope = {
  error: {
    code: string;
    details?: unknown;
    message: string;
  };
  path: string;
  requestId?: string;
  statusCode: number;
  success: false;
  timestamp: string;
};

export type RegisterResponse = {
  email: string;
  role: 'candidate' | 'employer';
  userId: string;
};

export type LoginResponse = {
  accessToken: string;
  user: {
    email: string;
    id: string;
    role: 'candidate' | 'employer';
  };
};

export type PasswordResetAcceptedResponse = {
  accepted: boolean;
};

export type PasswordResetResponse = {
  passwordReset: boolean;
};

export type MeResponse = {
  user: {
    email: string;
    id: string;
    role: 'candidate' | 'employer';
    status: string;
  };
};

export type CandidateProfileResponse = {
  profile: {
    address: string | null;
    avatarUrl: string | null;
    bio: string | null;
    createdAt: string;
    fullName: string;
    githubUrl: string | null;
    headline: string | null;
    id: string;
    identityId: string;
    linkedinUrl: string | null;
    phone: string | null;
    portfolioUrl: string | null;
    resumeId: string | null;
    updatedAt: string;
    yearsExperience: number | null;
  };
};

export type ResumeTemplateListItem = {
  category?: string | null;
  id: string;
  name: string;
  thumbnail?: string | null;
};

export type GatewayResume = {
  id: string;
  isUsing: boolean;
  templateId?: string | null;
  title: string;
  updatedAt: string;
  userId: string;
};

export type GatewaySavedJob = {
  id: string;
  jobId: string;
  savedAt: string;
  job?: {
    id: string;
    title: string;
  } | null;
};
