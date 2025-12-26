# ZyFAI SDK + Reown Demo

This Vite application shows how to pair the ZyFAI TypeScript SDK with [Reown AppKit](https://reown.com/) so you can connect an EOA wallet, fetch protocols, inspect positions, deploy a Safe, and create session keys directly from the browser.

The demo lives in `sdk-demo/` (sibling to `zyfai-sdk/`) and consumes the local `@zyfai/sdk` build via a file dependency, so any code changes in the SDK are immediately reflected in the UI after running `pnpm build` in the SDK root.

## 1. Environment Variables

Copy `env.example` and provide your own keys:

```bash
cp env.example .env
```

| Variable                        | Description                                       |
| ------------------------------- | ------------------------------------------------- |
| `VITE_WALLETCONNECT_PROJECT_ID` | WalletConnect / Reown project ID                  |
| `VITE_ZYFAI_API_KEY`            | ZyFAI data API key (use the DATA key for staging) |
| `VITE_DEFAULT_CHAIN_ID`         | Optional chain to pre-select (8453 = Base)        |

## 2. Install & Run

```bash
pnpm install          # already executed once during scaffolding
pnpm dev              # start Vite dev server on http://localhost:5173
```

Ensure the root SDK has been built (`pnpm build` in the repo root) so the latest dist bundle is available to the demo.

## 3. What the UI Does

- Initializes Reown AppKit with the same network list as the SDK (Base, Arbitrum, Plasma)
- Prompts the user to connect a wallet via AppKit and binds it via `sdk.connectAccount(walletClient)`
- Resolves deterministic Safe addresses (even if they are not deployed yet) via `getSmartWalletAddress`
- Deploys Safes on demand through `deploySafe`
- Creates + registers session keys through `createSessionKey` (sign + `/session-keys/add`)
- **Deposits funds** into the ZyFAI smart wallet via `depositFunds` (with preset token buttons for USDC/WETH per chain)
- **Withdraws funds** from the ZyFAI smart wallet via `withdrawFunds` (full or partial, with optional receiver)
- Fetches data helpers:
  - `getAvailableProtocols(chainId)`
  - `getPositions(userAddress, chainId)`
  - `getEarnings(userAddress, chainId)`

This flow lets you verify the complete SDK lifecycle - Safe deployment, session key creation, fund management (deposit/withdraw), and data retrieval - for both existing users (with active positions) and brand-new wallets against the staging ZyFAI backend.
