# SHIv (Session Handshake w/ Integrity Verification)

SHIv è un sistema di autenticazione moderno e modulare che sostituisce il classico schema access/refresh token con un approccio più semplice, sicuro e legato al contesto.

Ogni sessione è rappresentata da un JWT "fisso", contenente `user_id` e `kid`. Il token viene firmato con una chiave derivata per-sessione via HKDF, usando un segreto condiviso generato tramite ECDH. La firma è legata all’utente ma anche isolata per ogni sessione, grazie a un pepper segreto del server.

Il `kid` visibile nel JWT è un UUID, ma nel database è salvato in forma HMAC(kid, pepper), per impedire collegamenti diretti in caso di leak.

Le richieste sono protette da un header `X-Integrity`, che serve a garantire che siano effettivamente prodotte da un client autorizzato, e che il contenuto non sia stato alterato. Questo header è formato da un `salt` random (12 byte) e da una firma HMAC del corpo della richiesta (o di `salt` solo, nel caso di GET). La chiave HMAC è derivata dallo stesso segreto condiviso, combinato al `salt` e a una finestra temporale di 2 minuti tramite HKDF.

Il JWT viene mantenuto in un cookie `HttpOnly`, `Secure`, `SameSite=Strict`. Il segreto condiviso invece è conservato nel browser in forma cifrata, tramite il protocollo **CKE** (Cookie Key Encryption).

---

# CKE (Cookie Key Encryption)

CKE è un sistema per proteggere chiavi simmetriche in locale, dividendo il materiale tra:

- **Local Material**: salvato nel localStorage
- **Cookie Material**: salvato in cookie `HttpOnly`

Il client combina questi materiali con HKDF per derivare una chiave che permette di cifrare/decriptare i dati salvati in locale (es. il `shared_secret` della sessione).

CKE è diviso in due livelli:

- **Basic**: la chiave è derivata da `HKDF(cookie_material, local_material)`
- **Advanced**: viene richiesta una verifica WebAuthn/Passkey per ottenere una seconda chiave cookie, invisibile al client. Dopo la verifica, il server restituisce `HKDF(cookie_1, cookie_2)` e il client la unisce con `local_material` per ottenere la chiave finale.

Ogni CKE è isolato per dispositivo. È possibile ruotare i materiali, con supporto alla migrazione criptata.

---

# SPT (SHIv Privileged Token)

SPT sono access token di breve durata, usati per operazioni sensibili. Sono firmati con la stessa chiave della sessione (`PK`) e generati solo dopo una verifica passkey. Includono scope e autorizzazioni granulari, ma non sostituiscono il JWT della sessione.

---

# Considerazioni

SHIv è progettato per garantire autenticazione contestuale, integrità delle richieste, e isolamento per dispositivo, senza dover gestire refresh token, rotazioni di chiavi complesse o flussi esterni. Il replay è tecnicamente possibile entro la finestra temporale, ma il rischio è minimo. Il sistema è più sicuro e flessibile della maggior parte degli schemi JWT tradizionali, pur restando leggero e comprensibile.