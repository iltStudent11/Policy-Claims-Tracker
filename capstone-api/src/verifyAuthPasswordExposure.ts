import dotenv from 'dotenv';

dotenv.config();

const defaultBases = ['http://localhost:4000', 'http://localhost:5000'];

const removeTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const normalizeApiBase = (value: string) => {
  const base = removeTrailingSlash(value);
  return base.endsWith('/api') ? base : `${base}/api`;
};

const hasPasswordField = (value: unknown): boolean => {
  if (Array.isArray(value)) {
    return value.some((entry) => hasPasswordField(entry));
  }

  if (!value || typeof value !== 'object') {
    return false;
  }

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    if (key.toLowerCase() === 'password') {
      return true;
    }

    if (hasPasswordField(nestedValue)) {
      return true;
    }
  }

  return false;
};

const ensureJson = async (response: Response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`Expected JSON response but got: ${text.slice(0, 120)}`);
  }
};

const resolveApiBase = async (): Promise<string> => {
  const configuredBase = process.env.API_BASE_URL;
  const candidates = configuredBase ? [configuredBase] : defaultBases;

  for (const candidate of candidates) {
    const apiBase = normalizeApiBase(candidate);
    try {
      const healthResponse = await fetch(`${apiBase}/health`);
      if (healthResponse.ok) {
        return apiBase;
      }
    } catch {
      continue;
    }
  }

  const tried = candidates.map((candidate) => normalizeApiBase(candidate)).join(', ');
  throw new Error(`Unable to reach API health endpoint. Tried: ${tried}`);
};

const verify = async () => {
  const email = process.env.AUTH_TEST_EMAIL || 'admin@capstone.local';
  const password = process.env.AUTH_TEST_PASSWORD || 'Password123!';
  const apiBase = await resolveApiBase();

  const loginResponse = await fetch(`${apiBase}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const loginPayload = await ensureJson(loginResponse);

  if (!loginResponse.ok) {
    throw new Error(`Login request failed (${loginResponse.status}): ${JSON.stringify(loginPayload)}`);
  }

  if (hasPasswordField(loginPayload)) {
    throw new Error('Password field found in /auth/login response payload');
  }

  const token = typeof loginPayload.token === 'string' ? loginPayload.token : null;
  if (!token) {
    throw new Error('Missing token in /auth/login response payload');
  }

  const meResponse = await fetch(`${apiBase}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const mePayload = await ensureJson(meResponse);

  if (!meResponse.ok) {
    throw new Error(`Me request failed (${meResponse.status}): ${JSON.stringify(mePayload)}`);
  }

  if (hasPasswordField(mePayload)) {
    throw new Error('Password field found in /auth/me response payload');
  }

  console.log(`PASS: no password field in /auth/login or /auth/me responses at ${apiBase}`);
};

verify().catch((error) => {
  console.error('Verification failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
