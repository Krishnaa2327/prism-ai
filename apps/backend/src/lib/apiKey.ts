import crypto from 'crypto';

export function generateApiKey(): string {
  // Format: org_<64 hex chars>  — unique and hard to guess
  return 'org_' + crypto.randomBytes(32).toString('hex');
}
