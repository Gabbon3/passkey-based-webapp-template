# SHIV – Session Handshake w/ Integrity Verification

**SHIV** is a modern, session-centric authentication protocol designed to replace the traditional access/refresh token model. It leverages derived symmetric encryption to deliver secure, persistent, and verifiable user sessions without the need for token juggling.

## Key Features

- ✅ Long-lived sessions without refresh tokens
- 🔑 Shared keys are never transmitted
- 🔁 One-time derived keys per request using HKDF + salt + time window
- 🛡️ Built-in request integrity via AES-GCM
- 🔄 Automatic key rotation
- 🧹 Easy revocation via session_id
- 🧠 Seamless UX: log in once, stay authenticated
- 📉 Device-level session tracking (optional, minimal data)
- 🌌 Per-session JWT signing keys (no global signing key needed)

## Architecture Overview

1. __ECDH Handshake__
    - Client and server exchange public keys to generate a shared symmetric key (shared_key)
    - Server returns:
        - Its public key
        - A signed JWT (HMAC-SHA256) containing: kid (session ID - UUID v4), uid, roles, etc.
    - Client stores:
        - The shared_key (encrypted via CKE or similar)
        - The JWT in an HttpOnly cookie
2. __Derived Key per Request__
    - For each request, the client:
        - Generates 12 random bytes
        - Computes time window (every 2 minutes)
        - Derives a derived_key using HKDF(shared_key, pepper, time window)
        - Encrypts a that 12 random bytes + nonce with AES-GCM using the derived_key
        - Sends the JWT as Bearer and the encrypted integrity block in X-Integrity
    - The client encrypts a header X-Integrity using AES-GCM with the derived_key
3. __Server Verification__
    - Server extracts kid from JWT
    - Retrive the key from cache or db deriving key identificator with HMAC(kid, pepper)
    - Attempts decryption over multiple time windows (current, -1, +1)
    - If decryption succeeds, request is verified

## JWT Signing

- JWTs are signed using an HMAC key derived from the shared_key and pepper
- Signature key = HKDF(shared_key, pepper, "jwt-signing")
- Each session has a unique signing key, eliminating the need for a central JWT secret

## Shiv Privileged Token (SPT)

- Short-lived elevated access token (e.g., 5 minutes)
- Generated via passkey or secure re-authentication
- Signed with HKDF(shared_key, pepper, "spt-signing")
- Used to authorize critical operations (e.g., session management, 2FA setup)

## Clean Login Logic

- If client has stale JWT (session removed), next login wipes it automatically before issuing a new session
- Prevents orphan sessions from piling up

## Database Considerations

To protect backend persistence:
- Store kid as HMAC(kid, pepper)
- This ensures attacker can't link JWT to a database entry if compromised

### Example schema
```sql
CREATE TABLE auth_keys (
    kid varchar(64) PRIMARY KEY,
    secret varchar(64),
    user_id UUID not null,
    device_name varchar(20) null,
    device_info varchar(100) not null,
    last_seen_at TIMESTAMP,
    created_at TIMESTAMP,
    constraint fk_auth_keys_user_id foreign key (user_id) references public.user(id)
);
-- faster query
create index idx_auth_keys_kid_hash on auth_keys using hash(kid);
-- unique safe
create unique index idx_auth_keys_kid_unique on auth_keys(kid);
```

## Session Revocation and Management

- Sessions stored in RAM and in a database
- Users can view and revoke individual sessions
- Revocation simply deletes the session key and removes from memory
- Logout removes current session
- Global logout deletes all sessions for the user

## Integration

SHIV is backend-agnostic and works with any architecture supporting:
- ECDH key exchange
- AES-256-GCM encryption
- HKDF (SHA-256)
- Optional: WebAuthn, OTP, CKE for local key protection

## Open by Design

There is no vendor lock-in or proprietary dependency:
- No required SDKs
- No centralized authorization server
- Implementation relies only on standard crypto libraries