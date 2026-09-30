/**
 * The client-side password gate for the hosted prototype.
 *
 * GitHub Pages cannot check a password on the server, so the gate compares a
 * digest: only the SHA-256 hex of the password ships in the bundle, never the
 * password itself. That turns away casual visitors, not someone who fetches
 * the bundle directly.
 */

/** sessionStorage key that marks the browser session as unlocked. */
export const GATE_STORAGE_KEY = 'pfe.gate';

/** SHA-256 hex digest of the password. Never put the password itself here. */
export const PASSWORD_DIGEST =
  '96e003bf60f447bc00a5005c139c5b225125e9c2970f78f8e568ff6f98f1db83';

/** SHA-256 hex digest of the given text. */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

/** True when the entered text hashes to the expected digest. */
export async function checkPassword(input: string): Promise<boolean> {
  return (await sha256Hex(input)) === PASSWORD_DIGEST;
}
