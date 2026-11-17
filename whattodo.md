# ROLE
You are a senior full-stack engineer, cryptography engineer and UI/UX designer. Build "CryptoLab – AES Encryption Modes Simulator": a complete, working, 100% client-side educational web app. First produce an implementation plan, then build in the phases listed at the end. After each phase, run the app, test it in the browser, and fix problems before moving on.

# PRODUCT GOAL
A college project for "Cryptography and Information Security". It must be usable by a NON-computer-science student with zero crypto knowledge, while remaining technically correct enough to satisfy a cryptography examiner. It teaches why AES-ECB, AES-CBC, AES-CTR and AES-GCM exist, how they differ, why ECB leaks patterns, and why authenticated encryption (GCM) matters. It must be a REAL simulator: every ciphertext shown comes from a real AES computation. No fake or simulated cryptographic output anywhere.

# HARD CONSTRAINTS
- NO backend, NO API calls, NO accounts, NO analytics, NO runtime CDN links. Everything runs in the browser and works offline after build. Bundle fonts via @fontsource packages.
- Stack: React 18 + Vite + TypeScript + Tailwind CSS + react-router-dom (use HashRouter so it works on any static host) + lucide-react + @noble/ciphers + Vitest. Do NOT add Recharts or heavy UI kits. Set Vite `base: './'`.
- Web Crypto API (crypto.subtle) is used for AES-CBC, AES-CTR, AES-GCM. Web Crypto has no ECB, so ECB uses @noble/ciphers (check its current docs for the exact ECB/CBC API and the disablePadding option).
- Web Crypto needs a secure context: it works on localhost and https. Mention this in the README and show a friendly error banner if crypto.subtle is unavailable.
- Keys are held in memory only. Never write keys, plaintext or ciphertext to localStorage. localStorage may store ONLY learning progress and quiz scores.

# CRYPTOGRAPHY RULES (non-negotiable)
1. Randomness only from crypto.getRandomValues / crypto.subtle.generateKey. Math.random() must never be used for anything cryptographic. Add a test or lint check that greps src/ for Math.random in crypto code.
2. Key sizes 128/192/256 selectable. Keys are generated with a CSPRNG. Advanced users can paste their own hex key (validate length) behind an "Advanced" toggle with a short "for learning only" warning.
3. CBC: fresh random 16-byte IV for every encryption, PKCS#7 padding. CBC IV is random/unpredictable.
4. CTR: counter block = 96-bit random nonce || 32-bit counter starting at 0 (Web Crypto counter length 32). Fresh nonce for every encryption.
5. GCM: fresh random 96-bit nonce for every encryption, tagLength 128 bits, optional Additional Authenticated Data (AAD) field. Web Crypto appends the tag to the ciphertext, so split the last 16 bytes and display ciphertext and tag separately.
6. The UI must never let the user reuse a nonce/IV with the same key by accident. The code regenerates it on every Encrypt click. (A clearly red-labelled "Nonce Reuse Danger Demo" is allowed as an optional stretch feature only.)
7. ECB: noble ECB with PKCS#7 padding. Always show a red "Not for real use" badge on ECB.
8. Correct binary handling: Uint8Array everywhere, TextEncoder/TextDecoder for UTF-8, hex and Base64 helpers with validation, constant-time-irrelevant (educational) but no string concatenation of bytes.
9. Decryption errors are caught and shown in friendly language: GCM OperationError → "Authentication failed: this data was changed or the key is wrong. No plaintext released." CBC bad padding → "Invalid padding".
10. Be honest in the UI: confidentiality ≠ integrity ≠ authentication. State clearly that this is an educational tool, not for protecting real secrets, and that keys here are visible on screen on purpose.
11. Create src/crypto/ as a small, well-commented, UI-independent library: types.ts, random.ts, encoding.ts, aes.ts (encrypt/decrypt per mode returning {ciphertext, iv?, nonce?, tag?, paddingBytes, blocks}), and selftest.ts.
12. Add a Vitest suite with known-answer tests: FIPS-197 AES-128 vector (key 000102030405060708090a0b0c0d0e0f, plaintext 00112233445566778899aabbccddeeff, ciphertext 69c4e0d86a7b0430d8cdb78070b4c55a), plus the official NIST SP 800-38A vectors for ECB/CBC/CTR and official GCM test vectors. Copy values ONLY from the official published documents, cite the source in comments, and never invent vectors. Also add round-trip tests for all four modes (empty string, 1 byte, 15/16/17 bytes, multi-block, unicode), a Web Crypto vs noble cross-check for CBC, and a test that flipping any ciphertext byte or tag byte makes GCM decryption fail.
13. Expose the same tests in the UI as a "Verify" page (see sitemap).

