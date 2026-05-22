import { evaluatePasswordStrength, generateDeviceId, generateRandomPassword, MIN_PASSWORD_SCORE } from "./password";

const ALLOWED_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~`!@#$%^&*()_-+={[}]|:;'.?/<>,";
const ALPHANUMERIC = /^[A-Za-z0-9]+$/;

describe("generateRandomPassword", () => {
  it("returns 64 characters by default", () => {
    expect(generateRandomPassword()).toHaveLength(64);
  });

  it("returns the requested length", () => {
    expect(generateRandomPassword(10)).toHaveLength(10);
    expect(generateRandomPassword(128)).toHaveLength(128);
  });

  it("only contains characters from the allowed set", () => {
    const pw = generateRandomPassword(200);
    for (const char of pw) {
      expect(ALLOWED_CHARS).toContain(char);
    }
  });

  it("produces different values on successive calls", () => {
    const a = generateRandomPassword();
    const b = generateRandomPassword();
    expect(a).not.toBe(b);
  });
});

describe("generateDeviceId", () => {
  it("returns exactly 16 characters", () => {
    expect(generateDeviceId()).toHaveLength(16);
  });

  it("contains only alphanumeric characters", () => {
    const id = generateDeviceId();
    expect(ALPHANUMERIC.test(id)).toBe(true);
  });

  it("produces different values on successive calls", () => {
    const a = generateDeviceId();
    const b = generateDeviceId();
    expect(a).not.toBe(b);
  });
});

describe("evaluatePasswordStrength", () => {
  it("scores empty string as 0", () => {
    expect(evaluatePasswordStrength("").score).toBe(0);
  });

  it("scores common weak passwords below the minimum", () => {
    expect(evaluatePasswordStrength("password").score).toBeLessThan(MIN_PASSWORD_SCORE);
    expect(evaluatePasswordStrength("test123").score).toBeLessThan(MIN_PASSWORD_SCORE);
    expect(evaluatePasswordStrength("qwerty").score).toBeLessThan(MIN_PASSWORD_SCORE);
  });

  it("scores strong random passwords at or above the minimum", () => {
    expect(evaluatePasswordStrength(generateRandomPassword(20)).score).toBeGreaterThanOrEqual(MIN_PASSWORD_SCORE);
  });

  it("returns warning and suggestion fields", () => {
    const result = evaluatePasswordStrength("password");
    expect(typeof result.warning).toBe("string");
    expect(Array.isArray(result.suggestions)).toBe(true);
  });
});
