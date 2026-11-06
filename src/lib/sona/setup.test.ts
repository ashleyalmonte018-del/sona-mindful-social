import { describe, expect, it } from 'vitest';
import { limitReached, needsSetup, validSetupAge } from './setup';

describe('account setup', () => {
  it('requires setup for a new account and remembers completion', () => {
    expect(needsSetup(undefined)).toBe(true);
    expect(needsSetup(false)).toBe(true);
    expect(needsSetup(true)).toBe(false);
  });
  it('accepts the three age groups without inventing a birthdate', () => {
    expect(['sapling', 'sprout', 'bloom'].every(validSetupAge)).toBe(true);
    expect(validSetupAge('open')).toBe(false);
    expect(validSetupAge(null)).toBe(false);
  });
});

describe('daily closure', () => {
  it('a five-minute snooze expires rather than disabling the limit forever', () => {
    const until = 1_000 + 5 * 60_000;
    expect(limitReached(45, 45, true, until, until - 1)).toBe(false);
    expect(limitReached(45, 45, true, until, until)).toBe(true);
    expect(limitReached(44, 45, true, null, until)).toBe(false);
    expect(limitReached(45, 45, false, null, until)).toBe(false);
  });
});