// Shannon entropy and byte-value histogram computation

export interface EntropyResult {
  entropy: number;        // in bits per byte, max 8.0
  histogram: number[];    // 256 buckets
  interpretation: string; // Plain English interpretation
}

export function computeShannonEntropy(bytes: Uint8Array): EntropyResult {
  if (bytes.length === 0) {
    return {
      entropy: 0,
      histogram: new Array(256).fill(0),
      interpretation: 'Empty data has 0 entropy.',
    };
  }

  const histogram = new Array(256).fill(0);
  for (let i = 0; i < bytes.length; i++) {
    histogram[bytes[i]]++;
  }

  const n = bytes.length;
  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    if (histogram[i] > 0) {
      const p = histogram[i] / n;
      entropy -= p * Math.log2(p);
    }
  }

  // Round to 3 decimal places
  const roundedEntropy = Math.round(entropy * 1000) / 1000;

  let interpretation = '';
  if (roundedEntropy < 6.5) {
    interpretation = 'Low entropy! Strong patterns detected. Ciphertext is visibly leaking data structure.';
  } else if (roundedEntropy < 7.9) {
    interpretation = 'Moderate entropy. Some non-random distribution is present.';
  } else {
    interpretation = 'High entropy (~8.0 bits/byte). Distribution appears uniformly random and secure.';
  }

  return {
    entropy: roundedEntropy,
    histogram,
    interpretation,
  };
}
