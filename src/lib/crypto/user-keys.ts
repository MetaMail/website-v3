import keccak256 from "keccak256";
import { generateECDHKeyPair } from "./ecdh";
import { encryptWithCryptoJS, decryptWithCryptoJS } from "./symmetric";
import { sha256Hex } from "./utils";
import { EIP712_DOMAIN, EIP712_SALT_TYPES, EIP712_KEY_DATA_TYPES } from "@/lib/constants";
import type { WalletClient } from "viem";

const KEYS_META = {
  name: "ECDH",
  named_curve: "P-384",
  private_key_format: "pkcs8",
  public_key_format: "spki",
  private_key_encoding: "hex",
  public_key_encoding: "hex",
  key_usages: ["deriveKey"],
  derived_key_name: "AES-GCM",
};

/** Sign EIP-712 typed data using a viem WalletClient */
async function signTypedData(
  walletClient: WalletClient,
  types: Record<string, Array<{ name: string; type: string }>>,
  message: Record<string, string>,
  primaryType: string
): Promise<string> {
  const address = walletClient.account?.address;
  if (!address) throw new Error("No wallet account connected");

  return walletClient.signTypedData({
    account: address,
    domain: EIP712_DOMAIN,
    types,
    primaryType,
    message,
  });
}

/** Sign the salt to derive the Storage Encryption Key */
export async function signSalt(
  walletClient: WalletClient,
  salt: string
): Promise<string> {
  return signTypedData(
    walletClient,
    EIP712_SALT_TYPES,
    { salt, hint: "Sign this salt to generate encryption key" },
    "Sign_Salt"
  );
}

/** Derive the Storage Encryption Key from a signed salt */
function deriveStorageKey(signedSalt: string): string {
  // Pass string directly — keccak256's internal toBuffer handles '0x' prefix
  // by converting hex to actual bytes. Wrapping in Buffer.from() would create
  // UTF-8 bytes of the literal string, producing a different hash.
  return keccak256(signedSalt).toString("hex");
}

/** Decrypt the user's ECDH private key using their wallet signature */
export async function decryptPrivateKey(
  walletClient: WalletClient,
  encryptedPrivateKey: string,
  salt: string
): Promise<string> {
  const signedSalt = await signSalt(walletClient, salt);
  const storageKey = deriveStorageKey(signedSalt);
  return decryptWithCryptoJS(encryptedPrivateKey, storageKey);
}

/** Generate encryption keys for a new user. Returns data to upload to backend. */
export async function generateEncryptionKeys(walletClient: WalletClient) {
  // Generate random salt
  const saltBytes = crypto.getRandomValues(new Uint8Array(32));
  const salt = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Sign salt to derive storage encryption key
  const signedSalt = await signSalt(walletClient, salt);
  const storageKey = deriveStorageKey(signedSalt);

  // Generate ECDH key pair
  const { publicKey, privateKey } = await generateECDHKeyPair();

  // Encrypt private key with storage key
  const encryptedPrivateKey = encryptWithCryptoJS(privateKey, storageKey);

  // Compute hashes for key data signing
  const publicKeyHash = await sha256Hex(publicKey);
  const encryptedPrivateKeyHash = await sha256Hex(encryptedPrivateKey);
  const keysHash = await sha256Hex(publicKeyHash + encryptedPrivateKeyHash);

  const keysMetaStr = JSON.stringify(KEYS_META);
  const date = new Date().toISOString();

  // Sign key data
  const signature = await signTypedData(
    walletClient,
    EIP712_KEY_DATA_TYPES,
    { date, salt, keys_hash: keysHash, keys_meta: keysMetaStr },
    "Sign_KeyData"
  );

  return {
    signature,
    salt,
    encrypted_private_key: encryptedPrivateKey,
    public_key: publicKey,
    keys_meta: keysMetaStr,
    date,
  };
}
