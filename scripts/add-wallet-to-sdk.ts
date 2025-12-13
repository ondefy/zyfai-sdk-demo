/**
 * Script to add a wallet to the SDK API key's allowedWallets list
 * 
 * This script calls the addWalletToSdk function from the ZyFAI SDK.
 * 
 * Usage:
 *   pnpm tsx scripts/add-wallet-to-sdk.ts <wallet-address>
 * 
 * Example:
 *   pnpm tsx scripts/add-wallet-to-sdk.ts 0x1234...
 */

import { config } from "dotenv";
import { ZyfaiSDK } from "@zyfai/sdk";

// Load environment variables from .env file
config();

/**
 * Main function to add wallet to SDK
 */
async function main() {
  // Get wallet address from command line arguments
  const walletAddress = process.argv[2];

  if (!walletAddress) {
    console.error("Error: Wallet address is required");
    console.log("\nUsage: pnpm tsx scripts/add-wallet-to-sdk.ts <wallet-address>");
    console.log("Example: pnpm tsx scripts/add-wallet-to-sdk.ts 0x1234...");
    process.exit(1);
  }

  // Get API key from environment variables
  const apiKey = process.env.VITE_ZYFAI_API_KEY;

  if (!apiKey) {
    console.error("Error: VITE_ZYFAI_API_KEY is not set in .env file");
    process.exit(1);
  }

  try {
    console.log(`\n🔐 Adding wallet to SDK: ${walletAddress}\n`);

    // Initialize SDK
    const sdk = new ZyfaiSDK({
      apiKey,
      environment: "staging", // Change to "production" if needed
    });

    // Call addWalletToSdk function
    console.log("⏳ Adding wallet to SDK allowed list...\n");

    const result = await sdk.addWalletToSdk(walletAddress);

    if (result.success) {
      console.log("✅ Success!");
      console.log(`📝 Message: ${result.message}`);
      console.log("\n✨ Wallet successfully added to SDK allowed list!\n");
    } else {
      console.error("❌ Failed to add wallet to SDK");
      console.error(`Error: ${result.message}`);
      process.exit(1);
    }
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

