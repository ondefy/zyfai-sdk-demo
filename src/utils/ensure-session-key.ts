import type { SessionKeyResponse, SupportedChainId, ZyfaiSDK } from "@zyfai/sdk";

/**
 * After createSessionKey, confirms hasActiveSessionKey via getUserDetails.
 * Retries createSessionKey once if still inactive, then throws if activation fails.
 */
export async function createSessionKeyWithActivationCheck(
  sdk: ZyfaiSDK,
  userAddress: string,
  chainId: SupportedChainId
): Promise<SessionKeyResponse> {
  const first = await sdk.createSessionKey(userAddress, chainId);
  let details = await sdk.getUserDetails();
  if (details.hasActiveSessionKey) {
    return first;
  }
  const second = await sdk.createSessionKey(userAddress, chainId);
  details = await sdk.getUserDetails();
  if (!details.hasActiveSessionKey) {
    throw new Error(
      "Session key activation failed after retry. Contact support."
    );
  }
  return second;
}
