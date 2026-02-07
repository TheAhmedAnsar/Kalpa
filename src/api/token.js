const REFRESH_TOKEN_KEY = "refresh_token";
const REFRESH_TOKEN_HEADER_CANDIDATES = [
  "x-refresh-token",
  "refresh-token",
  "refresh_token",
  REFRESH_TOKEN_KEY,
];
const SET_COOKIE_HEADER = "set-cookie";
const REFRESH_COOKIE_REGEX = new RegExp(
  `(?:^|;\\s*)${REFRESH_TOKEN_KEY}=([^;]+)`,
  "i",
);

const hasDocument = typeof document !== "undefined";
const hasLocalStorage = typeof localStorage !== "undefined";

const safeDecode = (value) => {
  if (typeof value !== "string") return value;
  try {
    return decodeURIComponent(value);
  } catch (error) {
    console.log({error});
    return value;
  }
};

const buildCookieAttributes = () => {
  if (!hasDocument) return "path=/";

  const attributes = ["path=/"];
  if (typeof window !== "undefined" && window.location?.protocol === "https:") {
    attributes.push("Secure");
    attributes.push("SameSite=None");
  } else {
    attributes.push("SameSite=Lax");
  }

  return attributes.join("; ");
};

const storeRefreshToken = (token) => {
  if (!token) return;

  const normalizedToken = Array.isArray(token) ? token[0] : token;
  const value = typeof normalizedToken === "string"
    ? normalizedToken.trim()
    : String(normalizedToken);

  if (!value) return;

  if (hasLocalStorage) {
    localStorage.setItem(REFRESH_TOKEN_KEY, value);
  }

  if (hasDocument) {
    const encoded = encodeURIComponent(value);
    document.cookie = `${REFRESH_TOKEN_KEY}=${encoded}; ${buildCookieAttributes()}`;
  }
};

const extractRefreshTokenFromSetCookie = (setCookieValue) => {
  if (!setCookieValue) return null;
  const entries = Array.isArray(setCookieValue)
    ? setCookieValue
    : [setCookieValue];

  for (const entry of entries) {
    if (typeof entry !== "string") continue;
    const match = entry.match(REFRESH_COOKIE_REGEX);
    if (match && match[1]) {
      return safeDecode(match[1]);
    }
  }

  return null;
};

export const saveRefreshTokenFromCookie = () => {
  if (!hasDocument) return;
  const match = document.cookie.match(REFRESH_COOKIE_REGEX);
  if (match && match[1]) {
    storeRefreshToken(safeDecode(match[1]));
  }
};

export const saveRefreshTokenFromHeaders = (headers = {}) => {
  if (!headers || typeof headers !== "object") return;

  const normalizedHeaders = Object.entries(headers).reduce(
    (acc, [key, value]) => {
      acc[key.toLowerCase()] = value;
      return acc;
    },
    {},
  );

  const fromSetCookie = extractRefreshTokenFromSetCookie(
    normalizedHeaders[SET_COOKIE_HEADER],
  );
  if (fromSetCookie) {
    storeRefreshToken(fromSetCookie);
    return;
  }

  for (const key of REFRESH_TOKEN_HEADER_CANDIDATES) {
    const value = normalizedHeaders[key];
    if (value) {
      storeRefreshToken(value);
      return;
    }
  }
};

export const getRefreshToken = () => {
  if (hasLocalStorage) {
    const stored = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (stored) return stored;
  }

  if (hasDocument) {
    const match = document.cookie.match(REFRESH_COOKIE_REGEX);
    if (match && match[1]) {
      return safeDecode(match[1]);
    }
  }

  return null;
};

export const clearRefreshToken = () => {
  if (hasDocument) {
    document.cookie = `${REFRESH_TOKEN_KEY}=; Max-Age=0; ${buildCookieAttributes()}`;
  }
  if (hasLocalStorage) {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};
