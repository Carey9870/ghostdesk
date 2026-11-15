// path: packages/shared/src/passphrase.ts
// purpose: Passphrase and pattern rules. The Rust core (src-tauri/src/policy.rs) enforces the same rules; keep both in sync.
export const PASSPHRASE_MIN = 14;
export const PASSPHRASE_MAX = 17;
export const PATTERN_MIN = 6;

export type RuleId = 'len' | 'low' | 'cap' | 'num' | 'sym' | 'sp';

export const PASSPHRASE_RULES: ReadonlyArray<{ id: RuleId; label: string }> = [
  { id: 'len', label: `${PASSPHRASE_MIN} to ${PASSPHRASE_MAX} characters` },
  { id: 'low', label: 'A lowercase letter' },
  { id: 'cap', label: 'At least 2 capital letters' },
  { id: 'num', label: 'A number' },
  { id: 'sym', label: 'A symbol, like ! or #' },
  { id: 'sp', label: 'A space between words' },
];

export function checkPassphrase(value: string): Record<RuleId, boolean> {
  const chars = [...value];
  return {
    len: chars.length >= PASSPHRASE_MIN && chars.length <= PASSPHRASE_MAX,
    low: chars.some((c) => c >= 'a' && c <= 'z'),
    cap: chars.filter((c) => c >= 'A' && c <= 'Z').length >= 2,
    num: chars.some((c) => c >= '0' && c <= '9'),
    sym: chars.some((c) => !/[A-Za-z0-9 ]/.test(c)),
    sp: chars.includes(' '),
  };
}

export const isPassphraseValid = (value: string): boolean =>
  Object.values(checkPassphrase(value)).every(Boolean);
