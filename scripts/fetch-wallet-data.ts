/**
 * Script to fetch wallet data using the ZyFAI SDK
 *
 * Usage:
 *   pnpm tsx scripts/fetch-wallet-data.ts <wallet-address> [chain-id]
 *
 * Example:
 *   pnpm tsx scripts/fetch-wallet-data.ts 0x1234... 8453
 */

import { config } from "dotenv";
import { ZyfaiSDK } from "@zyfai/sdk";
import type { SupportedChainId } from "@zyfai/sdk";

// Load environment variables from .env file
config();

/**
 * Main function to fetch wallet data
 */
async function main() {
  // Get wallet address from command line arguments
  const walletAddress = process.argv[2];
  const chainIdArg = process.argv[3];

  if (!walletAddress) {
    console.error("Error: Wallet address is required");
    console.log(
      "\nUsage: pnpm tsx scripts/fetch-wallet-data.ts <wallet-address> [chain-id]"
    );
    console.log(
      "Example: pnpm tsx scripts/fetch-wallet-data.ts 0x1234... 8453"
    );
    process.exit(1);
  }

  // Get API keys from environment variables
  const apiKey = process.env.VITE_ZYFAI_API_KEY;
  const dataApiKey = process.env.VITE_ZYFAI_DATA_API_KEY;

  if (!apiKey) {
    console.error("Error: VITE_ZYFAI_API_KEY is not set in .env file");
    process.exit(1);
  }

  if (!dataApiKey) {
    console.error("Error: VITE_ZYFAI_DATA_API_KEY is not set in .env file");
    process.exit(1);
  }

  // Parse chain ID (default to Base/8453 if not provided)
  const chainId: SupportedChainId = chainIdArg
    ? (Number.parseInt(chainIdArg, 10) as SupportedChainId)
    : (8453 as SupportedChainId);

  try {
    console.log(`\n🔍 Fetching data for wallet: ${walletAddress}`);
    console.log(`📍 Chain ID: ${chainId}\n`);

    // Initialize SDK
    const sdk = new ZyfaiSDK({
      apiKey,
      dataApiKey,
      environment: "staging", // Change to "production" if needed
    });

    // Fetch wallet data using various SDK methods
    // Note: The SDK now supports read-only operations without account connection
    console.log("📊 Fetching wallet information...\n");

    // 1. Get smart wallet by EOA
    try {
      const smartWalletInfo = await sdk.getSmartWalletByEOA(walletAddress);
      console.log("✅ Smart Wallet Info:");
      console.log(JSON.stringify(smartWalletInfo, null, 2));
      console.log("\n");
    } catch (error) {
      console.warn(
        `⚠️  Failed to get smart wallet by EOA: ${(error as Error).message}\n`
      );
    }

    // 2. Get positions
    try {
      const positions = await sdk.getPositions(walletAddress, chainId);
      console.log("✅ Positions:");
      console.log(JSON.stringify(positions, null, 2));
      console.log("\n");
    } catch (error) {
      console.warn(
        `⚠️  Failed to get positions: ${(error as Error).message}\n`
      );
    }

    // 3. Get onchain earnings (requires smart wallet address)
    try {
      const smartWalletInfo = await sdk.getSmartWalletByEOA(walletAddress);
      if (smartWalletInfo.smartWallet) {
        const earnings = await sdk.getOnchainEarnings(
          smartWalletInfo.smartWallet
        );
        console.log("✅ Onchain Earnings:");
        console.log(JSON.stringify(earnings, null, 2));
        console.log("\n");
      }
    } catch (error) {
      console.warn(
        `⚠️  Failed to get onchain earnings: ${(error as Error).message}\n`
      );
    }

    // 4. Get first topup
    try {
      const smartWalletInfo = await sdk.getSmartWalletByEOA(walletAddress);
      if (smartWalletInfo.smartWallet) {
        const firstTopup = await sdk.getFirstTopup(
          smartWalletInfo.smartWallet,
          chainId
        );
        console.log("✅ First Topup:");
        console.log(JSON.stringify(firstTopup, null, 2));
        console.log("\n");
      }
    } catch (error) {
      console.warn(
        `⚠️  Failed to get first topup: ${(error as Error).message}\n`
      );
    }

    // 5. Get transaction history
    try {
      const smartWalletInfo = await sdk.getSmartWalletByEOA(walletAddress);
      if (smartWalletInfo.smartWallet) {
        const history = await sdk.getHistory(
          smartWalletInfo.smartWallet,
          chainId,
          {
            limit: 10,
          }
        );
        console.log("✅ Transaction History (last 10):");
        console.log(JSON.stringify(history, null, 2));
        console.log("\n");
      }
    } catch (error) {
      console.warn(`⚠️  Failed to get history: ${(error as Error).message}\n`);
    }

    // 6. Get daily earnings
    try {
      const smartWalletInfo = await sdk.getSmartWalletByEOA(walletAddress);
      if (smartWalletInfo.smartWallet) {
        const dailyEarnings = await sdk.getDailyEarnings(
          smartWalletInfo.smartWallet,
          undefined,
          undefined
        );
        console.log("✅ Daily Earnings:");
        console.log(JSON.stringify(dailyEarnings, null, 2));
        console.log("\n");
      }
    } catch (error) {
      console.warn(
        `⚠️  Failed to get daily earnings: ${(error as Error).message}\n`
      );
    }

    // 7. Get Debank portfolio
    try {
      const smartWalletInfo = await sdk.getSmartWalletByEOA(walletAddress);
      if (smartWalletInfo.smartWallet) {
        const portfolio = await sdk.getDebankPortfolio(
          smartWalletInfo.smartWallet
        );
        console.log("✅ Debank Portfolio:");
        console.log(JSON.stringify(portfolio, null, 2));
        console.log("\n");
      }
    } catch (error) {
      console.warn(
        `⚠️  Failed to get Debank portfolio: ${(error as Error).message}\n`
      );
    }

    console.log("✨ Data fetch completed!\n");
  } catch (error) {
    console.error(`\n❌ Error: ${(error as Error).message}`);
    console.error((error as Error).stack);
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
