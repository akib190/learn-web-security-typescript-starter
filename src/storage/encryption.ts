import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

export type EncryptedPayload = {
    nonce: Buffer;
    authTag: Buffer;
    ciphertext: Buffer;
};

function validateKey(key: Buffer): void {
    if (key.length == 32 && Buffer.isBuffer(key)) {
        return;
    }
    throw new Error("Invalid key buffer");
}

function validatePayload(payload: EncryptedPayload): void {
    if (!payload || typeof payload !== "object") {
        throw new Error("Invalid payload: Payload must be an object.");
    }

    if (!Buffer.isBuffer(payload.nonce) || payload.nonce.length !== 12) {
        throw new Error(`Invalid nonce: Must be a Buffer of length 12 (got ${payload.nonce?.length}).`);
    }

    if (!Buffer.isBuffer(payload.authTag) || payload.authTag.length !== 16) {
        throw new Error(`Invalid authTag: Must be a Buffer of length 16 (got ${payload.authTag?.length}).`);
    }

    if (!Buffer.isBuffer(payload.ciphertext)) {
        throw new Error("Invalid ciphertext: Must be a Buffer.");
    }
}

export function encrypt(plaintext: Buffer, key: Buffer): EncryptedPayload {
    validateKey(key);

    if (!Buffer.isBuffer(plaintext)) {
        throw new Error("Plaintext must be a Buffer.");
    }

    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, nonce, { authTagLength: 16 });

    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
        nonce,
        ciphertext,
        authTag,
    };
}

export function decrypt(payload: EncryptedPayload, key: Buffer): Buffer {
    validateKey(key);
    validatePayload(payload);

    try {
        const decipher = createDecipheriv("aes-256-gcm", key, payload.nonce, { authTagLength: 16 });
        decipher.setAuthTag(payload.authTag);

        return Buffer.concat([decipher.update(payload.ciphertext), decipher.final()]);
    } catch (error) {
        throw new Error("Decryption failed: Invalid payload, authentication tag mismatch, or incorrect key.");
    }
}