# Security Policy

## Supported version

Only the latest `main` branch — deployed at the URL in the repo description — is supported with security fixes.

## Reporting a vulnerability

Use GitHub's **private vulnerability reporting**: Security tab → "Report a vulnerability".

Please include reproduction steps and, if possible, the affected route or file. Do not open public issues for security reports. You can expect an acknowledgement within 48 hours.

## In scope

- This Next.js application and its API routes (`app/api/**`, `middleware.ts`, `lib/**`)
- Dependency vulnerabilities (Dependabot alerts are monitored and should stay at zero for critical/high)

## Out of scope

- Device-owner tampering with client-side storage: BYOK keys live in your browser's localStorage by design, and sources live in IndexedDB by design
- Issues on Google's side of the Gemini API
- The archived `legacy-streamlit/` app (local-use only, no server)

## Data handling summary

| Data | Where it lives | Leaves the browser? |
|---|---|---|
| Sources, chunks, embeddings | IndexedDB (your browser) | Never uploaded to the server |
| Retrieved excerpts (top-6 per question) | — | Sent to Google's Gemini API to compose the answer |
| Your API key (BYOK) | localStorage (your browser) | Sent per-request to Google via the app's API routes |
| Server API key (owner) | Server env vars only | Used only when `ALLOW_SERVER_KEY` is enabled |
