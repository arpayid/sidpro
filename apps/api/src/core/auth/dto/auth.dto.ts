import { IsEmail, IsString, Length, MinLength } from 'class-validator';

const TOTP_TOKEN_LENGTH = 6;
const JWT_MIN_LENGTH = 20;

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

export class VerifyTwoFactorLoginDto {
  @IsString()
  @MinLength(JWT_MIN_LENGTH)
  twoFactorToken!: string;

  @IsString()
  @Length(TOTP_TOKEN_LENGTH, TOTP_TOKEN_LENGTH)
  token!: string;
}

export class SetupTwoFactorEnrollmentDto {
  @IsString()
  @MinLength(JWT_MIN_LENGTH)
  enrollmentToken!: string;
}

export class CompleteTwoFactorEnrollmentDto {
  @IsString()
  @MinLength(JWT_MIN_LENGTH)
  enrollmentToken!: string;

  @IsString()
  @Length(TOTP_TOKEN_LENGTH, TOTP_TOKEN_LENGTH)
  token!: string;
}

export class EnableTwoFactorDto {
  @IsString()
  @Length(TOTP_TOKEN_LENGTH, TOTP_TOKEN_LENGTH)
  token!: string;
}

export class DisableTwoFactorDto {
  @IsString()
  @Length(TOTP_TOKEN_LENGTH, TOTP_TOKEN_LENGTH)
  token!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