# VISUAL DESIGN: BRIGHT, CLEAN, FRIENDLY
Premium modern SaaS look (think Linear/Stripe/Vercel docs but LIGHT and approachable), not a "hacker" look.
- Background #F8FAFC, cards #FFFFFF with 1px #E2E8F0 border, radius 12px, very soft shadows. Text #0F172A, muted text #475569.
- Primary blue #2563EB, secondary violet #7C3AED, success emerald #059669 (tint #ECFDF5), danger red #DC2626 (tint #FEF2F2), warning amber #D97706 (tint #FFFBEB).
- Mode colour identity used consistently everywhere (chips, diagrams, tabs): ECB orange #EA580C, CBC blue #2563EB, CTR violet #7C3AED, GCM emerald #059669. Red is reserved for tampering/security failures.
- Fonts: Inter for UI, JetBrains Mono for hex/bytes. Base font 16px, generous spacing, large click targets, clear visual hierarchy, WCAG AA contrast.
- Animations: subtle 150–250ms transitions, block-by-block reveal for encryption steps, smooth tab changes. Respect prefers-reduced-motion. 
- AVOID: dark theme, heavy gradients, glow effects, matrix/hacker imagery, clutter, emoji spam, tiny text.
- Desktop-first, but fully usable on tablet/mobile (hex grids scroll horizontally inside their own container).

# BEGINNER-FRIENDLY UX (very important)
- Every page starts with a one-sentence "What you'll learn here" and an everyday analogy: ECB = "a codebook where the same word always gets the same code"; CBC = "a chain where each block is mixed with the previous one"; CTR = "a long random-looking keystream generated from a counter and XORed with your data"; GCM = "CTR plus a tamper-evident seal".
- Glossary tooltips on every jargon term (key, IV, nonce, block, padding, tag, AAD, XOR, plaintext, ciphertext, authentication) via a reusable <Term> component.
- A "Beginner view / Detailed view" toggle: Beginner shows plain-language explanation; Detailed adds block diagrams and byte-level steps.
- One-click presets everywhere ("Try the ECB leak demo", "Try the tampering attack") so users never face an empty screen.
- A "What just happened?" panel after every operation, written in plain English with real values from that run.
- Friendly empty states, inline validation, no raw error dumps, a copy button next to every hex value, and hex displayed in colour-coded 16-byte blocks (one colour per block, block numbers shown).
- A guided path on the home page: 1 Learn → 2 Text Lab → 3 Image Lab → 4 Tamper Lab → 5 Quiz, with a progress indicator.

# SITEMAP / NAVIGATION
Top navigation bar (sticky, light) with: Home, Learn, Text Lab, Image Lab, Compare, Tamper Lab, Quiz, Verify. Routes: /, /learn, /text, /image, /compare, /tamper, /quiz, /verify. A shared <ModeSelector> (4 chips with colour + one-line description + safety badge) and <KeyPanel> are reused across labs.

# MODULES

## 1. Home / Dashboard
Hero: "See how AES really protects (and sometimes fails to protect) your data." Start button → guided path. Four mode cards (ECB/CBC/CTR/GCM) each with a one-line analogy and a safety badge. Progress tracker (modules visited + best quiz score, from localStorage). A rotating "Did you know?" card with only verifiably true facts (e.g., AES is the Rijndael cipher by Daemen and Rijmen, standardised by NIST in FIPS 197 in 2001; AES block size is always 128 bits). A "Everything runs in your browser — nothing is uploaded" trust note.

