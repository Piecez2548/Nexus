# Nexus

A local-first personal finance, trading journal, and productivity app. Transactions, budgets, savings goals, trading positions, an investment portfolio, todos, habits, and a recurring daily schedule — all stored on-device, with an optional end-to-end-encrypted sync layer for multi-device use. A rule-based "AI Analytics" engine computes financial health scores, behavior insights, forecasts, and recommendations entirely on-device — no LLM, no network calls.

## Getting started

```bash
npm install
npm run dev          # Vite dev server, http://localhost:5173
```

The app works fully offline with no `.env` file — cloud sync and error monitoring are both optional and no-op cleanly when unconfigured.

## Documentation

Full documentation — architecture, every feature module, database schema, security model, roadmap, and more — lives in [`/docs`](docs/README.md).
