// Image processing, canvas rendering, sample generation, and RGB extraction for ImageLab

export interface ProcessedImage {
  width: number;
  height: number;
  rgbBytes: Uint8Array;       // width * height * 3
  dataUrl: string;
}

export interface EncryptedImagePackage {
  mode: string;
  width: number;
  height: number;
  ivHex?: string;
  nonceHex?: string;
  tagHex?: string;
  ciphertextHex: string;
}

// Generate built-in sample images on HTML canvas
export function generateSampleImage(type: 'shield' | 'gradient' | 'pixelart', size = 256): ProcessedImage {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  // Fill white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  if (type === 'shield') {
    // Flat-colour shield & lock logo - ideal for ECB pattern demo
    // Background already white

    // Outer shield (Navy #1E3A8A)
    ctx.fillStyle = '#1E3A8A';
    ctx.beginPath();
    ctx.moveTo(size * 0.5, size * 0.15);
    ctx.lineTo(size * 0.8, size * 0.25);
    ctx.lineTo(size * 0.8, size * 0.55);
    ctx.bezierCurveTo(size * 0.8, size * 0.75, size * 0.5, size * 0.9, size * 0.5, size * 0.9);
    ctx.bezierCurveTo(size * 0.5, size * 0.9, size * 0.2, size * 0.75, size * 0.2, size * 0.55);
    ctx.lineTo(size * 0.2, size * 0.25);
    ctx.closePath();
    ctx.fill();

    // Inner shield (Blue #3B82F6)
    ctx.fillStyle = '#3B82F6';
    ctx.beginPath();
    ctx.moveTo(size * 0.5, size * 0.22);
    ctx.lineTo(size * 0.73, size * 0.3);
    ctx.lineTo(size * 0.73, size * 0.55);
    ctx.bezierCurveTo(size * 0.73, size * 0.7, size * 0.5, size * 0.83, size * 0.5, size * 0.83);
    ctx.bezierCurveTo(size * 0.5, size * 0.83, size * 0.27, size * 0.7, size * 0.27, size * 0.55);
    ctx.lineTo(size * 0.27, size * 0.3);
    ctx.closePath();
    ctx.fill();

    // Lock body (Amber #F59E0B)
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(size * 0.38, size * 0.48, size * 0.24, size * 0.22);

    // Lock shackle (White #FFFFFF)
    ctx.lineWidth = size * 0.04;
    ctx.strokeStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.46, size * 0.08, Math.PI, 0, false);
    ctx.stroke();

    // Keyhole (Navy #1E3A8A)
    ctx.fillStyle = '#1E3A8A';
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.56, size * 0.03, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(size * 0.485, size * 0.56, size * 0.03, size * 0.07);

  } else if (type === 'gradient') {
    // Simple gradient scene (Sky, Sun, Mountain)
    const sky = ctx.createLinearGradient(0, 0, 0, size * 0.65);
    sky.addColorStop(0, '#0284C7');
    sky.addColorStop(1, '#BAE6FD');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, size, size * 0.65);

    // Sun
    ctx.fillStyle = '#FBBF24';
    ctx.beginPath();
    ctx.arc(size * 0.75, size * 0.25, size * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Mountains (Dark green / Slate)
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(0, size * 0.65);
    ctx.lineTo(size * 0.35, size * 0.35);
    ctx.lineTo(size * 0.7, size * 0.65);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(size * 0.3, size * 0.65);
    ctx.lineTo(size * 0.65, size * 0.4);
    ctx.lineTo(size, size * 0.65);
    ctx.closePath();
    ctx.fill();

    // Ground
    ctx.fillStyle = '#10B981';
    ctx.fillRect(0, size * 0.65, size, size * 0.35);

  } else if (type === 'pixelart') {
    // 16x16 pixel art checkerboard / pattern scaled up
    const gridSize = 16;
    const pixelSize = size / gridSize;
    const colors = ['#EF4444', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6'];

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        // Repeated patterns in 4x4 tiles
        const colorIdx = ((Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0)
          ? ((x % 4) + (y % 4)) % colors.length
          : 0;
        ctx.fillStyle = colors[colorIdx];
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }
  }

  return extractRgbFromCanvas(canvas);
}

// Extract RGB bytes (flattened on white) from canvas
export function extractRgbFromCanvas(canvas: HTMLCanvasElement): ProcessedImage {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const imgData = ctx.getImageData(0, 0, width, height);
  const rgba = imgData.data;

  // RGB bytes only: width * height * 3
  const rgbBytes = new Uint8Array(width * height * 3);
  let p = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    rgbBytes[p++] = rgba[i];     // R
    rgbBytes[p++] = rgba[i + 1]; // G
    rgbBytes[p++] = rgba[i + 2]; // B
    // A is ignored because canvas was pre-flattened on white
  }

  return {
    width,
    height,
    rgbBytes,
    dataUrl: canvas.toDataURL('image/png'),
  };
}

// Process an uploaded Image file: resize to maxSide, flatten to white, extract RGB
export async function processImageFile(file: File, maxSide = 512): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format'));
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Downscale maintaining aspect ratio
        if (width > maxSide || height > maxSide) {
          if (width >= height) {
            height = Math.round((height * maxSide) / width);
            width = maxSide;
          } else {
            width = Math.round((width * maxSide) / height);
            height = maxSide;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

        // Fill white to flatten transparency
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        resolve(extractRgbFromCanvas(canvas));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// Build a display image from ciphertext RGB bytes
export function renderRgbToDataUrl(rgbBytes: Uint8Array, width: number, height: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const imgData = ctx.createImageData(width, height);
  const rgba = imgData.data;

  const totalPixels = width * height;
  const maxBytes = Math.min(rgbBytes.length, totalPixels * 3);

  let p = 0;
  for (let i = 0; i < maxBytes; i += 3) {
    rgba[p++] = rgbBytes[i];       // R
    rgba[p++] = rgbBytes[i + 1] || 0; // G
    rgba[p++] = rgbBytes[i + 2] || 0; // B
    rgba[p++] = 255;              // A = 255
  }

  // Fill remaining pixels if any with 255
  while (p < rgba.length) {
    rgba[p++] = 0;
    rgba[p++] = 0;
    rgba[p++] = 0;
    rgba[p++] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

// Compare two Uint8Array pixel arrays for exact equality
export function verifyPixelEquality(original: Uint8Array, decrypted: Uint8Array): { match: boolean; mismatchedBytes: number } {
  if (original.length !== decrypted.length) {
    return { match: false, mismatchedBytes: Math.abs(original.length - decrypted.length) };
  }
  let mismatches = 0;
  for (let i = 0; i < original.length; i++) {
    if (original[i] !== decrypted[i]) mismatches++;
  }
  return { match: mismatches === 0, mismatchedBytes: mismatches };
}
