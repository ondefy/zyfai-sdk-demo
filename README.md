# ZyFAI SDK Demo - Secure B2B Integration Guide

This demo application shows how to securely integrate with ZyFAI APIs for B2B clients using **Vercel Serverless Functions**. API keys are stored server-side and never exposed to the browser.

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    VERCEL SERVERLESS ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐        ┌─────────────────────┐        ┌────────────────┐  │
│  │   Browser   │  ───►  │  Vercel Serverless  │  ───►  │   ZyFAI APIs   │  │
│  │  (Frontend) │        │  Functions (/api/*) │        │                │  │
│  └─────────────┘        └─────────────────────┘        └────────────────┘  │
│                                                                              │
│  • No API keys in browser        • Reads env vars           • Execution API │
│  • Same-origin /api calls        • Adds x-api-key header    • Data API      │
│  • Wallet signing only           • Proxies requests                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
zyfai-sdk-demo/
├── api/                              # Vercel Serverless Functions
│   ├── health.ts                     # Health check endpoint
│   └── proxy/
│       ├── execution/[...path].ts    # Execution API proxy
│       └── data/[...path].ts         # Data API proxy
│
├── src/                              # Frontend application
│   ├── AppSecure.tsx                 # Secure demo (recommended)
│   ├── App.tsx                       # Original demo (API keys exposed)
│   └── hooks/
│       └── useSecureApi.ts           # Hook for secure API calls
│
├── vercel.json                       # Vercel configuration
├── env.example                       # Frontend environment template
└── README.md                         # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

**For Local Development (`vercel dev`):**

Create a `.env` file (or use Vercel CLI to link your project):

```bash
# .env - Local development only
ZYFAI_API_KEY=zyfai_your_execution_api_key_here
ZYFAI_DATA_API_KEY=zyfai_your_data_api_key_here
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

**For Production (Vercel Dashboard):**

Set these environment variables in your Vercel project settings:

- `ZYFAI_API_KEY` - Your ZyFAI Execution API key
- `ZYFAI_DATA_API_KEY` - Your ZyFAI Data API key

### 3. Run Development Server

```bash
pnpm dev
# App runs at http://localhost:3000 (default Vercel dev port)
```

This uses `vercel dev` which runs both the frontend and serverless functions together.

## 🛡️ How It Works

### API Key Flow

1. **User action** → Frontend makes request to `/api/proxy/execution/*` or `/api/proxy/data/*`
2. **Serverless function** → Reads `ZYFAI_API_KEY` from environment, adds `x-api-key` header
3. **Serverless function** → Forwards request to ZyFAI API
4. **ZyFAI API** → Processes request, returns response
5. **Serverless function** → Returns response to frontend
6. **Frontend** → Displays data to user

### Code Example

```tsx
// Frontend code - NO API KEYS VISIBLE!
import { useSecureApi } from "./hooks/useSecureApi";

function MyComponent() {
  const { dataApi, executionApi, isProxyHealthy } = useSecureApi();

  const fetchEarnings = async (walletAddress: string) => {
    // This calls /api/proxy/data/* (same origin)
    // The serverless function adds the API key
    const response = await dataApi.get(
      `/usercheck/onchain-earnings?walletAddress=${walletAddress}`
    );
    return response;
  };

  const fetchProtocols = async (chainId: number) => {
    // This calls /api/proxy/execution/* (same origin)
    const response = await executionApi.get(`/protocols?chainId=${chainId}`);
    return response;
  };
}
```

## 📡 Serverless Function Routes

| Frontend Route           | Serverless Function       | Target ZyFAI API                          |
| ------------------------ | ------------------------- | ----------------------------------------- |
| `/api/proxy/execution/*` | Adds `ZYFAI_API_KEY`      | `https://staging-api.zyf.ai/api/v1/*`     |
| `/api/proxy/data/*`      | Adds `ZYFAI_DATA_API_KEY` | `https://staging-defiapi.zyf.ai/api/v2/*` |
| `/api/health`            | Returns config status     | N/A                                       |

## 🔒 Security Best Practices

### ✅ DO

- Store API keys in Vercel environment variables
- Use `vercel dev` for local development (loads env vars automatically)
- Implement rate limiting for production
- Log requests for monitoring

### ❌ DON'T

- Put API keys in frontend code
- Put API keys in version control
- Commit `.env` files with real keys

## 🧪 Testing the Setup

1. Run `pnpm dev` to start the development server
2. Open the app (usually http://localhost:3000)
3. Check the "Backend Proxy" status indicator - should show "✅ Connected"
4. Connect a wallet using the Reown modal
5. Click "Fetch Protocols" - data should load from ZyFAI via your serverless functions

## 📋 Environment Variables Reference

### Server-Side (Vercel Environment Variables)

| Variable             | Required | Description                                   |
| -------------------- | -------- | --------------------------------------------- |
| `ZYFAI_API_KEY`      | Yes      | ZyFAI Execution API key (format: `zyfai_...`) |
| `ZYFAI_DATA_API_KEY` | Yes      | ZyFAI Data API key (format: `zyfai_...`)      |
| `NODE_ENV`           | No       | Environment: development, staging, production |

### Client-Side (`.env` or Vercel)

| Variable                        | Required | Description                      |
| ------------------------------- | -------- | -------------------------------- |
| `VITE_WALLETCONNECT_PROJECT_ID` | Yes      | WalletConnect / Reown project ID |

## 🚢 Production Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel dashboard
3. Set environment variables:
   - `ZYFAI_API_KEY`
   - `ZYFAI_DATA_API_KEY`
4. Deploy!

Vercel automatically:

- Builds the Vite frontend
- Deploys serverless functions from `/api`
- Handles routing

## 📖 Original Demo (Not Recommended)

The original demo (`App.tsx`) shows direct API key usage in the frontend. **This is NOT recommended for production** as it exposes your API keys to users.

To switch between demos, edit `src/main.tsx`:

```tsx
// Secure (recommended)
import AppSecure from "./AppSecure.tsx";

// Original (not recommended - exposes API keys!)
// import App from "./App.tsx";
```

## 🆘 Troubleshooting

### "API proxy not available"

- Ensure you're running with `pnpm dev` (uses `vercel dev`)
- Check that environment variables are set in `.env` or Vercel project settings
- Run `vercel env pull` to sync environment variables locally

### "API Request Failed"

- Check serverless function logs in Vercel dashboard
- Verify API keys are correctly set
- Ensure the API key format is correct (`zyfai_...`)

### "Wallet Connection Issues"

- Verify your WalletConnect project ID is set
- Check browser console for errors
- Try disconnecting and reconnecting

## 📚 Additional Resources

- [ZyFAI SDK Documentation](https://docs.zyf.ai)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Reown AppKit Documentation](https://docs.reown.com)
- [WalletConnect Cloud](https://cloud.walletconnect.com)
