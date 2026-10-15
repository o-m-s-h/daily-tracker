/** Read nested driver causes without exposing their raw messages. */
function collectStartupError(error: unknown) {
  const messages: string[] = [];
  const codes = new Set<string>();
  const operations = new Set<string>();
  const seen = new Set<object>();
  function inspect(value: unknown, depth = 0): void {
    if (!value || typeof value !== 'object' || depth > 6 || seen.has(value)) return;
    seen.add(value);
    const item = value as Record<string, unknown>;
    if (typeof item.message === 'string') messages.push(item.message);
    if (typeof item.name === 'string') messages.push(item.name);
    if (typeof item.code === 'string' || typeof item.code === 'number') codes.add(String(item.code));
    if (typeof item.syscall === 'string') operations.add(item.syscall);
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
  return { messages, codes, operations };
}

/** Print only known diagnostic identifiers, never raw messages or hostnames. */
export function startupErrorDetails(error: unknown): string {
  const { messages, codes, operations } = collectStartupError(error);
  const allowedCodes = new Set([
    '18', '13', '8000', '11000', 'ENOTFOUND', 'ENODATA', 'ESERVFAIL', 'EAI_AGAIN',
    'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ETIMEOUT', 'EHOSTUNREACH',
    'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR', 'ERR_SSL_SSLV3_ALERT_HANDSHAKE_FAILURE',
    'ERR_SSL_WRONG_VERSION_NUMBER', 'ERR_TLS_CERT_ALTNAME_INVALID',
    'CERT_HAS_EXPIRED', 'CERT_NOT_YET_VALID', 'DEPTH_ZERO_SELF_SIGNED_CERT',
    'SELF_SIGNED_CERT_IN_CHAIN', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
    'UNABLE_TO_GET_ISSUER_CERT', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  ]);
  const knownCodes = [...codes].filter(code => allowedCodes.has(code));
  const knownOperations = [...operations].filter(operation => ['querySrv', 'queryTxt', 'getaddrinfo', 'connect', 'read', 'write'].includes(operation));
  // Some MongoDB wrappers retain TLS details only in the nested message.
  if (/tlsv1 alert internal error|ssl alert number 80/i.test(messages.join(' '))) knownCodes.push('TLS_ALERT_INTERNAL_ERROR');
  return `Database diagnostics: codes=${knownCodes.join(', ') || 'not provided'}; operation=${knownOperations.join(', ') || 'not provided'}.`;
}

/** Classify driver errors without printing raw messages, URIs, or credentials. */
export function startupErrorHint(error: unknown): string {
  const { messages, codes } = collectStartupError(error);
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
    return 'MongoDB reported a TLS-related connection failure; this alone does not identify the cause. On Render, first verify that all service outbound IP ranges are allowed in Atlas Network Access. Also verify the cluster is active and the URI is the one provided by Atlas, including its TLS options. Use the diagnostic codes above to distinguish a handshake rejection from a certificate error. Keep certificate verification enabled.';
  }
  if (codes.has('ECONNREFUSED')) {
    return 'The database connection was refused. Check the MongoDB host, cluster availability, and firewall or VPN settings.';
  }
  if (/serverselection|timed? ?out|could not connect/.test(detail) || codes.has('ETIMEDOUT')) {
    return 'MongoDB could not be reached. In Atlas Network Access, allow this computer\'s current public IP; confirm the cluster is active and your network permits outbound MongoDB connections. A timeout alone does not identify which of these is responsible.';
  }
  return 'Database startup failed with an unclassified error. Recheck the Atlas connection string, database permissions, cluster status, and network access. Raw driver details are withheld because they can contain credentials.';
}
