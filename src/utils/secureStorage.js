const DEFAULT_SECRET = "kageyama-persist-secret";

const getSecretKey = () => {
  const envSecret = import.meta.env?.VITE_PERSIST_SECRET_KEY;
  if (typeof envSecret === "string" && envSecret.trim()) {
    return envSecret.trim();
  }
  return DEFAULT_SECRET;
};

const toUint8Array = (value) => {
  if (value instanceof Uint8Array) return value;
  const encoder = new TextEncoder();
  return encoder.encode(value);
};

const xorBytes = (source, secret) => {
  if (!secret.length) return source;
  const result = new Uint8Array(source.length);
  for (let i = 0; i < source.length; i += 1) {
    result[i] = source[i] ^ secret[i % secret.length];
  }
  return result;
};

const toBase64 = (bytes) => {
  if (typeof window === "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
};

const fromBase64 = (text) => {
  if (typeof window === "undefined") {
    return new Uint8Array(Buffer.from(text, "base64"));
  }
  const binary = window.atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const SECRET_BYTES = toUint8Array(getSecretKey());
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const encryptPersistData = (payload) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  try {
    const json = JSON.stringify(payload);
    const plainBytes = textEncoder.encode(json);
    const cipherBytes = xorBytes(plainBytes, SECRET_BYTES);
    return toBase64(cipherBytes);
  } catch (error) {
    console.error("Failed to encrypt persist data", error);
    return null;
  }
};

export const decryptPersistData = (cipherText) => {
  if (!cipherText || typeof cipherText !== "string") {
    return null;
  }

  try {
    const cipherBytes = fromBase64(cipherText);
    const plainBytes = xorBytes(cipherBytes, SECRET_BYTES);
    const decoded = textDecoder.decode(plainBytes);
    if (!decoded) return null;
    const parsed = JSON.parse(decoded);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    console.error("Failed to decrypt persist data", error);
    return null;
  }
};
