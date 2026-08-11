# Scratchpad — SDK consumption rewrite (depositFunds onboarding)

## Background and Motivation

The `@zyfai/sdk` onboarding model changed radically in 0.2.45+:

- First `depositFunds` assigns a pre-deployed Safe (with signed session key) on Base, Arbitrum, and Ethereum Mainnet.
- Separate `deploySafe` / `createSessionKey` are no longer part of the supported demo flow (deprecated in SDK; not needed or supported for predeployed wallets).
- Assets: USDC, WETH, EURC (EURC on Mainnet + Base). Optional first-deposit `strategy`: `"conservative"` | `"aggressive"`.

This demo repo must stop teaching the old multi-step deploy → session key → deposit path and instead center onboarding on `depositFunds`.

## Key Challenges and Analysis

- UI still has dedicated **Deploy Safe** and **Create Session Key** panels/actions.
- Agent wrapper still exposes `deploySafe` / `createSessionKey`.
- Deposit panel lacks EURC + strategy, and copy still implies optional/legacy defaults (USDT/Plasma).
- `hasActiveSessionKey` display can remain as read-only status (still returned by API) but must not imply a create flow.
- `getSmartWalletAddress` may still be useful for inspection after deposit; address is backend-assigned, not deterministic from EOA — copy must change.

## High-level Task Breakdown

1. **Remove session-key creation surface**
   - Delete `SessionKeyPanel`, remove from `App.tsx`, delete `ensure-session-key.ts`.
   - Success: no imports/calls to `createSessionKey` / `createSessionKeyWithActivationCheck` remain; app builds without those files.

2. **Strip deploy from Smart Wallet panel**
   - Remove `deploySafe` action + `DeploySafeResponse` UI; keep resolve/lookup only; update copy (backend-assigned Safe, available after first deposit).
   - Success: panel has no Deploy button; no `sdk.deploySafe` calls in components.

3. **Update agent wrapper**
   - Remove `deploySafe` / `createSessionKey` from `ZyfaiAgent`; add `depositFunds` helper aligned with new signature (incl. optional strategy).
   - Success: agent compiles; no deprecated onboarding methods exposed.

4. **Modernize Deposit & Withdraw panel + App sections**
   - Add EURC; optional first-deposit strategy; update descriptions (onboarding via deposit, WETH not ETH, mins note); restructure App section titles (drop Account Deployment / Session Key sections).
   - Success: deposit UI matches new SDK contract; App flow starts with Deposit.

5. **Update README**
   - Document deposit-first onboarding; remove deploy/session-key steps.
   - Success: README matches the new lifecycle.

6. **Align supported chains with SDK**
   - `SupportedChainId` is now `1 | 8453 | 42161` (Mainnet/Base/Arbitrum). Remove Plasma (9745); add Ethereum Mainnet (1) in formatters, AppKit/reown config, agent error messages.
   - Success: `tsc -b` clean; chain selector matches SDK.

## Project Status Board

- [x] 1. Remove session-key creation surface
- [x] 2. Strip deploy from Smart Wallet panel
- [ ] 3. Update agent wrapper
- [x] 4. Modernize Deposit panel + App sections *(awaiting user verify)*
- [ ] 5. Update README
- [ ] 6. Align supported chains with SDK

## Current Status / Progress Tracking

Mode: **Executor**.

**Tasks 1–2 complete.**

**Task 4 (deposit UX) done (pending user verify):**
- Deposit panel Callout explains first-deposit onboarding (pre-deployed Safe + session, multi-chain, strategy, WETH vs ETH, mins)
- Added EURC + first-deposit strategy selector; pass strategy to `depositFunds`
- Deposit outcome shows `smartWallet` + updates shared `walletInfo`

## Executor's Feedback or Assistance Requests

Please verify the Deposit panel copy and new controls (EURC, strategy). Confirm to proceed (next: task 3 agent wrapper, or 6 chains if preferred).

## Lessons

- `pnpm update` / `upgrade` do not bump pinned exact versions in `package.json` (e.g. `"0.2.41"`); use `pnpm add @zyfai/sdk@latest`.
- Always ask Planner vs Executor when mode is unspecified.
- Custom chevron via `background-image` on `<select>` is unreliable (especially with Tailwind `bg-*`); use a wrapper + absolute chevron (`ui/Select`).
