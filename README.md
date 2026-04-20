# Launchmate

Launchmate is an agentic AI technical cofounder for first-time founders, student builders, and non-technical entrepreneurs.

Instead of behaving like a raw chatbot, it creates a founder workspace with:

- project memory
- specialist agents for product, CTO, growth, and critic roles
- a decision ledger
- a validation queue
- a 7-day founder sprint
- a submission pack for demo framing and challenge storytelling

## Run locally

```bash
node server.js
```

Then open [http://127.0.0.1:4173](http://127.0.0.1:4173).

## OpenAI mode

If you want real multi-agent synthesis instead of the local fallback:

```bash
set OPENAI_API_KEY=your_key_here
node server.js
```

Optional:

```bash
set OPENAI_MODEL=gpt-4o-mini
```

If no API key is present, the frontend automatically falls back to an in-browser demo engine so the product is still usable.

## Vercel deployment

This repo is Vercel-friendly:

- static frontend from the project root
- serverless API route at `api/workspace.js`
- optional OpenAI live mode through environment variables

Recommended deployment steps:

```bash
vercel
```

Then set:

```bash
OPENAI_API_KEY
OPENAI_MODEL
```

If `OPENAI_API_KEY` is not set, the deployed app still works in polished demo mode using the local frontend fallback.
