/**
 * Comprehensive end-to-end wallet data fetching script using the ZyFAI SDK
 * Tests all available data endpoints for a given wallet address
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
 * Helper function to safely call an async function and handle errors
 */
async function safeCall<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    console.warn(`⚠️  ${name}: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Main function to fetch all wallet data
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
    console.log(`\n🔍 Comprehensive Wallet Data Fetch Test`);
    console.log(`═══════════════════════════════════════════`);
    console.log(`📍 Wallet: ${walletAddress}`);
    console.log(`📍 Chain ID: ${chainId}`);
    console.log(`📍 Environment: staging\n`);

    // Initialize SDK
    const sdk = new ZyfaiSDK({
      apiKey,
      dataApiKey,
      environment: "staging", // Change to "production" if needed
    });

    console.log("📊 Starting comprehensive data fetch...\n");

    // ============================================================================
    // 1. WALLET INFORMATION
    // ============================================================================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 1. WALLET INFORMATION");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const smartWalletInfo = await safeCall("Get Smart Wallet by EOA", () =>
      sdk.getSmartWalletByEOA(walletAddress)
    );

    if (smartWalletInfo) {
      console.log("✅ Smart Wallet Info:");
      console.log(JSON.stringify(smartWalletInfo, null, 2));
      console.log("\n");
    }

    const smartWalletAddress = smartWalletInfo?.smartWallet;

    // ============================================================================
    // 2. POSITIONS & PROTOCOLS
    // ============================================================================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 2. POSITIONS & PROTOCOLS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const positions = await safeCall("Get Positions", () =>
      sdk.getPositions(walletAddress, chainId)
    );
    if (positions) {
      console.log("✅ Positions:");
      console.log(JSON.stringify(positions, null, 2));
      console.log("\n");
    }

    const protocols = await safeCall("Get Available Protocols", () =>
      sdk.getAvailableProtocols(chainId)
    );
    if (protocols) {
      console.log("✅ Available Protocols:");
      console.log(
        JSON.stringify(
          {
            success: protocols.success,
            chainId: protocols.chainId,
            count: protocols.protocols?.length || 0,
            protocols: protocols.protocols?.slice(0, 3), // Show first 3
          },
          null,
          2
        )
      );
      if (protocols.protocols && protocols.protocols.length > 3) {
        console.log(`   ... and ${protocols.protocols.length - 3} more\n`);
      } else {
        console.log("\n");
      }
    }

    // ============================================================================
    // 3. EARNINGS DATA
    // ============================================================================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 3. EARNINGS DATA");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    if (smartWalletAddress) {
      const onchainEarnings = await safeCall("Get Onchain Earnings", () =>
        sdk.getOnchainEarnings(smartWalletAddress)
      );
      if (onchainEarnings) {
        console.log("✅ Onchain Earnings:");
        console.log(JSON.stringify(onchainEarnings, null, 2));
        console.log("\n");
      }

      const dailyEarnings = await safeCall("Get Daily Earnings", () =>
        sdk.getDailyEarnings(smartWalletAddress, undefined, undefined)
      );
      if (dailyEarnings) {
        console.log("✅ Daily Earnings:");
        console.log(JSON.stringify(dailyEarnings, null, 2));
        console.log("\n");
      }

      const apyHistory = await safeCall("Get Daily APY History", () =>
        sdk.getDailyApyHistory(smartWalletAddress, "7D")
      );
      if (apyHistory) {
        console.log("✅ Daily APY History (7D):");
        console.log(JSON.stringify(apyHistory, null, 2));
        console.log("\n");
      }
    } else {
      console.log("⏭️  Skipping earnings data (no smart wallet found)\n");
    }

    // ============================================================================
    // 4. TRANSACTION HISTORY
    // ============================================================================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 4. TRANSACTION HISTORY");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    if (smartWalletAddress) {
      const firstTopup = await safeCall("Get First Topup", () =>
        sdk.getFirstTopup(smartWalletAddress, chainId)
      );
      if (firstTopup) {
        console.log("✅ First Topup:");
        console.log(JSON.stringify(firstTopup, null, 2));
        console.log("\n");
      }

      const history = await safeCall("Get Transaction History", () =>
        sdk.getHistory(smartWalletAddress, chainId, { limit: 10 })
      );
      if (history) {
        console.log("✅ Transaction History (last 10):");
        console.log(JSON.stringify(history, null, 2));
        console.log("\n");
      }
    } else {
      console.log("⏭️  Skipping transaction history (no smart wallet found)\n");
    }

    // ============================================================================
    // 5. PORTFOLIO DATA
    // ============================================================================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 5. PORTFOLIO DATA");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    if (smartWalletAddress) {
      const portfolio = await safeCall("Get Debank Portfolio", () =>
        sdk.getDebankPortfolio(smartWalletAddress)
      );
      if (portfolio) {
        console.log("✅ Debank Portfolio:");
        console.log(JSON.stringify(portfolio, null, 2));
        console.log("\n");
      }
    } else {
      console.log("⏭️  Skipping portfolio data (no smart wallet found)\n");
    }

    // ============================================================================
    // 6. REBALANCE INFORMATION
    // ============================================================================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 6. REBALANCE INFORMATION");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    if (smartWalletAddress) {
      const rebalanceFrequency = await safeCall("Get Rebalance Frequency", () =>
        sdk.getRebalanceFrequency(smartWalletAddress)
      );
      if (rebalanceFrequency) {
        console.log("✅ Rebalance Frequency:");
        console.log(JSON.stringify(rebalanceFrequency, null, 2));
        console.log("\n");
      }
    }

    const rebalanceInfo = await safeCall("Get Rebalance Info", () =>
      sdk.getRebalanceInfo()
    );
    if (rebalanceInfo) {
      console.log("✅ Rebalance Info:");
      console.log(
        JSON.stringify(
          {
            success: rebalanceInfo.success,
            count: rebalanceInfo.count,
            sample: rebalanceInfo.data?.slice(0, 2), // Show first 2
          },
          null,
          2
        )
      );
      if (rebalanceInfo.data && rebalanceInfo.data.length > 2) {
        console.log(`   ... and ${rebalanceInfo.data.length - 2} more\n`);
      } else {
        console.log("\n");
      }
    }

    // ============================================================================
    // 7. OPPORTUNITIES
    // ============================================================================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 7. YIELD OPPORTUNITIES");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const safeOpportunities = await safeCall("Get Safe Opportunities", () =>
      sdk.getSafeOpportunities(chainId)
    );
    if (safeOpportunities) {
      console.log("✅ Safe Opportunities:");
      console.log(
        JSON.stringify(
          {
            success: safeOpportunities.success,
            chainId: safeOpportunities.chainId,
            count: safeOpportunities.data?.length || 0,
            sample: safeOpportunities.data?.slice(0, 2), // Show first 2
          },
          null,
          2
        )
      );
      if (safeOpportunities.data && safeOpportunities.data.length > 2) {
        console.log(`   ... and ${safeOpportunities.data.length - 2} more\n`);
      } else {
        console.log("\n");
      }
    }

    const degenStrategies = await safeCall("Get Degen Strategies", () =>
      sdk.getDegenStrategies(chainId)
    );
    if (degenStrategies) {
      console.log("✅ Degen Strategies:");
      console.log(
        JSON.stringify(
          {
            success: degenStrategies.success,
            chainId: degenStrategies.chainId,
            count: degenStrategies.data?.length || 0,
            sample: degenStrategies.data?.slice(0, 2), // Show first 2
          },
          null,
          2
        )
      );
      if (degenStrategies.data && degenStrategies.data.length > 2) {
        console.log(`   ... and ${degenStrategies.data.length - 2} more\n`);
      } else {
        console.log("\n");
      }
    }

    // ============================================================================
    // 8. PLATFORM STATISTICS
    // ============================================================================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 8. PLATFORM STATISTICS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const tvl = await safeCall("Get TVL", () => sdk.getTVL());
    if (tvl) {
      console.log("✅ Total Value Locked (TVL):");
      console.log(JSON.stringify(tvl, null, 2));
      console.log("\n");
    }

    const volume = await safeCall("Get Volume", () => sdk.getVolume());
    if (volume) {
      console.log("✅ Total Volume:");
      console.log(JSON.stringify(volume, null, 2));
      console.log("\n");
    }

    const activeWallets = await safeCall("Get Active Wallets", () =>
      sdk.getActiveWallets(chainId)
    );
    if (activeWallets) {
      console.log("✅ Active Wallets:");
      console.log(JSON.stringify(activeWallets, null, 2));
      console.log("\n");
    }

    // ============================================================================
    // SUMMARY
    // ============================================================================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✨ COMPREHENSIVE DATA FETCH COMPLETED!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const summary = {
      wallet: walletAddress,
      chainId,
      smartWallet: smartWalletAddress || "Not found",
      endpointsTested: {
        walletInfo: !!smartWalletInfo,
        positions: !!positions,
        protocols: !!protocols,
        onchainEarnings: !!smartWalletAddress,
        dailyEarnings: !!smartWalletAddress,
        apyHistory: !!smartWalletAddress,
        firstTopup: !!smartWalletAddress,
        history: !!smartWalletAddress,
        portfolio: !!smartWalletAddress,
        rebalanceFrequency: !!smartWalletAddress,
        rebalanceInfo: !!rebalanceInfo,
        safeOpportunities: !!safeOpportunities,
        degenStrategies: !!degenStrategies,
        tvl: !!tvl,
        volume: !!volume,
        activeWallets: !!activeWallets,
      },
    };

    console.log("📊 Test Summary:");
    console.log(JSON.stringify(summary, null, 2));
    console.log("\n");
  } catch (error) {
    console.error(`\n❌ Fatal Error: ${(error as Error).message}`);
    console.error((error as Error).stack);
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
