import CryptoJS from "crypto-js";
import { deriveSecretKey } from "./ecdh";
import {
  encryptAESGCM,
  decryptAESGCM,
  encryptWithCryptoJS,
  decryptWithCryptoJS,
} from "./symmetric";
import { decryptPrivateKey } from "./user-keys";
import { useAuthStore } from "@/lib/store/auth";
import type { MailDetail, PersonItem } from "@/lib/constants";
import type { WalletClient } from "viem";

/**
 * Generate a random 256-bit key string for encrypting a mail.
 */
export function generateRandomBits(address: string): string {
  const rb = CryptoJS.lib.WordArray.random(256 / 8);
  return `Encryption key of this mail from ${address} is ${rb.toString(CryptoJS.enc.Base64)}`;
}

/**
 * Encrypt randomBits for a recipient using ECDH-derived key.
 * Returns the encrypted key as hex string.
 */
export async function encryptMailKey(
  randomBits: string,
  senderPrivateKey: string,
  recipientPublicKey: string
): Promise<string> {
  const secretKey = await deriveSecretKey(senderPrivateKey, recipientPublicKey);
  return encryptAESGCM(randomBits, secretKey);
}

/**
 * Decrypt an encrypted_encryption_key to recover randomBits.
 */
export async function decryptMailKey(
  encryptedKey: string,
  privateKey: string,
  senderPublicKey: string
): Promise<string> {
  const secretKey = await deriveSecretKey(privateKey, senderPublicKey);
  return decryptAESGCM(encryptedKey, secretKey);
}

/**
 * Encrypt mail content (HTML or text) with randomBits using CryptoJS AES.
 */
export function encryptMailContent(content: string, randomBits: string): string {
  return encryptWithCryptoJS(content, randomBits);
}

/**
 * Decrypt mail content with randomBits using CryptoJS AES.
 */
export function decryptMailContent(
  encryptedContent: string,
  randomBits: string
): string {
  return decryptWithCryptoJS(encryptedContent, randomBits);
}

/**
 * Find the current user's index in the mail's address list.
 * The order is: [from, ...to, ...cc, ...bcc]
 * This index corresponds to the encrypted_encryption_keys array.
 */
function findUserKeyIndex(mail: MailDetail, userAddress: string, ensName: string): number {
  const addrList = [
    mail.mail_from.address,
    ...(mail.mail_to?.map((p: PersonItem) => p.address) || []),
    ...(mail.mail_cc?.map((p: PersonItem) => p.address) || []),
    ...(mail.mail_bcc?.map((p: PersonItem) => p.address) || []),
  ];

  const idx = addrList.findIndex((addr) => {
    const prefix = addr?.split("@")[0]?.toLowerCase();
    return prefix === userAddress || prefix === ensName;
  });

  return idx;
}

/**
 * Get the decrypted private key, using sessionStorage cache when available.
 * If not cached, requires a wallet signature to decrypt.
 */
export async function getOrDecryptPrivateKey(
  walletClient: WalletClient
): Promise<string> {
  const { getCachedPrivateKey, setCachedPrivateKey, user } =
    useAuthStore.getState();

  // Check cache first
  const cached = getCachedPrivateKey();
  if (cached) return cached;

  if (!user) throw new Error("Not logged in");

  // Decrypt via wallet signature
  const privateKey = await decryptPrivateKey(
    walletClient,
    user.encryptedPrivateKey,
    user.salt
  );

  // Cache for this session
  setCachedPrivateKey(privateKey);
  return privateKey;
}

/**
 * Decrypt an encrypted mail's content.
 * Returns the decrypted HTML and text.
 */
export async function decryptMail(
  mail: MailDetail,
  walletClient: WalletClient
): Promise<{ html: string; text: string }> {
  const { user } = useAuthStore.getState();
  if (!user) throw new Error("Not logged in");

  const keys = mail.meta_header?.encrypted_encryption_keys;
  const pubKeys = mail.meta_header?.encryption_public_keys;

  if (!keys?.length || !pubKeys?.length) {
    throw new Error("Mail is missing encryption keys");
  }

  // Find which encrypted key belongs to the current user
  const idx = findUserKeyIndex(mail, user.address, user.ensName);
  if (idx < 0 || idx >= keys.length) {
    throw new Error("Cannot find encryption key for current user");
  }

  const encryptedKey = keys[idx];
  const senderPublicKey = pubKeys[0]; // Always the sender's public key

  // Get the user's decrypted private key
  const privateKey = await getOrDecryptPrivateKey(walletClient);

  // Decrypt randomBits
  const randomBits = await decryptMailKey(encryptedKey, privateKey, senderPublicKey);

  // Decrypt content
  let html = "";
  let text = "";

  if (mail.part_html) {
    html = decryptMailContent(mail.part_html, randomBits);
  }
  if (mail.part_text) {
    text = decryptMailContent(mail.part_text, randomBits);
  }

  return { html, text };
}

/**
 * Decrypt an encrypted attachment.
 * Fetches the file, decrypts it, and returns a Blob for download.
 */
export async function decryptAttachment(
  downloadUrl: string,
  randomBits: string,
  contentType: string
): Promise<Blob> {
  const response = await fetch(downloadUrl);
  const arrayBuffer = await response.arrayBuffer();

  // Convert to base64 for CryptoJS
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  // Decrypt
  const decrypted = CryptoJS.AES.decrypt(base64, randomBits);

  // Convert WordArray to Uint8Array
  const words = decrypted.words;
  const sigBytes = decrypted.sigBytes;
  const decryptedBytes = new Uint8Array(sigBytes);
  for (let i = 0; i < sigBytes; i++) {
    decryptedBytes[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }

  return new Blob([decryptedBytes], { type: contentType });
}

/**
 * Encrypt a file attachment for upload.
 * Returns the encrypted Blob and both SHA256 hashes.
 */
export async function encryptAttachmentForUpload(
  file: File,
  randomBits: string
): Promise<{
  encryptedFile: File;
  plainSha256: string;
  encryptedSha256: string;
}> {
  const arrayBuffer = await file.arrayBuffer();

  // plain_sha256: hash of original file
  const plainWordArray = CryptoJS.lib.WordArray.create(
    arrayBuffer as unknown as number[]
  );
  const plainSha256 = CryptoJS.SHA256(plainWordArray).toString();

  // Encrypt with CryptoJS AES
  const encrypted = CryptoJS.AES.encrypt(plainWordArray, randomBits);
  const encryptedBase64 = encrypted.toString(); // base64 ciphertext

  // Convert base64 to binary blob
  const binaryStr = atob(encryptedBase64);
  const encryptedBytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    encryptedBytes[i] = binaryStr.charCodeAt(i);
  }

  // encrypted_sha256: hash of encrypted file
  const encWordArray = CryptoJS.lib.WordArray.create(
    encryptedBytes.buffer as unknown as number[]
  );
  const encryptedSha256 = CryptoJS.SHA256(encWordArray).toString();

  const encryptedFile = new File([encryptedBytes], file.name, {
    type: file.type,
  });

  return { encryptedFile, plainSha256, encryptedSha256 };
}
