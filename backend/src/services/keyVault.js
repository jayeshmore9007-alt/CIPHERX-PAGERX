// keyVault.js - AES-256-GCM encrypted storage for AI provider API keys.
// Keys never exist in plaintext on disk; the master key comes from env or a
// generated file inside DATA_DIR.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || './data';
const MASTER_KEY_ENV = process.env.VAULT_MASTER_KEY || '';
const MASTER_KEY_FILE = path.join(DATA_DIR, '.vault-master-key');

function getMasterKey() {
  if (MASTER_KEY_ENV) {
    return crypto.createHash('sha256').update(MASTER_KEY_ENV).digest();
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(MASTER_KEY_FILE)) {
    return Buffer.from(fs.readFileSync(MASTER_KEY_FILE, 'utf8'), 'hex');
  }
  const key = crypto.randomBytes(32);
  fs.writeFileSync(MASTER_KEY_FILE, key.toString('hex'), { mode: 0o600 });
  return key;
}

/** Encrypt plaintext -> { ct, iv, tag } (all hex). */
function encrypt(plaintext) {
  const key = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  return { ct: ct.toString('hex'), iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex') };
}

/** Decrypt { ct, iv, tag } -> plaintext or null. */
function decrypt(record) {
  try {
    const key = getMasterKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(record.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(record.tag, 'hex'));
    const pt = Buffer.concat([decipher.update(Buffer.from(record.ct, 'hex')), decipher.final()]);
    return pt.toString('utf8');
  } catch {
    return null;
  }
}

module.exports = { encrypt, decrypt };
