/**
 * Decode a URI component, and if it fails, return the original string.
 */
export const decodeURLComponent = (str: string): string => {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
};

/**
 * Encode a URI component, and if it fails, return the original string.
 */
export const encodeURLComponent = (str: string): string => {
  try {
    return encodeURIComponent(str);
  } catch {
    return str;
  }
};

/**
 * Try-translate: attempt to translate a key, falling back to a default value if no translation exists.
 *
 * react-admin's translate() (from useTranslate) returns the key itself when no translation is found.
 * This helper detects that case and returns `fallback` instead, making it safe to call with any
 * dynamic key (enum values, server-provided strings, future unknown variants) without littering
 * the UI with raw i18n key paths like "resources.rooms.enums.join_rules.restricted".
 *
 * Usage:
 *   tt(translate, `resources.rooms.enums.join_rules.${record.join_rules}`, record.join_rules)
 *   tt(translate, `resources.users.enums.status.${user.status}`, user.status)
 */
export const tt = (translate: (key: string) => string, key: string, fallback: string): string => {
  const t = translate(key);
  return t !== key ? t : fallback;
};

/**
 * Safely convert a value to a JSON string representation.
 * If JSON.stringify fails, returns the fallback string.
 */
export const JSONStringify = (value: unknown, fallback = ""): string => {
  if (value == null) return fallback;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
};
