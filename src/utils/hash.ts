// SHA-256 of the JSON-encoded parts, so a part boundary can never blur into the next part.
export const sha256Hex = async (...parts: string[]): Promise<string> => {
  const input = new TextEncoder().encode(JSON.stringify(parts));
  const digest = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
};
