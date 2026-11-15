// path: apps/web/scripts/generate-keys.ts
// purpose: One-off script that creates the Ed25519 key pair for license tokens (private key for the server, public key for the desktop build).
import { generateKeyPairSync } from 'node:crypto';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const spki = publicKey.export({ format: 'der', type: 'spki' });
const rawPublic = spki.subarray(spki.length - 32);

console.log('Add to apps/web/.env (keep secret):');
console.log(`LICENSE_SIGNING_KEY=${privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64')}\n`);
console.log('Export before building the desktop app:');
console.log(`GHOSTDESK_LICENSE_PUBLIC_KEY=${rawPublic.toString('base64')}`);
