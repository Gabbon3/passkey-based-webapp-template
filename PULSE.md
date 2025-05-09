# PULSE – Persistent User Login with Symmetric Encryption

**PULSE** is a modern, session-centric authentication protocol designed to replace the traditional access/refresh token model. It leverages derived symmetric encryption to deliver secure, persistent, and verifiable user sessions without the need for token juggling.

## Key Features

- ✅ Long-lived sessions without refresh tokens
- 🔑 Shared keys are never transmitted
- 🔁 One-time derived keys per request using HKDF + salt + time window
- 🛡️ Built-in request integrity via AES-GCM
- 🔄 Automatic key rotation
- 🧹 Easy revocation via session_id
- 🧠 Seamless UX: log in once, stay authenticated

## Architecture Overview

1. __ECDH Handshake__
    - Client and server exchange public keys to generate a shared symmetric key (shared_key)
    - Server returns a signed JWT (HMAC-SHA256) containing session_id, user_id, and roles
    - Client stores shared_key in localStorage, JWT in HttpOnly cookie
2. __Per-Request Derived Key__
    - For each request, the client generates:
        - A random salt (12 bytes)
        - A time window identifier (e.g., every 2 minutes)
        - A derived_key using HKDF(shared_key, salt, time_window)
    - The client encrypts a header X-Integrity using AES-GCM with the derived_key
3. __Server Verification__
    - The server retrieves the shared_key from the session
    - It attempts decryption using the derived key over multiple time windows (current, -1, +1)
    - If decryption succeeds, the request is valid

## No Refresh Tokens

PULSE eliminates the need for refresh tokens entirely:
- No separate refresh logic on the client
- No refresh endpoints to secure
- Sessions managed directly via session_id and key rotation

## Session Revocation

Sessions can be revoked or cleared through:
- Removing the session entry by session_id
- Global logout using user_id
- Periodic cleanup of stale or inactive sessions

## Integration

PULSE is backend-agnostic and works with any architecture supporting:
- ECDH key exchange
- AES-GCM encryption
- HKDF (SHA-256)

## Database Considerations

To protect backend persistence, PULSE supports hashing session IDs with HMAC and a __server-side pepper__.
Store only the hashed session ID in your database. This reduces the risk of an attacker correlating session tokens in a data breach.

### Example schema
```sql
create table auth_keys (
	kid varchar(64) primary key not null,
	secret varchar(64) not null,
	user_id uuid not null,
	last_seen_at timestamp,
	created_at timestamp not null
);
-- faster query
create index idx_auth_keys_kid_hash on auth_keys using hash(kid);
-- unique safe
create unique index idx_auth_keys_kid_unique on auth_keys(kid);
```
During a request:
- Extract session_id from JWT
- Hash it using the server pepper
- Perform lookup using the hashed value

To revoke: delete using hashed_session_id.

## Open by Design

There is no vendor lock-in or proprietary dependency:
- No required SDKs
- No centralized authorization server
- Implementation relies only on standard crypto libraries