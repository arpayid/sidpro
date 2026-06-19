export interface AuthUser {
  id: string;
  email: string;
  name: string;
  tenantId: string | null;
  roles: string[];
  permissions: string[];
  twoFaEnabled?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface TwoFactorChallengeResponse {
  requiresTwoFactor: true;
  twoFactorToken: string;
}

export interface TwoFactorEnrollmentChallengeResponse {
  requiresTwoFactorEnrollment: true;
  enrollmentToken: string;
}

export type LoginResult =
  | LoginResponse
  | TwoFactorChallengeResponse
  | TwoFactorEnrollmentChallengeResponse;

export interface TwoFactorVerifyLoginRequest {
  twoFactorToken: string;
  token: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  otpauthUrl: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}
