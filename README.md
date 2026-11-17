# CryptoLab – AES Encryption Modes Simulator

> An educational, 100% client-side web application demonstrating the internal mechanics, strengths, and failure modes of AES-ECB, AES-CBC, AES-CTR, and AES-GCM.

Built for college-level courses in **Cryptography and Information Security**. Designed to be approachable for non-computer-science beginners while technically rigorous enough to satisfy a cryptography examiner.

---

## 🌟 Key Features

1. **Text Encryption Lab**
   - Live encryption with 128, 192, and 256-bit keys.
   - 16-byte block division with PKCS#7 padding inspection.
   - **Repeated-Block Detector:** Visual warning highlighting identical ciphertext blocks in ECB mode.
   - **Step-by-Step Mathematical View:** Intermediates ($P_i \oplus \text{IV} \rightarrow \text{AES}_K \rightarrow C_i$ and CTR counter keystream calculations).
   - Instant round-trip decryption verification.

2. **Image Encryption Lab**
   - The classic visual demonstration: Encrypt raw RGB pixel buffers to show how **AES-ECB preserves image silhouettes** (the "ECB penguin" effect), while CBC, CTR, and GCM produce uniform pseudo-random noise.
   - Built-in canvas generators (Shield logo, Gradient, Pixel art) or upload custom PNG/JPEG/WebP images.
   - Shannon entropy analysis (0.0 to 8.0 bits/byte) and byte frequency distribution.
   - Lossless pixel-exact decryption verification.

3. **Ciphertext Tampering Lab**
   - Interactive clickable byte grid allowing single-bit flips in ciphertext.
   - **CTR Attacker Mode:** Forging message content (e.g., changing "100" to "900") via bit-flipping *without knowing the AES secret key*.
   - **AEAD Guarantee Demo:** Modifying ciphertext, tag, nonce, or AAD causes GCM to reject decryption and release zero plaintext.
   - Raw educational decryption revealing garbled bytes even when PKCS#7 padding is broken.

4. **Modes Comparison & Decision Helper**
   - Side-by-side comparison matrix across security, padding, parallelizability, and tampering behavior.
   - Interactive SVG block-stepping diagrams for ECB, CBC, CTR, and GCM.
   - "Which mode should I use?" guided decision wizard.

5. **AES Learning Center**
   - Bite-sized cards explaining symmetric cryptography, block size invariants, and round structures.
   - **Interactive PKCS#7 Padding Visualizer:** Type any text to see real-time block division and padding byte values.
   - Cryptographic glossary with interactive `<Term>` hover cards.

6. **Knowledge Quiz**
   - 20-question randomized multiple-choice bank across core cryptography topics.
   - Instant feedback with mathematical and conceptual explanations.
   - LocalStorage persistence for attempts and high scores.

7. **Cryptographic Verification Suite**
   - Built-in automated runner executing official **FIPS-197** Appendix B and **NIST SP 800-38A / 800-38D** Known-Answer Tests (KATs).
   - Independent OpenSSL CLI commands to reproduce and cross-verify results.

---

## 🔒 Cryptographic Architecture & Standards

- **Zero Simulated Crypto:** Every ciphertext, tag, and hash shown in this app is computed using real cryptography.
- **Web Crypto API (`crypto.subtle`):** Powers AES-CBC, AES-CTR, and AES-GCM directly in the browser's native engine.
- **Noble Ciphers (`@noble/ciphers`):** Audited implementation used for AES-ECB (which Web Crypto does not provide) and single-block mathematical cross-verification.
- **CSPRNG Only:** Randomness is strictly derived from `crypto.getRandomValues()`. `Math.random()` is never used for any cryptographic material.
- **Volatile In-Memory Keys:** Secret keys are held in RAM only and are never persisted to `localStorage` or transmitted over the network.
- **No Backend / 100% Offline:** Zero external network calls or CDNs at runtime.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm (or npm / yarn)

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/AES-Encryption-Modes-Simulator.git
cd AES-Encryption-Modes-Simulator

# Install dependencies
pnpm install

# Start local development server
pnpm run dev
```

### Running Tests
```bash
# Run Vitest test suite (includes NIST KATs and round-trip tests)
pnpm run test
```

### Production Build
```bash
pnpm run build
pnpm run preview
```

---

## 🌐 Deployment

CryptoLab is packaged as a pure static Single-Page Application (SPA) with relative asset paths (`base: './'`) and `HashRouter`, meaning it can be hosted on any static web server:

### GitHub Pages
1. Build the production bundle: `pnpm run build`.
2. Push the contents of `dist/` to your `gh-pages` branch.

### Vercel / Netlify
1. Connect your repository.
2. Build command: `pnpm run build`.
3. Output directory: `dist`.

> **Note on Secure Contexts:** The Web Crypto API (`crypto.subtle`) is only enabled by modern browsers in a Secure Context (`https://` or `localhost`). If served over insecure plain `http://`, the app will display a friendly advisory banner.

---

## ⚠️ Honest Limitations & Educational Scope

- **For Learning Only:** Keys and intermediate blocks are intentionally exposed on screen for pedagogical transparency. Do not use this simulator to protect real secrets.
- **Image Pixel Pipeline:** The simulator encrypts raw RGB pixel buffers ($W \times H \times 3$) and wraps them back into an image frame so that visual patterns can be observed. Encrypting compressed files (such as `.png` or `.jpg` directly) corrupts container headers and hides patterns due to DEFLATE compression.

---

## 📄 License
MIT License. Created for academic and educational purposes.
