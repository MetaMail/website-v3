import { sha256Hex } from "./utils";
import { EIP712_DOMAIN, EIP712_MAIL_TYPES } from "@/lib/constants";
import type { PersonItem } from "@/lib/constants";
import type { WalletClient } from "viem";

function concatAddress(person: PersonItem): string {
  return `${person.name ?? ""} <${person.address}>`;
}

export interface SignMailParams {
  from: PersonItem;
  to: PersonItem[];
  cc: PersonItem[];
  date: string;
  subject: string;
  textHash: string;
  htmlHash: string;
  attachmentHashes: string[];
  encryptedEncryptionKeys: string[];
  encryptionPublicKeys: string[];
}

export async function signMailMessage(
  walletClient: WalletClient,
  params: SignMailParams
): Promise<string> {
  const address = walletClient.account?.address;
  if (!address) throw new Error("No wallet account connected");

  const fromStr = concatAddress(params.from);
  const toArr = params.to.map(concatAddress);
  const ccArr = params.cc.map(concatAddress);

  // SHA256 hash each encrypted_encryption_key individually
  const eekHashes = await Promise.all(
    params.encryptedEncryptionKeys.map((key) => sha256Hex(key))
  );

  // SHA256 hash each encryption_public_key individually
  const epkHashes = await Promise.all(
    params.encryptionPublicKeys.map((key) => sha256Hex(key))
  );

  const message = {
    from: fromStr,
    to: toArr,
    cc: ccArr,
    date: params.date,
    subject: params.subject,
    text_hash: params.textHash,
    html_hash: params.htmlHash,
    attachment_hashes: params.attachmentHashes,
    encrypted_encryption_key_hashes: eekHashes,
    encryption_public_key_hashes: epkHashes,
  };

  const signature = await walletClient.signTypedData({
    account: address,
    domain: EIP712_DOMAIN,
    types: EIP712_MAIL_TYPES,
    primaryType: "Sign_Mail",
    message,
  });

  return signature;
}
