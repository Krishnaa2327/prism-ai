import dns from 'dns/promises';

const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

export function isPrivateIp(ip: string): boolean {
  return PRIVATE_RANGES.some(r => r.test(ip));
}

export function isPrivateHostname(hostname: string): boolean {
  if (['localhost', '0.0.0.0', '::1'].includes(hostname.toLowerCase())) return true;
  if (/^[\d.:]+$/.test(hostname)) return isPrivateIp(hostname);
  return false;
}

export async function assertPublicUrl(url: string): Promise<void> {
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error('Invalid URL'); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only http/https URLs are allowed');
  const hostname = parsed.hostname;
  if (isPrivateHostname(hostname)) throw new Error('Private/loopback URLs are not allowed');
  try {
    const addrs = await dns.lookup(hostname, { all: true });
    for (const { address } of addrs) {
      if (isPrivateIp(address)) throw new Error('URL resolves to a private IP address');
    }
  } catch (err) {
    if ((err as Error).message.includes('private') || (err as Error).message.includes('loopback')) throw err;
  }
}

export function isPublicUrl(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    if (!['http:', 'https:'].includes(protocol)) return false;
    return !isPrivateHostname(hostname);
  } catch { return false; }
}
