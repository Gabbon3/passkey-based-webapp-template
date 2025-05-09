# CKE – Cookie Key Encryption

**CKE** (Cookie Key Encryption) is a lightweight, stateless client-side encryption strategy designed to protect data stored in the browser (e.g. `localStorage`) by splitting cryptographic material across two isolated locations: a secure cookie and client-side storage.

## 🔐 Core Concept

CKE ensures that no single surface (cookie or localStorage) holds enough information to reconstruct the encryption key. Instead, the final key is derived at runtime via HKDF, using:
- cookieMaterial – 32 bytes of random data stored in a Secure, HttpOnly cookie
- localMaterial – 32 bytes of random data stored in localStorage (or similar client-only storage)
The combination of these two inputs creates a derived key that can be used to encrypt/decrypt sensitive data in the browser, such as session tokens or shared secrets (e.g., in conjunction with PULSE).

## 📋 Usage Workflow
1. On successful authentication:
    - Server generates cookieMaterial (32 bytes) and sends it via Set-Cookie as an HttpOnly Secure cookie.
    - Client generates localMaterial (32 bytes) and stores it locally.
2. Key derivation:
    - The client combines the two with: 
        ```js
        derived_key = HKDF(cookieMaterial, localMaterial)
        ```
3. Storage:
    - Sensitive data (e.g. shared key, configuration, auth state) is encrypted with the derived_key before being stored in localStorage.
4. At session resume:
    - If both cookieMaterial (via cookie) and localMaterial (in localStorage) are available, the derived key can be rebuilt, and the encrypted data decrypted.

## 🌐 Stateless by Design

CKE is fully stateless:
- The server does not store cookieMaterial, only sends it.
- All state needed to derive the key is held betw****een client + cookie.
- Session persistence relies on secure cookie scope and client retention.

## 🔒 Security Advantages

- 🧱 Layered isolation: each piece alone is useless to an attacker.
- 🛑 XSS-resistant: malicious scripts can't access HttpOnly cookies.
- 🕵️‍♂️ Cookie theft-resistant: cookies alone reveal nothing without client-side localMaterial.
- 🔐 No cleartext key anywhere. The derived key exists only in memory.

## 🧩 Integration with PULSE

When combined with PULSE:
- CKE can be used to encrypt the shared_key locally, ensuring it is only decryptable when both cookie and local material are present.
- Adds a local security layer without modifying the core PULSE protocol.
- CKE remains optional and modular.

## ⚙️ Server Requirements

CKE needs only two simple endpoints:
- __POST__ `*/cke`: generates and returns the cookieMaterial as a cookie.
    - Protected by a middleware of choice (e.g., JWT validation, passkey challenge).
- __UPDATE__ `*/cke`: return old cookieMaterial and generates new one.
    - Protected by a middleware of choice (e.g., JWT validation, passkey challenge).
- __GET__ `*/cke`: verifies cookie presence or returns minimal client state.
    - Used for client-side logic (e.g., determining whether to re-initialize the key).

No storage or session management is needed on the server.

## 🧠 Summary

CKE is a portable, simple, and effective way to protect browser-side storage with layered encryption logic. It works great on its own, and even better when combined with session protocols like PULSE.

> Protect your client. Encrypt the secret. Don't trust the environment.