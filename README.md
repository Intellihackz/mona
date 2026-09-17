# MONA

Social copy trading on Monad.

Discover the wallets that are actually making money on Monad, follow one, and have
their trades mirrored into your own account automatically, within about a second.

Built for the Monad Metropolis hackathon (1 Sep to 13 Oct 2026), Track 01:
Onchain Finance & Trading.

## Why Monad

Copy trading does not work on slow chains. On Ethereum you are twelve seconds and a
frontrun behind the person you are copying, so the follower eats the slippage and the
strategy does not transfer. At 400ms blocks and 800ms finality, a mirrored trade lands
close enough to the original for the copy to mean something.

## Status

Project base. Auth, smart accounts and chain config are wired. Nothing is trading yet.

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 16, React 19, Tailwind 4 |
| Auth | Privy (embedded wallet as smart account signer) |
| Smart accounts | permissionless + Kernel v0.3.1, EntryPoint 0.7 |
| Bundler / paymaster | Pimlico |
| Chain | Monad (viem `monad` / `monadTestnet`) |

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

You need a Privy app id and a Pimlico bundler URL for Monad. The app boots without the
Pimlico URL, but no smart account is created.

## Planned architecture

- **App** (this repo): leaderboard, trader profiles, follow flow, follower dashboard
- **Indexer**: Envio HyperIndex over Monad to build trader performance from onchain
  history. Nansen API for smart-money labels.
- **Keeper**: a service watching followed leaders and submitting mirror trades via
  Kuru. Chainlink Automation is not confirmed on Monad, so this is self-run.
- **Limits**: per-trade cap, total budget ceiling, max slippage, token allowlist.
  Enforced before every copy. This is the product, not polish.
