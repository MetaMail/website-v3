import CryptoJS from "crypto-js";
import { bufferToHex, hexToBuffer } from "./utils";

// Fixed 12-byte zero IV (safe because randomBits are unique per mail)
const ZERO_IV = new Uint8Array(12);

/**
 * AES symmetric encryption using CryptoJS (passphrase-based).
 * Used for:
 * - Encrypting/decrypting the user's ECDH private key with their storage key
 * - Encrypting/decrypting mail content with randomBits
 */
export function encryptWithCryptoJS(data: string, key: string): string {
  return CryptoJS.AES.encrypt(data, key).toString();
}

export function decryptWithCryptoJS(
  encryptedData: string,
  key: string
): string {
  const bytes = CryptoJS.AES.decrypt(encryptedData, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Decrypt CryptoJS AES to a WordArray (for binary data like attachments).
 */
export function decryptWithCryptoJSToWordArray(
  encryptedData: string,
  key: string
): CryptoJS.lib.WordArray {
  return CryptoJS.AES.decrypt(encryptedData, key);
}

/**
 * AES-GCM encryption using Web Crypto API.
 * Used for encrypting/decrypting the randomBits with the ECDH-derived key.
 * Input/output: UTF-8 string ↔ hex string (matching the old implementation).
 */
export async function encryptAESGCM(
  data: string,
  secretKey: CryptoKey
): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ZERO_IV },
    secretKey,
    encoded
  );
  return bufferToHex(encrypted);
}

export async function decryptAESGCM(
  encryptedHex: string,
  secretKey: CryptoKey
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ZERO_IV },
    secretKey,
    hexToBuffer(encryptedHex)
  );
  return new TextDecoder().decode(decrypted);
}
