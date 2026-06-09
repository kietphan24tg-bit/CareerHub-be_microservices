export type ResetPasswordCommand = {
  newPassword: string;
  requestId?: string;
  token: string;
};
