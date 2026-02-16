import { bufferToHex, hexToBuffer } from "./utils";

const ECDH_PARAMS: EcKeyGenParams = {
  name: "ECDH",
  namedCurve: "P-384",
};

/** Generate an ECDH P-384 key pair, returned as hex strings */
export async function generateECDHKeyPair(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  const keyPair = await crypto.subtle.generateKey(ECDH_PARAMS, true, [
    "deriveKey",
  ]);

  const publicKeyBuffer = await crypto.subtle.exportKey(
    "spki",
    keyPair.publicKey
  );
  const privateKeyBuffer = await crypto.subtle.exportKey(
    "pkcs8",
    keyPair.privateKey
  );

  return {
    publicKey: bufferToHex(publicKeyBuffer),
    privateKey: bufferToHex(privateKeyBuffer),
  };
}

/** Import a public key from hex for ECDH key derivation */
export async function importPublicKey(hexKey: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    hexToBuffer(hexKey),
    ECDH_PARAMS,
    false,
    []
  );
}

/** Import a private key from hex for ECDH key derivation */
export async function importPrivateKey(hexKey: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "pkcs8",
    hexToBuffer(hexKey),
    ECDH_PARAMS,
    false,
    ["deriveKey"]
  );
}

/** Derive an AES-GCM 256-bit key from ECDH private + public keys */
export async function deriveSecretKey(
  privateKeyHex: string,
  publicKeyHex: string
): Promise<CryptoKey> {
  const privateKey = await importPrivateKey(privateKeyHex);
  const publicKey = await importPublicKey(publicKeyHex);

  return crypto.subtle.deriveKey(
    { name: "ECDH", public: publicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}
