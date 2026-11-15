<!-- path: README.md -->
<!-- purpose: Setup, configuration, architecture and security notes for the GhostDesk monorepo. -->
# GhostDesk

An encrypted vault for your own computer. Open it with a 5x5 pattern **and** a passphrase.

```
apps/desktop      Tauri 2 + Rust core + Vite/React UI (the vault)
apps/web          Next.js site, Paystack checkout + webhook, license API (Prisma + Postgres)
packages/shared   Passphrase policy, plan catalogue, PatternPad component
```

## What is implemented

- Pattern (min 6 dots) + passphrase (14 to 17 chars, lowercase, 2+ capitals, number, symbol, space) with live rules, confirm field and eye toggle.
- Argon2id (128 MiB, t=3, p=4) derives the key; the random master key is wrapped twice (credentials, recovery key). Files use XChaCha20-Poly1305 STREAM in 1 MiB chunks with a per-file key; the manifest is encrypted too.
- Persistent unlock throttle (30 s after every 3rd failure, doubling, 1 h cap) for unlock and recovery.
- Recovery key (100 bits). Using it forces new credentials and a new recovery key; "Renew recovery key" re-authenticates and retires the old key permanently.
- Decoy vault: a second vault with its own pattern and passphrase. Both vaults live in two indistinguishable key slots; unlock tries both in constant work, so timing and file layout don't reveal a decoy. The decoy can't see the main vault.
- Encrypted backup: one `.gdbackup` file (Argon2id-protected manifest + the already-encrypted files), restorable on any computer without a server; every restored file is verified.
- Sections you name, encrypted import (picker and drag-and-drop with progress), in-memory viewer (images, video, audio, PDF via pdf.js, text), export, delete.
- Auto-lock **only on inactivity**. Imports, exports, decrypting and playing media count as activity. After the idle time an alert dialog counts down 30 s: **Cancel** keeps the vault open, **Confirm** locks now; reaching zero locks.
- Panic lock: footer button, in-app Ctrl+Shift+L and an OS-level global shortcut handled in Rust.
- Responsive layout: the sidebar is a fixed column from 1024 px; below that it is an off-canvas drawer opened by the hamburger button.
- Licensing: Ed25519-signed tokens verified offline; read-only mode after a lapse (open, view, export; no adding); the lapse notice appears only then.
- Website: landing page, pricing dialog (prices appear only there), Paystack Popup checkout, signature-verified webhook, license emails (Resend), device limit (3), subscription management link.

## Not included

Video seeking beyond in-memory playback is limited by memory (previews are capped at 512 MiB). Have the Privacy Policy and Terms pages reviewed by a lawyer for your business before launch.

## Setup

Prerequisites: Node 20+, pnpm 9, Rust stable, Tauri 2 platform prerequisites, PostgreSQL. Full walkthrough: how-to-run.txt.

```bash
pnpm install
pnpm keys                      # prints LICENSE_SIGNING_KEY and GHOSTDESK_LICENSE_PUBLIC_KEY
cp apps/web/.env.example apps/web/.env   # fill it in
pnpm plans                     # creates the USD 5 weekly and USD 20 quarterly plans on Paystack
pnpm --filter @ghostdesk/web db:push
pnpm dev:web
```

Paystack dashboard: add `https://YOUR-DOMAIN/api/webhooks/paystack` as the webhook URL and generate a webhook signing secret (`PAYSTACK_WEBHOOK_SECRET`). Confirm your account can charge in USD.

Desktop app:

```bash
cd apps/desktop
cp .env.example .env           # VITE_WEB_URL
export GHOSTDESK_API_BASE=https://YOUR-DOMAIN
export GHOSTDESK_LICENSE_PUBLIC_KEY=<from pnpm keys>
pnpm tauri icon app-icon.svg   # one-time: generates src-tauri/icons
pnpm tauri dev                 # or: pnpm tauri build
cd src-tauri && cargo test     # crypto and policy tests
```

## Security notes

- Hiding is not protection: contents are protected by authenticated encryption; the threat model is casual access, shared or stolen devices. It does not defend against malware, a compromised OS or forensic analysis of a running machine.
- Lock-outs slow guessing inside the app only. An attacker who copies the vault folder can guess offline; the 128 MiB Argon2id cost and the passphrase are what resist that.
- Decrypted bytes exist in memory while viewing or exporting. Exports are plaintext copies by design.
- License checks are client-side; a determined user can patch the binary. The server never sees files or vault metadata.
