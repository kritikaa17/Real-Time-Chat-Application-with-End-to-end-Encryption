import crypto from "crypto";
import { createDecipheriv } from "crypto";

export interface UserEncryptionKeys {
  publicKey: string;
  encryptedPrivateKey: string;
  iv: string;
}

export interface Messages {
  channel_id: string;
  content: string | null;
  created_at: string;
  encryptedAESKey: string | null;
  encryptedMessage: string | null;
  file_url: string | null;
  file_hmac: string | null;
  hmac: string | null;
  id: string;
  is_deleted: boolean;
  iv: string | null;
  updated_at: string;
  user_id: string;
  workspace_id: string;
}

export class EncryptionService {
  private static readonly AES_KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;

  static generateUserEncryptionKeys(): UserEncryptionKeys {
    const { publicKey, privateKey } = this.generateRSAKeyPair();
    const aesKey = this.generateAESKey();
    const { encryptedPrivateKey, iv } = this.encryptPrivateKey(
      privateKey,
      aesKey
    );

    return {
      publicKey,
      encryptedPrivateKey,
      iv,
    };
  }

  static generateRSAKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
      },
    });

    if (!publicKey || !privateKey) {
      throw new Error("Failed to generate RSA keys");
    }
    return { publicKey, privateKey };
  }

  static generateAESKey(): Buffer {
    return crypto.randomBytes(this.AES_KEY_LENGTH);
  }

  static generateIV(): Buffer {
    return crypto.randomBytes(this.IV_LENGTH);
  }

  static encryptPrivateKey(
    privateKey: string,
    aesKey: Buffer
  ): { encryptedPrivateKey: string; iv: string } {
    const iv = this.generateIV();
    const cipher = crypto.createCipheriv("aes-256-cbc", aesKey, iv);

    let encryptedPrivateKey = cipher.update(privateKey, "utf8", "base64");
    encryptedPrivateKey += cipher.final("base64");

    return {
      encryptedPrivateKey,
      iv: iv.toString("base64"),
    };
  }

  static decryptPrivateKey(
    encryptedPrivateKey: string,
    iv: string,
    aesKey: Buffer
  ): string {
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      aesKey,
      Buffer.from(iv, "base64")
    );

    let privateKey = decipher.update(encryptedPrivateKey, "base64", "utf8");
    privateKey += decipher.final("utf8");

    return privateKey;
  }

  static encryptMessage(plaintext: string, aesKey: Buffer, iv: Buffer): string {
    if (!plaintext || !aesKey || !iv) {
      throw new Error("Missing required parameters for encryption");
    }

    const cipher = crypto.createCipheriv("aes-256-cbc", aesKey, iv);
    let encrypted = cipher.update(plaintext, "utf8", "base64");
    encrypted += cipher.final("base64");
    return encrypted;
  }

  static decryptMessage(
    encryptedMessage: string,
    aesKey: Buffer,
    iv: Buffer
  ): string | null {
    if (!encryptedMessage || !aesKey || !iv) {
      return null;
    }

    const decipher = createDecipheriv("aes-256-cbc", aesKey, iv);
    try {
      const encryptedBuffer = Buffer.from(encryptedMessage, "base64");
      let decrypted = decipher.update(encryptedBuffer).toString("utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch {
      return null;
    }
  }

  static async encryptAESKeyWithRSA(
    recipientPublicKey: string,
    aesKey: Buffer
  ): Promise<string> {
    const encryptedAESKey = crypto.publicEncrypt(
      {
        key: recipientPublicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      },
      aesKey
    );
    return encryptedAESKey.toString("base64");
  }

  static decryptAESKeyWithRSA(
    encryptedAESKey: string,
    privateKey: string
  ): Buffer {
    return crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      },
      Buffer.from(encryptedAESKey, "base64")
    );
  }

  static generateHMAC(message: string, hmacKey: Buffer): string {
    const hmac = crypto.createHmac("sha256", hmacKey);
    hmac.update(message, "utf8");
    return hmac.digest("hex");
  }

  static verifyHMAC(message: string, hmac: string, hmacKey: Buffer): boolean {
    const generatedHMAC = this.generateHMAC(message, hmacKey);
    return crypto.timingSafeEqual(
      Buffer.from(generatedHMAC, "hex"),
      Buffer.from(hmac, "hex")
    );
  }

  static async generateFileHMAC(file: File, hmacKey: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const hmac = crypto.createHmac("sha256", hmacKey);
      const reader = new FileReader();

      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const buffer = Buffer.from(arrayBuffer);
        hmac.update(buffer);
        resolve(hmac.digest("hex"));
      };

      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  static async verifyFileHMAC(
    file: File,
    storedHMAC: string,
    hmacKey: Buffer
  ): Promise<boolean> {
    try {
      const calculatedHMAC = await this.generateFileHMAC(file, hmacKey);
      return crypto.timingSafeEqual(
        Buffer.from(calculatedHMAC, "hex"),
        Buffer.from(storedHMAC, "hex")
      );
    } catch {
      return false;
    }
  }
}