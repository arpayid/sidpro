import 'reflect-metadata';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  DisableTwoFactorDto,
  EnableTwoFactorDto,
  LoginDto,
  VerifyTwoFactorLoginDto,
} from '../src/core/auth/dto/auth.dto.js';

async function validatePayload<T extends object>(dto: new () => T, payload: unknown) {
  return validate(plainToInstance(dto, payload));
}

describe('auth DTO validation', () => {
  it('rejects empty login payload', async () => {
    const errors = await validatePayload(LoginDto, {});

    assert.equal(errors.length, 2);
    assert.ok(errors.some((error) => error.property === 'email'));
    assert.ok(errors.some((error) => error.property === 'password'));
  });

  it('rejects invalid login email', async () => {
    const errors = await validatePayload(LoginDto, {
      email: 'invalid-email',
      password: 'secret',
    });

    assert.ok(errors.some((error) => error.property === 'email'));
  });

  it('rejects empty login password', async () => {
    const errors = await validatePayload(LoginDto, {
      email: 'operator@example.test',
      password: '',
    });

    assert.ok(errors.some((error) => error.property === 'password'));
  });

  it('rejects empty 2FA login tokens', async () => {
    const errors = await validatePayload(VerifyTwoFactorLoginDto, {
      twoFactorToken: '',
      token: '',
    });

    assert.ok(errors.some((error) => error.property === 'twoFactorToken'));
    assert.ok(errors.some((error) => error.property === 'token'));
  });

  it('rejects empty enable 2FA token', async () => {
    const errors = await validatePayload(EnableTwoFactorDto, { token: '' });

    assert.ok(errors.some((error) => error.property === 'token'));
  });

  it('rejects empty disable 2FA token and password', async () => {
    const errors = await validatePayload(DisableTwoFactorDto, {
      token: '',
      password: '',
    });

    assert.ok(errors.some((error) => error.property === 'token'));
    assert.ok(errors.some((error) => error.property === 'password'));
  });
});
