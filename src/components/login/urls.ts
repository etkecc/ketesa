/**
 * Pure homeserver-URL helpers shared by the login page and its form sections.
 * They live in their own module so both can import them without a circular
 * dependency through LoginPage.
 */

/**
 * Returns true when the issuer string is a well-formed HTTP(S) URL
 * with no query string or fragment (per RFC 8414 §2).
 * Does not enforce https: that is a deployment policy, not a format rule.
 * (MAS rejects http: issuers in production via its own config; local-dev MAS
 * runs over http:, so format validation must accept it.)
 */
export const isValidIssuer = (issuer: string): boolean => {
  try {
    const { protocol, search, hash } = new URL(issuer);
    return (protocol === "https:" || protocol === "http:") && search === "" && hash === "";
  } catch {
    return false;
  }
};

/**
 * Pick the default protocol for a homeserver the user typed without one:
 * http for localhost / loopback, https for everything else.
 */
export const getDefaultProtocolForHomeserverInput = (value: string): "http" | "https" => {
  const normalizedValue = value.trim().replace(/\/+$/g, "");

  if (
    /^(localhost|127\.0\.0\.1)(:\d{1,5})?$/i.test(normalizedValue) ||
    /^::1$/i.test(normalizedValue) ||
    /^\[::1\](:\d{1,5})?$/i.test(normalizedValue)
  ) {
    return "http";
  }

  return "https";
};

/** Prepend the default protocol when the user typed a bare host. */
export const prependDefaultProtocol = (value: string): string => {
  if (value.match(/^https?:\/\//)) {
    return value;
  }

  return `${getDefaultProtocolForHomeserverInput(value)}://${value}`;
};
