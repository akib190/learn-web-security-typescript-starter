import {
  type Keyring,
  encryptWithKeyring,
  serializeEncryptedPayload,
  decryptWithKeyring,
  deserializeEncryptedPayload,
} from "../storage/keyring.ts";

export type ShippingDetails = {
  name: string;
  address: string;
  city: string;
  region: string;
  postalCode: string;
};

export function encryptShippingDetails(details: ShippingDetails, keyring: Keyring | undefined): string {
  const jsonShippingDetails = JSON.stringify(details);
  const encryptedShippingPayload = encryptWithKeyring(Buffer.from(jsonShippingDetails, "hex"), keyring);

  return serializeEncryptedPayload(encryptedShippingPayload).toString();
}

export function decryptShippingDetails(serialized: string, _keyring: Keyring | undefined): ShippingDetails {
  let details: unknown;
  try {
    details = JSON.parse(serialized);
  } catch {
    throw new Error("Invalid shipping details");
  }

  if (!isShippingDetails(details)) {
    throw new Error("Invalid shipping details");
  }

  return details;
}

function isShippingDetails(details: unknown): details is ShippingDetails {
  if (!details || typeof details !== "object") {
    return false;
  }

  const candidate = details as Record<string, unknown>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.address === "string" &&
    typeof candidate.city === "string" &&
    typeof candidate.region === "string" &&
    typeof candidate.postalCode === "string"
  );
}
