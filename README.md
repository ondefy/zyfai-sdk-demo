# ZyFAI SDK Demo - Secure B2B Integration Guide

This demo application shows how to **securely** integrate with ZyFAI APIs for B2B clients. **ALL API keys** (including the Bundler API key for Safe operations) are stored server-side and never exposed to the browser.

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 COMPLETE SERVER-SIDE SDK ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐        ┌─────────────────────────┐        ┌─────────────┐ │
│  │   Browser   │  ───►  │  Vercel Serverless      │  ───►  │ ZyFAI APIs  │ │
│  │  (Frontend) │        │  (SDK initialized here) │        │ + Pimlico   │ │
│  └─────────────┘        └─────────────────────────┘        └─────────────┘ │
│                                                                              │
│  • NO API keys in browser        • SDK initialized with ALL keys            │
│  • Calls /api/sdk/* routes       • ZYFAI_API_KEY (Execution)               │
│  • Wallet signing only           • ZYFAI_DATA_API_KEY (Data)               │
│                                   • BUNDLER_API_KEY (Pimlico/Safe)          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
zyfai-sdk-demo/
├── api/                              # Vercel Serverless Functions
│   ├── health.ts                     # Health check (shows config status)
│   ├── lib/
│   │   └── sdk-service.ts            # Server-side SDK initialization
│   └── sdk/                          # SDK operation endpoints
│       ├── protocols.ts              # GET /api/sdk/protocols
│       ├── positions.ts              # GET /api/sdk/positions
│       ├── smart-wallet.ts           # GET /api/sdk/smart-wallet
│       ├── deploy-safe.ts            # POST /api/sdk/deploy-safe
│       ├── tvl.ts                    # GET /api/sdk/tvl
│       ├── volume.ts                 # GET /api/sdk/volume
│       ├── earnings.ts               # GET/POST /api/sdk/earnings
│       └── opportunities.ts          # GET /api/sdk/opportunities
│
├── src/                              # Frontend application
│   ├── AppSecure.tsx                 # Main secure demo
│   └── hooks/
│       └── useSecureSdk.ts           # Hook for secure SDK operations
│
├── vercel.json                       # Vercel configuration
└── README.md                         # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Create a `.env` file with ALL required API keys:

```bash
# Server-side API keys (KEEP SECRET!)
ZYFAI_API_KEY=zyfai_your_execution_api_key_here
ZYFAI_DATA_API_KEY=zyfai_your_data_api_key_here
BUNDLER_API_KEY=your_pimlico_bundler_key_here

# Frontend-only (safe to expose)
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

### 3. Run Development Server

```bash
pnpm dev
# Uses vercel dev - runs frontend + serverless functions together
```

## 🛡️ How It Works

### Complete Flow

1. **Frontend** makes request to `/api/sdk/deploy-safe`
2. **Serverless function** initializes SDK with `ZYFAI_API_KEY`, `ZYFAI_DATA_API_KEY`, `BUNDLER_API_KEY`
3. **Server-side SDK** calls ZyFAI APIs and Pimlico bundler
4. **Response** returned to frontend (no keys exposed)

### Code Example

```tsx
// Frontend code - ZERO API KEYS!
import { useSecureSdk } from "./hooks/useSecureSdk";

function MyComponent() {
  const { sdk, isReady, health } = useSecureSdk();

  // Check if all keys are configured
  if (!isReady) {
    return <div>SDK not configured</div>;
  }

  // All operations use server-side SDK with full credentials
  const protocols = await sdk.getProtocols(8453);
  const positions = await sdk.getPositions(address, 8453);
  const wallet = await sdk.getSmartWallet(address, 8453);

  // Even Safe deployment uses server-side BUNDLER_API_KEY!
  const result = await sdk.deploySafe(address, 8453);
}
```

## 📡 API Endpoints

| Endpoint                 | Method | Description                    |
| ------------------------ | ------ | ------------------------------ |
| `/api/health`            | GET    | Check SDK configuration status |
| `/api/sdk/protocols`     | GET    | Get available protocols        |
| `/api/sdk/positions`     | GET    | Get user positions             |
| `/api/sdk/smart-wallet`  | GET    | Get smart wallet address       |
| `/api/sdk/deploy-safe`   | POST   | Deploy Safe (uses bundler key) |
| `/api/sdk/tvl`           | GET    | Get platform TVL               |
| `/api/sdk/volume`        | GET    | Get platform volume            |
| `/api/sdk/earnings`      | GET    | Get onchain earnings           |
| `/api/sdk/earnings`      | POST   | Calculate earnings             |
| `/api/sdk/opportunities` | GET    | Get yield opportunities        |

## 🔒 Security Best Practices

### ✅ DO

- Store ALL API keys in Vercel environment variables
- Use the `useSecureSdk` hook for all SDK operations
- Initialize SDK server-side only
- Implement rate limiting for production

### ❌ DON'T

- Put ANY API keys in frontend code
- Initialize SDK in the browser
- Commit `.env` files with real keys
- Expose bundler API key to clients

## 📋 Environment Variables

### Server-Side (Required - Keep Secret!)

| Variable             | Required | Description                          |
| -------------------- | -------- | ------------------------------------ |
| `ZYFAI_API_KEY`      | Yes      | ZyFAI Execution API key              |
| `ZYFAI_DATA_API_KEY` | Yes      | ZyFAI Data API key                   |
| `BUNDLER_API_KEY`    | Yes      | Pimlico bundler key for Safe ops     |
| `NODE_ENV`           | No       | Environment (development/production) |

### Client-Side (Safe to Expose)

| Variable                        | Required | Description                      |
| ------------------------------- | -------- | -------------------------------- |
| `VITE_WALLETCONNECT_PROJECT_ID` | Yes      | WalletConnect / Reown project ID |

## 🚢 Production Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel dashboard
3. Set environment variables:
   - `ZYFAI_API_KEY`
   - `ZYFAI_DATA_API_KEY`
   - `BUNDLER_API_KEY`
   - `VITE_WALLETCONNECT_PROJECT_ID`
4. Deploy!

## 🆘 Troubleshooting

### "SDK not configured"

Check the health endpoint status indicators:

- API: ✅ - `ZYFAI_API_KEY` is set
- Data: ✅ - `ZYFAI_DATA_API_KEY` is set
- Bundler: ✅ - `BUNDLER_API_KEY` is set

### "Failed to deploy Safe"

- Verify `BUNDLER_API_KEY` is set correctly
- Check bundler key has sufficient credits
- Verify the address hasn't already deployed a Safe

## 📚 Additional Resources

- [ZyFAI SDK Documentation](https://docs.zyf.ai)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Pimlico Documentation](https://docs.pimlico.io)
