import { useState, useEffect, useRef } from 'react';
import {
  ImageIcon,
  Upload,
  Play,
  CheckCircle2,
  AlertTriangle,
  Download,
  FileCode,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { type AESMode, type KeySize } from '../crypto/types';
import { aesEncrypt, aesDecrypt } from '../crypto/aes';
import { toHex } from '../crypto/encoding';
import {
  type ProcessedImage,
  generateSampleImage,
  processImageFile,
  renderRgbToDataUrl,
  verifyPixelEquality,
} from '../lib/image';
import { computeShannonEntropy, type EntropyResult } from '../lib/entropy';
import KeyPanel from '../components/KeyPanel';

interface ModeImageResult {
  mode: AESMode;
  ciphertext: Uint8Array;
  displayRgb: Uint8Array;
  iv?: Uint8Array;
  nonce?: Uint8Array;
  tag?: Uint8Array;
  entropy: EntropyResult;
  caption: string;
}

// Ultra-fast direct canvas rendering component (0ms overhead, avoids synchronous PNG compression)
function PixelCanvas({
  rgbBytes,
  width,
  height,
  className,
}: {
  rgbBytes: Uint8Array;
  width: number;
  height: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const imgData = ctx.createImageData(width, height);
    const rgba = imgData.data;
    const totalPixels = width * height;
    const maxBytes = Math.min(rgbBytes.length, totalPixels * 3);

    let p = 0;
    for (let i = 0; i < maxBytes; i += 3) {
      rgba[p++] = rgbBytes[i];
      rgba[p++] = rgbBytes[i + 1] || 0;
      rgba[p++] = rgbBytes[i + 2] || 0;
      rgba[p++] = 255;
    }
    while (p < rgba.length) {
      rgba[p++] = 0;
      rgba[p++] = 0;
      rgba[p++] = 0;
      rgba[p++] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
  }, [rgbBytes, width, height]);

  return <canvas ref={canvasRef} className={className} />;
}

export default function ImageLab() {
  const [keySize, setKeySize] = useState<KeySize>(128);
  const [keyBytes, setKeyBytes] = useState<Uint8Array>(() => {
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    return b;
  });

  const [currentImage, setCurrentImage] = useState<ProcessedImage | null>(null);
  const [maxDimension, setMaxDimension] = useState<number>(180); // 180px gives instant, sub-50ms performance
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Encrypted results for all 4 modes
  const [results, setResults] = useState<Record<AESMode, ModeImageResult> | null>(null);

  // Single view vs 4-mode grid view
  const [viewMode, setViewMode] = useState<'grid' | 'single'>('grid');
  const [selectedSingleMode, setSelectedSingleMode] = useState<AESMode>('ECB');

  // Decryption state
  const [decryptWrongKey, setDecryptWrongKey] = useState(false);
  const [decryptedRgb, setDecryptedRgb] = useState<Uint8Array | null>(null);
  const [decryptionStatus, setDecryptionStatus] = useState<{ match: boolean; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize with shield logo on load
  useEffect(() => {
    loadSample('shield');
  }, [maxDimension]);

  function loadSample(type: 'shield' | 'gradient' | 'pixelart') {
    setIsProcessing(true);
    setStatusMessage('Generating sample image...');
    setTimeout(() => {
      const sample = generateSampleImage(type, maxDimension);
      setCurrentImage(sample);
      setResults(null);
      setDecryptedRgb(null);
      setDecryptionStatus(null);
      setIsProcessing(false);
      setStatusMessage('');
    }, 10);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPEG, WebP).');
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Optimizing and downscaling image...');
    try {
      const processed = await processImageFile(file, maxDimension);
      setCurrentImage(processed);
      setResults(null);
      setDecryptedRgb(null);
      setDecryptionStatus(null);
    } catch (err) {
      alert('Failed to load image: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  }

  // Fast parallel encryption for all 4 modes
  async function handleEncryptAll() {
    if (!currentImage) return;
    setIsProcessing(true);
    setStatusMessage('Encrypting in parallel across all 4 modes...');
    setResults(null);
    setDecryptedRgb(null);
    setDecryptionStatus(null);

    // Yield 10ms to let browser render the spinner
    await new Promise(r => setTimeout(r, 10));

    try {
      const modes: AESMode[] = ['ECB', 'CBC', 'CTR', 'GCM'];

      // Parallel async encryption using native Web Crypto threads
      const encResults = await Promise.all(
        modes.map(m => aesEncrypt(m, keyBytes, currentImage.rgbBytes))
      );

      const targetLen = currentImage.width * currentImage.height * 3;
      const newResults: Partial<Record<AESMode, ModeImageResult>> = {};

      for (let i = 0; i < modes.length; i++) {
        const m = modes[i];
        const enc = encResults[i];
        const displayRgb = enc.ciphertext.subarray(0, targetLen);
        const entropy = computeShannonEntropy(displayRgb);

        let caption = 'Looks like random noise (secure visual diffusion)';
        if (m === 'ECB') {
          caption = '⚠️ Outline & patterns still clearly visible! Low entropy leakage.';
        }

        newResults[m] = {
          mode: m,
          ciphertext: enc.ciphertext,
          displayRgb,
          iv: enc.iv,
          nonce: enc.nonce,
          tag: enc.tag,
          entropy,
          caption,
        };
      }

      setResults(newResults as Record<AESMode, ModeImageResult>);
    } catch (err) {
      console.error(err);
      alert('Encryption error: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  }

  // Fast decryption
  async function handleDecrypt(targetMode: AESMode) {
    if (!results || !currentImage) return;
    const res = results[targetMode];
    if (!res) return;

    setIsProcessing(true);
    setStatusMessage(`Decrypting AES-${targetMode}...`);
    await new Promise(r => setTimeout(r, 10));

    let keyToUse = keyBytes;
    if (decryptWrongKey) {
      keyToUse = new Uint8Array(keyBytes.length);
      keyToUse.set(keyBytes);
      keyToUse[0] ^= 0xff; // Corrupt key
    }

    try {
      const dec = await aesDecrypt(targetMode, keyToUse, res.ciphertext, {
        iv: res.iv,
        nonce: res.nonce,
        tag: res.tag,
      });

      if (!dec.valid) {
        setDecryptedRgb(null);
        setDecryptionStatus({
          match: false,
          message: dec.error || 'Decryption failed (Wrong key or corrupted ciphertext)',
        });
      } else {
        setDecryptedRgb(dec.plaintext);
        const verification = verifyPixelEquality(currentImage.rgbBytes, dec.plaintext);
        if (verification.match) {
          setDecryptionStatus({
            match: true,
            message: 'Perfect pixel-exact match ✓ (0 byte mismatches)',
          });
        } else {
          setDecryptionStatus({
            match: false,
            message: `Decrypted with ${verification.mismatchedBytes} mismatched bytes`,
          });
        }
      }
    } catch (e) {
      setDecryptedRgb(null);
      setDecryptionStatus({
        match: false,
        message: e instanceof Error ? e.message : 'Decryption error',
      });
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  }

  // Download preview as PNG (generates PNG data on demand only when clicked)
  function downloadPreview(mode: AESMode) {
    if (!results || !currentImage) return;
    const res = results[mode];
    const url = renderRgbToDataUrl(res.displayRgb, currentImage.width, currentImage.height);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aes-${mode.toLowerCase()}-visualization-only.png`;
    a.click();
  }

  function downloadPackage(mode: AESMode) {
    if (!results || !currentImage) return;
    const res = results[mode];
    const pkg = {
      format: 'cryptolab-image-package-v1',
      mode: res.mode,
      width: currentImage.width,
      height: currentImage.height,
      ivHex: res.iv ? toHex(res.iv) : undefined,
      nonceHex: res.nonce ? toHex(res.nonce) : undefined,
      tagHex: res.tag ? toHex(res.tag) : undefined,
      ciphertextHex: toHex(res.ciphertext),
      keyHex: toHex(keyBytes),
    };
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aes-${mode.toLowerCase()}-package.bin`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-ctr/10 text-ctr">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">Image Encryption Lab</h1>
            <p className="text-sm text-muted">
              The classic visual demonstration: Why AES-ECB fails to hide patterns (the "ECB penguin" phenomenon) while CBC, CTR, and GCM produce true pseudo-random noise.
            </p>
          </div>
        </div>
      </div>

      {/* Controls: Sample selector & Image options */}
      <div className="p-5 bg-card border border-border rounded-card shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">1. Choose or Upload Image</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => loadSample('shield')}
                className="text-xs px-3 py-1.5 rounded-md bg-surface border border-border hover:border-primary/40 text-text font-medium"
              >
                Shield & Lock Logo (Best for ECB!)
              </button>
              <button
                onClick={() => loadSample('gradient')}
                className="text-xs px-3 py-1.5 rounded-md bg-surface border border-border hover:border-primary/40 text-text font-medium"
              >
                Gradient Landscape
              </button>
              <button
                onClick={() => loadSample('pixelart')}
                className="text-xs px-3 py-1.5 rounded-md bg-surface border border-border hover:border-primary/40 text-text font-medium"
              >
                Pixel Art Tiles
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 font-medium flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Custom Image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">Resolution</label>
            <div className="flex gap-1">
              {[
                { dim: 140, label: 'Fast (140px)' },
                { dim: 180, label: 'Standard (180px)' },
                { dim: 256, label: 'High (256px)' },
              ].map(item => (
                <button
                  key={item.dim}
                  onClick={() => setMaxDimension(item.dim)}
                  className={`text-xs px-2.5 py-1 rounded border font-medium transition-colors ${maxDimension === item.dim ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-muted hover:text-text'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Key Configuration */}
        <div className="pt-3 border-t border-border">
          <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">2. Shared Key for All 4 Modes</label>
          <KeyPanel
            keyBytes={keyBytes}
            keySize={keySize}
            onKeyChange={setKeyBytes}
            onKeySizeChange={setKeySize}
          />
        </div>

        {/* Action Button */}
        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={handleEncryptAll}
            disabled={isProcessing || !currentImage}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 shadow-sm"
          >
            <Play className="w-4 h-4 fill-white" />
            {isProcessing ? (statusMessage || 'Processing...') : 'Encrypt with All 4 Modes'}
          </button>

          {isProcessing && (
            <span className="text-xs text-muted flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
              {statusMessage}
            </span>
          )}
        </div>
      </div>

      {/* Main Results View */}
      {results && currentImage && (
        <div className="space-y-6">
          {/* View toggle */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text">Encryption Results Comparison</h2>
            <div className="flex items-center gap-1 p-1 bg-surface border border-border rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`text-xs px-3 py-1 rounded-md font-medium ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-muted'}`}
              >
                All 4 Modes Grid
              </button>
              <button
                onClick={() => setViewMode('single')}
                className={`text-xs px-3 py-1 rounded-md font-medium ${viewMode === 'single' ? 'bg-primary text-white' : 'text-muted'}`}
              >
                Single Mode Detailed
              </button>
            </div>
          </div>

          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Original Image Card */}
              <div className="p-4 bg-card border border-border rounded-card shadow-card space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-text">Original</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-muted font-mono">
                    {currentImage.width}×{currentImage.height}
                  </span>
                </div>
                <div className="aspect-square bg-surface border border-border rounded-lg overflow-hidden flex items-center justify-center p-1">
                  <PixelCanvas
                    rgbBytes={currentImage.rgbBytes}
                    width={currentImage.width}
                    height={currentImage.height}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="text-[11px] text-muted leading-tight">
                  Unencrypted raw RGB pixel data ({currentImage.rgbBytes.length.toLocaleString()} bytes).
                </div>
              </div>

              {/* 4 Encrypted Modes Cards */}
              {(['ECB', 'CBC', 'CTR', 'GCM'] as AESMode[]).map(m => {
                const res = results[m];
                return (
                  <div key={m} className={`p-4 bg-card border-2 ${m === 'ECB' ? 'border-ecb shadow-md' : 'border-border'} rounded-card shadow-card space-y-3`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-text">AES-{m}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${m === 'ECB' ? 'bg-danger/10 text-danger border border-danger/20' : 'bg-success/10 text-success'}`}>
                        {m === 'ECB' ? 'LEAKS PATTERN!' : '✓ NOISE'}
                      </span>
                    </div>

                    <div className="aspect-square bg-surface border border-border rounded-lg overflow-hidden flex items-center justify-center p-1">
                      <PixelCanvas
                        rgbBytes={res.displayRgb}
                        width={currentImage.width}
                        height={currentImage.height}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-muted">Entropy:</span>
                        <span className={`font-bold ${res.entropy.entropy < 7.0 ? 'text-danger' : 'text-success'}`}>
                          {res.entropy.entropy.toFixed(3)} / 8.0
                        </span>
                      </div>
                      <p className="text-[11px] text-muted leading-snug">{res.caption}</p>

                      <div className="pt-2 flex gap-1.5">
                        <button
                          onClick={() => downloadPreview(m)}
                          className="flex-1 text-[10px] py-1 bg-surface border border-border rounded hover:bg-surface/80 text-muted hover:text-text flex items-center justify-center gap-1 font-medium"
                          title="Download PNG visualization"
                        >
                          <Download className="w-3 h-3" /> Preview
                        </button>
                        <button
                          onClick={() => downloadPackage(m)}
                          className="flex-1 text-[10px] py-1 bg-surface border border-border rounded hover:bg-surface/80 text-muted hover:text-text flex items-center justify-center gap-1 font-medium"
                          title="Download real decryptable package"
                        >
                          <FileCode className="w-3 h-3" /> .bin
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Single Mode Detailed View */}
          {viewMode === 'single' && (
            <div className="p-6 bg-card border border-border rounded-card shadow-card space-y-6">
              <div className="flex gap-2">
                {(['ECB', 'CBC', 'CTR', 'GCM'] as AESMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setSelectedSingleMode(m)}
                    className={`px-4 py-1.5 rounded-md text-xs font-medium border ${selectedSingleMode === m ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-muted'}`}
                  >
                    AES-{m}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="text-center space-y-2">
                  <span className="text-xs font-semibold text-muted uppercase">Original Unencrypted</span>
                  <div className="max-w-xs mx-auto aspect-square bg-surface border border-border rounded-lg overflow-hidden flex items-center justify-center p-2">
                    <PixelCanvas
                      rgbBytes={currentImage.rgbBytes}
                      width={currentImage.width}
                      height={currentImage.height}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <span className="text-xs font-semibold text-muted uppercase">AES-{selectedSingleMode} Ciphertext Visualization</span>
                  <div className="max-w-xs mx-auto aspect-square bg-surface border border-border rounded-lg overflow-hidden flex items-center justify-center p-2">
                    <PixelCanvas
                      rgbBytes={results[selectedSingleMode].displayRgb}
                      width={currentImage.width}
                      height={currentImage.height}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Entropy and Details */}
              <div className="p-4 bg-surface rounded-lg border border-border space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-text">Shannon Entropy:</span>
                  <span className="font-mono font-bold text-sm text-primary">
                    {results[selectedSingleMode].entropy.entropy} bits/byte (Max 8.0)
                  </span>
                </div>
                <p className="text-muted leading-relaxed">
                  {results[selectedSingleMode].entropy.interpretation}
                </p>
              </div>
            </div>
          )}

          {/* Decryption Verification Section */}
          <div className="p-5 bg-card border border-border rounded-card shadow-card space-y-4">
            <h3 className="text-base font-semibold text-text">Decrypt & Pixel-Exact Verification</h3>
            <p className="text-xs text-muted">
              Restore the original image from the stored ciphertext to verify lossless round-trip decryption.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              {(['ECB', 'CBC', 'CTR', 'GCM'] as AESMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => handleDecrypt(m)}
                  disabled={isProcessing}
                  className="px-3 py-1.5 bg-secondary text-white rounded-lg text-xs font-medium hover:bg-secondary/90 transition-colors"
                >
                  Decrypt AES-{m}
                </button>
              ))}

              <label className="flex items-center gap-2 text-xs text-muted cursor-pointer ml-auto">
                <input
                  type="checkbox"
                  checked={decryptWrongKey}
                  onChange={e => setDecryptWrongKey(e.target.checked)}
                  className="rounded border-border"
                />
                <span className={decryptWrongKey ? 'text-danger font-medium' : ''}>Decrypt with wrong key (demonstrates auth failure vs garbage noise)</span>
              </label>
            </div>

            {decryptionStatus && (
              <div className={`p-4 rounded-lg border text-xs space-y-2 ${decryptionStatus.match ? 'border-success/30 bg-success/5 text-success' : 'border-danger/30 bg-danger/5 text-danger'}`}>
                <div className="flex items-center gap-2 font-semibold text-sm">
                  {decryptionStatus.match ? <CheckCircle2 className="w-5 h-5 text-success" /> : <AlertTriangle className="w-5 h-5 text-danger" />}
                  {decryptionStatus.message}
                </div>

                {decryptedRgb && (
                  <div className="flex items-center gap-4 pt-2">
                    <div className="w-24 h-24 rounded border border-border bg-surface overflow-hidden flex items-center justify-center p-1">
                      <PixelCanvas
                        rgbBytes={decryptedRgb}
                        width={currentImage.width}
                        height={currentImage.height}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="text-xs text-muted">
                      Decrypted image rendered directly from decoded RGB bytes.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Educational Callout */}
      <div className="p-5 bg-surface border border-border rounded-card space-y-3">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
          <HelpCircle className="w-4 h-4" />
          Why do we encrypt raw RGB pixels instead of the PNG/JPEG file directly?
        </div>
        <p className="text-xs text-muted leading-relaxed">
          PNG and JPEG files are already heavily compressed. Compressed data looks almost like random noise and contains strict file headers. If you encrypt a PNG file directly:
        </p>
        <ul className="text-xs text-muted space-y-1 list-disc list-inside">
          <li>The header is destroyed, meaning image viewers cannot open the file at all.</li>
          <li>Compression algorithms (like DEFLATE) scramble identical pixel blocks before encryption, hiding the ECB repeating pattern.</li>
          <li>To show the true weakness of ECB mode, cryptographers encrypt raw uncompressed pixel bytes (W × H × 3) and wrap them back into an image frame with the original dimensions.</li>
        </ul>
      </div>
    </div>
  );
}
