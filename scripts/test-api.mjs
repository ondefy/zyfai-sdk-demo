#!/usr/bin/env node

/**
 * API Testing Script for ZyFAI SDK Demo
 *
 * This script tests all server-side API endpoints
 *
 * Usage:
 *   node scripts/test-api.mjs
 *
 * Make sure the dev server is running:
 *   npm run dev
 */

const BASE_URL = 'http://localhost:3000';
const TEST_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb6'; // Example address
const TEST_CHAIN_ID = 8453; // Base

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testEndpoint(name, url, options = {}) {
  try {
    log(`\n📡 Testing: ${name}`, colors.cyan);
    log(`   URL: ${url}`, colors.blue);

    const response = await fetch(url, options);
    const data = await response.json();

    if (response.ok) {
      log(`   ✅ Status: ${response.status} OK`, colors.green);
      log(`   Response preview:`, colors.yellow);

      // Show a preview of the response
      const preview = JSON.stringify(data, null, 2);
      const lines = preview.split('\n').slice(0, 10);
      lines.forEach(line => console.log(`      ${line}`));
      if (preview.split('\n').length > 10) {
        console.log('      ...');
      }

      return { success: true, data };
    } else {
      log(`   ❌ Status: ${response.status} ${response.statusText}`, colors.red);
      log(`   Error: ${JSON.stringify(data, null, 2)}`, colors.red);
      return { success: false, error: data };
    }
  } catch (error) {
    log(`   ❌ Failed: ${error.message}`, colors.red);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log('╔═══════════════════════════════════════════════════════════╗', colors.cyan);
  log('║          ZyFAI SDK API Endpoint Tests                    ║', colors.cyan);
  log('╚═══════════════════════════════════════════════════════════╝', colors.cyan);

  const results = [];

  // Test 1: Health Check
  results.push(await testEndpoint(
    'Health Check',
    `${BASE_URL}/api/health`
  ));

  // Test 2: Get Protocols
  results.push(await testEndpoint(
    'Get Protocols (Base)',
    `${BASE_URL}/api/sdk/protocols?chainId=${TEST_CHAIN_ID}`
  ));

  // Test 3: Get TVL
  results.push(await testEndpoint(
    'Get Platform TVL',
    `${BASE_URL}/api/sdk/tvl`
  ));

  // Test 4: Get Volume
  results.push(await testEndpoint(
    'Get Platform Volume',
    `${BASE_URL}/api/sdk/volume`
  ));

  // Test 5: Get Smart Wallet
  results.push(await testEndpoint(
    'Get Smart Wallet Address',
    `${BASE_URL}/api/sdk/smart-wallet?address=${TEST_ADDRESS}&chainId=${TEST_CHAIN_ID}`
  ));

  // Test 6: Get Positions
  results.push(await testEndpoint(
    'Get User Positions',
    `${BASE_URL}/api/sdk/positions?address=${TEST_ADDRESS}&chainId=${TEST_CHAIN_ID}`
  ));

  // Test 7: Get Safe Opportunities
  results.push(await testEndpoint(
    'Get Safe Opportunities',
    `${BASE_URL}/api/sdk/opportunities?chainId=${TEST_CHAIN_ID}&type=safe`
  ));

  // Test 8: Get Degen Strategies
  results.push(await testEndpoint(
    'Get Degen Strategies',
    `${BASE_URL}/api/sdk/opportunities?chainId=${TEST_CHAIN_ID}&type=degen`
  ));

  // Summary
  log('\n╔═══════════════════════════════════════════════════════════╗', colors.cyan);
  log('║                      Test Summary                         ║', colors.cyan);
  log('╚═══════════════════════════════════════════════════════════╝', colors.cyan);

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  log(`\n✅ Passed: ${passed}`, colors.green);
  log(`❌ Failed: ${failed}`, failed > 0 ? colors.red : colors.green);
  log(`📊 Total:  ${results.length}\n`, colors.blue);

  if (failed > 0) {
    log('⚠️  Some tests failed. Check the logs above for details.', colors.yellow);
    log('   Make sure the dev server is running: npm run dev', colors.yellow);
    log('   Check that environment variables are set in .env file', colors.yellow);
    process.exit(1);
  } else {
    log('🎉 All tests passed!', colors.green);
    process.exit(0);
  }
}

// Check if server is running first
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Main execution
log('\n🚀 Starting API tests...\n', colors.cyan);

const isServerRunning = await checkServer();
if (!isServerRunning) {
  log('❌ Server is not running!', colors.red);
  log('   Please start the dev server first: npm run dev', colors.yellow);
  log('   Then run this script again.\n', colors.yellow);
  process.exit(1);
}

await runTests();
