import crypto from 'crypto';

const algorithm = 'aes-256-cbc';
// Use ENCRYPTION_KEY from environment, or a fallback for development if not provided
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_secret_key_32_bytes_long_'; // Must be 256 bits (32 characters)
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypts a text string.
 * @param {string} text 
 * @returns {string} Encrypted string in format iv:encryptedData
 */
export function encrypt(text) {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
    let encrypted = cipher.update(String(text));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (err) {
    console.error("Encryption error:", err.message);
    return text;
  }
}

/**
 * Decrypts an encrypted text string.
 * @param {string} text 
 * @returns {string} Decrypted string
 */
export function decrypt(text) {
  if (!text) return text;
  try {
    const textParts = text.split(':');
    if (textParts.length !== 2) return text; // Probably not encrypted
    
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    // If decryption fails (e.g. not encrypted text), return original text
    console.error("Decryption error:", err.message);
    return text;
  }
}

/**
 * Masks a salary string to only show the first digit and * for the rest.
 * e.g., '50000' -> '5****'
 * @param {string} value 
 * @returns {string}
 */
export function maskSalary(value) {
  if (!value) return value;
  const strValue = String(value);
  if (strValue.length <= 1) return strValue;
  // keep first char, replace rest with asterisks
  return strValue[0] + '*'.repeat(strValue.length - 1);
}
