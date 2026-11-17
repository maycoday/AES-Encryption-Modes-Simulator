# CryptoLab – Comprehensive Viva & Oral Exam Guide
## Subject: Cryptography and Information Security (AES & Encryption Modes)

This guide contains the essential questions, technical explanations, mathematical formulations, and examiners' favorite "trap" questions regarding AES and its modes of operation.

---

### Q1. What is the difference between a block cipher and a mode of operation?
- **Block Cipher:** A deterministic cryptographic primitive that takes a fixed-size block of plaintext (for AES, exactly 128 bits / 16 bytes) and a secret key, producing a fixed-size block of ciphertext: $C = E_K(P)$.
- **Mode of Operation:** An algorithm that describes how to repeatedly apply a block cipher to encrypt arbitrary-length messages securely (e.g., files, streams, or network packets).

---

### Q2. [EXAMINER TRAP] What is the AES block size when using AES-256?
- **Answer:** **128 bits (16 bytes).**
- **Explanation:** The block size in AES is **always 128 bits**, regardless of whether the key is 128, 192, or 256 bits. The key size changes only the number of rounds:
  - 128-bit key $\rightarrow$ 10 rounds
  - 192-bit key $\rightarrow$ 12 rounds
  - 256-bit key $\rightarrow$ 14 rounds
*(Note: The original Rijndael cipher allowed variable block sizes in increments of 32 bits, but NIST standardized FIPS 197 specifically with a fixed 128-bit block size).*

---

### Q3. Why is ECB (Electronic Codebook) mode insecure? What is the "ECB penguin"?
- **Mechanism:** ECB encrypts each 16-byte block independently: $C_i = E_K(P_i)$.
- **Flaw:** Identical plaintext blocks $P_i = P_j$ always yield identical ciphertext blocks $C_i = C_j$ under the same key.
- **Consequence:** Structural patterns, repetitive headers, and identical pixel clusters in images are preserved in the ciphertext. The famous "ECB penguin" demo shows that encrypting the Linux Tux penguin bitmap in ECB mode leaves Tux's outline clearly visible.

---

### Q4. How does CBC (Cipher Block Chaining) work, and does the IV need to be secret?
- **Encryption Equation:**
  - $C_1 = E_K(P_1 \oplus \text{IV})$
  - $C_i = E_K(P_i \oplus C_{i-1})$ for $i \ge 2$
- **Decryption Equation:**
  - $P_1 = D_K(C_1) \oplus \text{IV}$
  - $P_i = D_K(C_i) \oplus C_{i-1}$ for $i \ge 2$
- **IV Requirements:** The IV **does NOT need to be secret**, but it **MUST be unpredictable (CSPRNG generated) and unique** for each message encrypted under the same key. If the IV is predictable, CBC is vulnerable to chosen-plaintext attacks (e.g., the BEAST attack on TLS 1.0).

---

### Q5. What happens if a single bit is flipped in a CBC ciphertext block?
If bit $j$ in block $C_i$ is flipped:
1. **Block $i$:** $P_i = D_K(C_i) \oplus C_{i-1}$. Because the input to the non-linear block cipher $D_K$ is modified, the avalanche effect scrambles the entire 16 bytes of block $P_i$ into pseudo-random garbage.
2. **Block $i+1$:** $P_{i+1} = D_K(C_{i+1}) \oplus C_i$. Because $C_{i+1}$ is intact, $D_K(C_{i+1})$ decrypts cleanly. The flipped bit in $C_i$ passes directly through the final XOR step, flipping **the exact same bit $j$ in $P_{i+1}$**.
3. **Subsequent blocks ($i+2 \dots$):** Completely unaffected.

---

### Q6. How does CTR (Counter) mode turn a block cipher into a stream cipher?
- **Mechanism:** AES is never used to encrypt the plaintext directly. Instead, AES encrypts successive counter blocks:
  $$\text{Counter}_i = \text{Nonce} \parallel i$$
  $$\text{Keystream}_i = E_K(\text{Counter}_i)$$
  $$C_i = P_i \oplus \text{Keystream}_i$$
