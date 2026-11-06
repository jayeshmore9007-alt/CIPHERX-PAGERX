// fileIntake.js - real magic-byte validation for analysis uploads.
// Supports APK, AAB, DEX, JAR, ZIP, SO. Rejects mismatched, oversized and unknown content.
const fs = require('fs');
const path = require('path');

const MAX_FILE_MB = Number(process.env.MAX_FILE_MB || 200);
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

const SUPPORTED_FORMATS = ['apk', 'aab', 'dex', 'jar', 'zip', 'so'];

// Real magic bytes (hex) per format.
const MAGIC = {
  apk: ['504b0304'],          // ZIP local file header
  aab: ['504b0304'],
  jar: ['504b0304'],
  zip: ['504b0304'],
  dex: ['6465780a30333500'],   // "dex\n035\0"
  so:  ['7f454c46'],           // ELF
};

function extensionOf(filename) {
  return (filename || '').split('.').pop().toLowerCase();
}

function startsWithMagic(buf, hex) {
  const need = hex.length / 2;
  if (buf.length < need) return false;
  for (let i = 0; i < need; i++) {
    if (buf[i] !== parseInt(hex.slice(i * 2, i * 2 + 2), 16)) return false;
  }
  return true;
}

/**
 * Validate a raw buffer against its claimed format.
 * Returns { ok, format, size, reason } - reason is set only on rejection.
 */
function validateBuffer(filename, buf) {
  const ext = extensionOf(filename);
  if (!SUPPORTED_FORMATS.includes(ext)) {
    return { ok: false, format: ext || null, size: buf.length, reason: `Unsupported format "${ext}". Supported: ${SUPPORTED_FORMATS.join(', ')}.` };
  }
  if (!buf || buf.length === 0) {
    return { ok: false, format: ext, size: 0, reason: 'Empty file.' };
  }
  if (buf.length > MAX_FILE_BYTES) {
    return { ok: false, format: ext, size: buf.length, reason: `File exceeds the ${MAX_FILE_MB} MB limit.` };
  }
  const accepted = (MAGIC[ext] || []).some((hex) => startsWithMagic(buf, hex));
  if (!accepted) {
    return { ok: false, format: ext, size: buf.length, reason: `Magic-byte validation failed: content does not look like a real ${ext.toUpperCase()} file.` };
  }
  return { ok: true, format: ext, size: buf.length, reason: null };
}

/** Persist a validated buffer to dir. Deletes the file again if validation fails. */
function storeValidated(dir, filename, buf) {
  const res = validateBuffer(filename, buf);
  if (!res.ok) return res;
  fs.mkdirSync(dir, { recursive: true });
  const safe = path.basename(filename).replace(/[^A-Za-z0-9._-]/g, '_');
  const target = path.join(dir, safe);
  fs.writeFileSync(target, buf);
  return { ok: true, format: res.format, size: res.size, storedPath: target, storedName: safe, reason: null };
}

module.exports = { SUPPORTED_FORMATS, validateBuffer, storeValidated, MAX_FILE_MB };
