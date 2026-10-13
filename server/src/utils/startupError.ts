/** Classify driver errors without printing raw messages, URIs, or credentials. */
export function startupErrorHint(error: unknown): string {
  const messages: string[] = [];
  const codes = new Set<string>();
  const seen = new Set<object>();
  function inspect(value: unknown, depth = 0): void {
    if (!value || typeof value !== 'object' || depth > 6 || seen.has(value)) return;
    seen.add(value);
    const item = value as Record<string, unknown>;
    if (typeof item.message === 'string') messages.push(item.message);
    if (typeof item.name === 'string') messages.push(item.name);
    if (typeof item.code === 'string' || typeof item.code === 'number') codes.add(String(item.code));
    inspect(item.cause, depth + 1);
    inspect(item.reason, depth + 1);
    inspect(item.error, depth + 1);
    if (item.servers instanceof Map) {
      for (const server of item.servers.values()) inspect(server, depth + 1);
    }
    if (Array.isArray(item.errors)) {
      for (const nested of item.errors) inspect(nested, depth + 1);
    }
  }
  inspect(error);
  // Messages are used for classification only and are never returned or logged.
  const detail = messages.join(' ').toLowerCase();
  if (codes.has('18') || /authentication failed|bad auth|auth failed/.test(detail)) {
    return 'MongoDB authentication failed. Use your Atlas Database Access user (not your Atlas website login). Check its password in server/.env and URL-encode special characters in the URI credentials.';
  }
  if (codes.has('13') || /not authorized|unauthorized/.test(detail)) {
    return 'MongoDB denied database access. Give your database user readWrite access to daily_tracker, including permission to create collections and indexes.';
  }
  if (codes.has('11000')) {
    return 'MongoDB found duplicate data while creating a unique index. Inspect existing users and dailyrecords for duplicate email or activity/date entries before retrying; no existing data was automatically deleted.';
  }
  if (/mongoparseerror|invalid connection string|invalid scheme|uri malformed/.test(detail)) {
    return 'The MongoDB connection string is invalid. Copy the Atlas Drivers URI into MONGODB_URI in server/.env, replace its placeholders, and URL-encode the username and password.';
  }
  if (['ENOTFOUND', 'ENODATA', 'ESERVFAIL', 'EAI_AGAIN'].some(code => codes.has(code)) || /querysrv|querytxt|getaddrinfo/.test(detail)) {
    return 'MongoDB DNS lookup failed. Check the cluster hostname against Atlas Connect > Drivers, confirm the cluster is active, and check whether your network or DNS resolver blocks MongoDB SRV/TXT lookups.';
  }
  if (/certificate|ssl|tls/.test(detail)) {
    return 'MongoDB TLS connection failed. Check the system clock, trusted certificates, and any VPN, antivirus, or proxy inspecting TLS connections. Do not disable certificate verification.';
  }
  if (codes.has('ECONNREFUSED')) {
    return 'The database connection was refused. Check the MongoDB host, cluster availability, and firewall or VPN settings.';
  }
  if (/serverselection|timed? ?out|could not connect/.test(detail) || codes.has('ETIMEDOUT')) {
    return 'MongoDB could not be reached. In Atlas Network Access, allow this computer\'s current public IP; confirm the cluster is active and your network permits outbound MongoDB connections. A timeout alone does not identify which of these is responsible.';
  }
  return 'Database startup failed with an unclassified error. Recheck the Atlas connection string, database permissions, cluster status, and network access. Raw driver details are withheld because they can contain credentials.';
}