- **Advantages:**
  - Encryption and decryption are mathematically identical (only $E_K$ is needed, reducing hardware/silicon footprint).
  - Fully parallelizable for both encryption and decryption.
  - Zero padding required (ciphertext length equals plaintext length).
  - Random read/write access to arbitrary byte offsets.

---

### Q7. What is the catastrophic risk of Nonce Reuse in CTR mode?
If the same key and nonce are used for two messages $A$ and $B$:
$$C_A \oplus C_B = (P_A \oplus \text{Keystream}) \oplus (P_B \oplus \text{Keystream}) = P_A \oplus P_B$$
The keystream completely cancels out! An attacker knowing the XOR of two plaintexts can use frequency analysis and crib-dragging to recover both original messages without ever breaking the key.

---

### Q8. What is malleability, and why is CTR mode malleable?
- **Malleability:** The ability of an attacker to modify a ciphertext such that it decrypts into a related, predictable plaintext without knowing the secret key.
- **Example in CTR:** Since $C_i = P_i \oplus K_i$, an attacker who knows that $P$ contains `"100"` can XOR the corresponding ciphertext bytes with `("100" ⊕ "900")`. On decryption, the recipient receives `"900"`.
- **Takeaway:** Encryption guarantees **confidentiality**, NOT **integrity**.

---

### Q9. What is AEAD, and how does AES-GCM work?
- **AEAD (Authenticated Encryption with Associated Data):** A scheme that simultaneously guarantees confidentiality, integrity, and authenticity.
- **AES-GCM Construction:**
  1. **Confidentiality:** Uses CTR mode to encrypt plaintext.
  2. **Authenticity:** Computes a polynomial evaluation MAC (**GHASH**) over the Galois field $GF(2^{128})$ using a hash key $H = E_K(0^{128})$.
  3. **Tag Masking:** The GHASH output is masked with $E_K(J_0)$ (where $J_0$ is the initial counter derived from the nonce) to produce a 128-bit authentication tag.
  4. **Associated Data (AAD):** Additional headers or metadata included in the GHASH tag but transmitted in plaintext.

---

### Q10. What is PKCS#7 padding, and what happens if data is already block-aligned?
- **Rule:** If $L$ is the message length and $B=16$ is the block size, the number of padding bytes added is:
  $$\text{padLength} = B - (L \pmod B)$$
  Each padding byte has the value equal to $\text{padLength}$.
  - E.g., if 3 bytes are missing, append `0x03 0x03 0x03`.
  - If 1 byte is missing, append `0x01`.
- **Aligned Case:** If the message is already an exact multiple of 16 bytes, a **full 16-byte block of `0x10` (16 in decimal)** is appended.
- **Why?** Otherwise, the recipient cannot differentiate between legitimate message bytes ending in values $1..16$ and padding bytes!

---

### Q11. What is a Padding-Oracle Attack on CBC mode?
- If an application's server decrypts CBC ciphertext and reveals whether the PKCS#7 padding was valid or invalid (via timing differences or distinct HTTP error codes), an attacker can use this "oracle" to decrypt any ciphertext block byte-by-byte without knowing the key!
- **Solution:** Use AEAD modes like AES-GCM, or verify an HMAC over the ciphertext before attempting decryption (Encrypt-then-MAC).

---

### Q12. Summary Comparison Cheat-Sheet for Examiners

| Property | AES-ECB | AES-CBC | AES-CTR | AES-GCM |
| :--- | :--- | :--- | :--- | :--- |
| **Type** | Block | Block | Stream | Stream + AEAD |
| **IV / Nonce** | None | 16-byte random IV | 12-byte unique nonce | 12-byte unique nonce |
| **Padding** | PKCS#7 (1-16 B) | PKCS#7 (1-16 B) | None | None |
| **Parallel Encrypt** | Yes | No (sequential) | Yes | Yes |
| **Parallel Decrypt** | Yes | Yes | Yes | Yes |
| **Integrity** | ❌ None | ❌ None | ❌ Malleable | ✅ 128-bit Tag |
| **Recommended?** | ❌ NEVER | ⚠️ Legacy only | ⚠️ Only with MAC | ✅ DEFAULT for all modern apps |
