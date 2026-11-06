import { AGE_MODES, type AgeMode } from './types';

/** Missing setup state means a new account; existing accounts are backfilled in the migration. */
export function needsSetup(completed: boolean | undefined) {
  return completed !== true;
}

export function validSetupAge(age: unknown): age is AgeMode {
  return AGE_MODES.some((mode) => mode.id === age);
}

export function limitReached(minutes: number, limit: number, enabled: boolean, snoozeUntil: number | null, now: number) {
  return enabled && limit > 0 && minutes >= limit && (snoozeUntil === null || now >= snoozeUntil);
}