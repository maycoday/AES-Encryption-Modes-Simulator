export function toHex(bytes: Uint8Array): string {
  // Fast hex conversion
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export function fromHex(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, '');
  if (clean.length % 2 !== 0) throw new Error('Odd-length hex string');
  if (!/^[0-9a-fA-F]*$/.test(clean)) throw new Error('Invalid hex characters');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function toBase64(bytes: Uint8Array): string {
  // Chunked to avoid maximum call stack size on large byte arrays
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

export function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function encodeText(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function decodeText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export function chunkBytes(bytes: Uint8Array, size: number = 16): Uint8Array[] {
  const chunks: Uint8Array[] = [];
  // Cap at 128 blocks (2048 bytes) for UI memory & performance
  const limit = Math.min(bytes.length, size * 128);
  for (let i = 0; i < limit; i += size) {
    // subarray creates a zero-copy lightweight view
    chunks.push(bytes.subarray(i, Math.min(i + size, bytes.length)));
  }
  return chunks;
}
