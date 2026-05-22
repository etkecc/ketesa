import { zxcvbn, zxcvbnOptions } from "@zxcvbn-ts/core";
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common";
import * as zxcvbnEnPackage from "@zxcvbn-ts/language-en";

/**
 * Generate a random user password
 * @returns a new random password as string
 */
export function generateRandomPassword(length = 64): string {
  const characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~`!@#$%^&*()_-+={[}]|:;'.?/<>,";
  return Array.from(crypto.getRandomValues(new Uint32Array(length)))
    .map(x => characters[x % characters.length])
    .join("");
}
export const generateDeviceId = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => chars[byte % chars.length]).join("");
};

// Mirrors the default MAS `passwords.minimum_complexity` (zxcvbn score 0..4).
// MAS rejects anything below this server-side, so we use it as the client-side
// gate too when the homeserver delegates to MAS (externalAuthProvider).
export const MIN_PASSWORD_SCORE = 3;

let zxcvbnConfigured = false;
const configureZxcvbn = () => {
  if (zxcvbnConfigured) return;
  zxcvbnOptions.setOptions({
    translations: zxcvbnEnPackage.translations,
    graphs: zxcvbnCommonPackage.adjacencyGraphs,
    dictionary: {
      ...zxcvbnCommonPackage.dictionary,
      ...zxcvbnEnPackage.dictionary,
    },
  });
  zxcvbnConfigured = true;
};

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  warning: string;
  suggestions: string[];
}

/**
 * Evaluate password strength using the same zxcvbn algorithm MAS uses
 * server-side. Returns a score 0..4 plus optional feedback.
 */
export const evaluatePasswordStrength = (password: string): PasswordStrength => {
  configureZxcvbn();
  const result = zxcvbn(password);
  return {
    score: result.score as 0 | 1 | 2 | 3 | 4,
    warning: result.feedback.warning ?? "",
    suggestions: result.feedback.suggestions ?? [],
  };
};