## 2. Learn (AES Learning Center)
Short scrollable cards, not walls of text: symmetric encryption basics; what AES is; block size is always 128 bits while the key is 128/192/256 bits (10/12/14 rounds); what a block cipher is and why modes are needed; IV vs nonce vs padding (PKCS#7 visual with example bytes); confidentiality vs integrity vs authentication. One simple static diagram of the AES round structure is enough. An interactive "Padding visualizer": type text, see it split into 16-byte blocks with padding bytes highlighted. (Optional stretch: SubBytes/ShiftRows/MixColumns/AddRoundKey animation. Skip it in the MVP.)

## 3. Text Encryption Lab
Layout: left = inputs, right = results.
- Inputs: plaintext box (preset examples including "ATTACKATDAWN!!!ATTACKATDAWN!!!ATTACKATDAWN!!!" to show ECB repeating blocks), mode selector, key size, key panel (Generate new key, copy, hex view; Advanced: paste own key), optional AAD field for GCM.
- Encrypt button → shows: key (hex), IV/nonce, ciphertext in colour-coded 16-byte hex blocks, authentication tag (GCM), padding bytes added, ciphertext length vs plaintext length, hex/Base64 toggle, and a copyable "package" (IV/nonce + ciphertext + tag).
- Decrypt button (uses the package currently shown, editable) with success/failure states.
- Step-by-step panel (Detailed view): split into blocks → pad → per-block operation for the chosen mode. For ECB and CBC compute the intermediate values with noble on single blocks (e.g., "P1 XOR IV → AES_K → C1") and show a green "Matches the Web Crypto result ✓" check by comparing against the full encryption. CTR shows the counter blocks, the keystream and the XOR. GCM shows nonce, counter blocks, ciphertext and the tag, explained at a conceptual level (GHASH over AAD + ciphertext) without pretending to recompute GHASH step by step unless actually implemented and verified.
- Repeated-block detector: highlights identical ciphertext blocks (lights up for ECB, never for the others).

## 4. Image Encryption Lab (main attraction)
- Upload an image (PNG/JPG/WebP) via drag-drop or file picker, or choose built-in sample images generated programmatically on a canvas (no copyrighted assets): a flat-colour shield/lock logo (best for the ECB demo), a simple gradient scene, and a pixel-art pattern.
- Pipeline: draw to an offscreen canvas, downscale so the longest side is ≤ 512 px (user option up to 1024), flatten transparency onto white (avoids premultiplied-alpha corruption), extract RGB bytes (width × height × 3), encrypt with the selected mode(s), then build a display image from the first width × height × 3 bytes of ciphertext with alpha 255. Padding and the GCM tag are excluded from the display but kept in the stored full ciphertext.
- Main view: "Encrypt with all 4 modes" button producing a grid: Original | ECB | CBC | CTR | GCM, all with the same key, each with a short caption (ECB: "Outline still visible!", others: "Looks like random noise"). Also support a single-mode large side-by-side view with a slider/compare toggle.
- Metrics per result: Shannon entropy of the bytes in bits/byte (max 8) and a small byte-value histogram (SVG or canvas). Explain that low-entropy/patterned output = leakage.
- Decrypt button restores the image from the stored full ciphertext and verifies pixel-exact equality with the original ("Perfect match ✓"). A "Decrypt with wrong key" toggle shows noise for ECB/CBC/CTR and an authentication failure for GCM.
- Downloads, with honest labelling: (a) "Encrypted preview (PNG)", labelled as a VISUALIZATION only, (b) "Encrypted package (.bin)" containing mode/IV/nonce/ciphertext/tag, which is the real decryptable output, with a "Load encrypted package" option to decrypt it again using the key, (c) "Decrypted image (PNG)".
- Educational callout "Why do we encrypt pixels instead of the PNG/JPEG file?": compressed formats already look random, contain headers that make the file unreadable once encrypted, and mix pixels in ways that hide the ECB pattern, so the classic ECB penguin-style demo needs raw pixel data. Include an optional toggle "Encrypt the raw file bytes instead" that shows the result is no longer a valid image.
- Handle large files without freezing the UI (show a progress/spinner, yield to the event loop), reject non-images, and show clear errors.

## 5. Mode Comparison
- A sortable/filterable comparison table: how it works, IV/nonce requirement, padding required, authentication provided, parallelisable encryption/decryption, effect of a modified ciphertext, strengths, weaknesses, appropriate use cases. Keep facts accurate: ECB never recommended; CBC is legacy and needs a separate MAC (encrypt-then-MAC) and has padding-oracle history; CTR gives confidentiality only and is malleable; GCM is the recommended default (authenticated encryption, nonce must never repeat per key).
- Interactive diagram per mode (SVG, in the mode colour) with a "step through block 1, 2, 3" control driven by real computed values for a short sample message.
- A "Which mode should I use?" mini decision helper that recommends GCM in nearly all cases and explains why.

## 6. Ciphertext Tampering Lab
- Pick plaintext (default: "Transfer Rs 100 to Alice. Ref: 12345678") and run it through ECB, CBC, CTR and GCM side by side with one shared key (separate IVs/nonces).
- Show each ciphertext as a clickable byte grid. Click a byte (or enter an offset) to flip bits or set a new value; tampered bytes turn red.
- Decrypt each: show (a) "What a real application's decrypt call returns" (Web Crypto result or the friendly error) and (b) for ECB/CBC a "Raw decrypted bytes (for learning)" view using noble in no-padding mode, so garbled plaintext is visible even when padding is invalid, with a "Padding valid? yes/no" indicator. Highlight changed plaintext characters in red.
- Expected, real behaviours to demonstrate: ECB: only that block garbled. CBC: that block becomes garbage and the SAME bit flips in the next block's plaintext (controlled corruption). CTR: exactly the same bit flips in the plaintext, nothing else (malleability). GCM: decryption fails with an authentication error, and NO plaintext is released.
- "Attacker mode" (the wow feature): for CTR, the user chooses a character position and the new character (e.g., change "100" to "900") and the app computes the XOR mask (old XOR new) and applies it to the ciphertext WITHOUT using the key; decryption then shows the forged message. The same attack on GCM is rejected. Explain in plain English that encryption alone does not stop modification.
- Also allow tampering with the GCM tag, nonce and AAD to show each causes failure.
- Explain why CBC and CTR have no built-in authentication and what a MAC/AEAD adds.

## 7. Knowledge Quiz
A bank of at least 20 accurate multiple-choice questions across: AES basics, modes, IV/nonce/padding, ECB leakage, tampering, GCM. 10 random questions per attempt, immediate feedback with a short explanation, per-topic score breakdown, best score and attempts saved in localStorage, retry wrong answers. Double-check every answer for cryptographic correctness.

## 8. Verify (trust page)
Runs the built-in known-answer tests in the browser and shows pass/fail with the official source named for each vector. Show a short "How we know this is real AES" explanation: Web Crypto is the browser's native implementation, noble is an audited library, and results are cross-checked. Optional: "Copy OpenSSL command" buttons that reproduce ECB/CBC/CTR outputs from the same key/IV (OpenSSL `enc` does not support GCM, so skip it for GCM).

# SUGGESTED FOLDER STRUCTURE
src/crypto/ (library + tests), src/components/ (ModeSelector, KeyPanel, HexBlocks, Term, Callout, StepPanel, Diagram components), src/pages/ (Home, Learn, TextLab, ImageLab, Compare, Tamper, Quiz, Verify), src/data/ (glossary, quiz questions, comparison data), src/lib/ (image/canvas helpers, entropy), src/styles/. Keep crypto logic out of React components.

# QUALITY BAR AND ACCEPTANCE CRITERIA
- `npm run dev`, `npm run build`, `npm run preview` and `npm run test` all succeed with no TypeScript errors.
- All known-answer tests and round-trip tests pass; Math.random does not appear in crypto code.
- ECB visibly leaks the shape of the sample logo while CBC/CTR/GCM look like noise; entropy numbers reflect this.
- Every decrypt round-trips exactly (text and image pixel-exact).
- GCM rejects any modified ciphertext, tag, nonce or AAD; CTR attacker mode really forges the message without the key.
- No network requests at runtime (verify in the browser's Network tab).
- Fully usable by a first-time non-technical user in under 2 minutes using only presets and buttons.
- Accessible: keyboard navigable, visible focus states, labelled controls, alt text.

# DO NOT
- Do not fake, hardcode or simulate any ciphertext, IV, tag or pass/fail result.
- Do not use Math.random for crypto, reuse GCM nonces, or use a tag shorter than 128 bits.
- Do not add a backend, database, login, or external API.
- Do not use a dark theme, heavy gradients, glowing effects or hacker imagery.
- Do not claim the app is suitable for protecting real secrets.
- Do not silently catch errors; show friendly messages.

# BUILD PHASES (verify each in the browser before continuing)
Phase 1: project setup, design tokens, layout/navigation, shared components, crypto library + Vitest known-answer tests.
Phase 2: Text Lab (with step-by-step view and repeated-block detector).
Phase 3: Image Lab with all-modes grid, entropy, decrypt verification, downloads.
Phase 4: Tampering Lab including attacker mode.
Phase 5: Compare, Learn, Quiz, Home dashboard, Verify page.
Phase 6: polish (animations, tooltips, beginner/detailed toggle, accessibility, responsive), README (setup, how to deploy to Vercel/Netlify/GitHub Pages, cryptographic design notes and honest limitations), and a short VIVA_NOTES.md.

At the end, give me a summary of what was built, test results, and anything you could not complete.

NO BACKEND
SIMPLE WORKIING FRONTEND