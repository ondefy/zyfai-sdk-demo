import { isSupportedChain, ZyfaiSDK, type DeploySafeResponse, type SmartWalletResponse, type Strategy, type SupportedChainId } from "@zyfai/sdk";

export class ZyfaiAgent {
    private sdk: ZyfaiSDK;
    private connectedAddress: string | null = null; // User EOA address
  
    /**
     * Initialize Zyfai SDK
     * @param apiKey API key from zyf.ai
     */
    constructor(apiKey: string) {
      this.sdk = new ZyfaiSDK({ apiKey: apiKey });
    }
  
    /**
     * Validate that the chain ID is supported
     * @param chainId - Chain ID to validate
     * @throws Error if chain is not supported
     * @retunrs Returns the validated chain id
     */
    private validateChainId(chainId: number): SupportedChainId {
      if (!isSupportedChain(chainId)) {
        throw new Error(
          `Unsupported chain ID: ${chainId}. Supported chains: Ethereum Mainnet (1), Base (8453), Arbitrum (42161)`
        );
      }
  
      return chainId;
    }
  
    /**
     * Connect wallet to Zyf.ai using SIWE authentication.
     * @param chainId - Target blockchain (1=Ethereum, 8453=Base, 42161=Arbitrum)
     * @param provider - provider of the connecting user
     * @returns The connected User EOA address
     */
    async connectWallet(
      chainId: SupportedChainId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    provider: any
    ): Promise<string> {
      const validatedChainId = this.validateChainId(chainId);
  
      if (!provider) {
        throw new Error(`provider is required to connect to Zyfai`);
      }
  
      const address = await this.sdk.connectAccount(provider, validatedChainId);
  
      this.connectedAddress = address;
      return address;
    }
  
    /**
     * Disconnect the current wallet from Zyf.ai.
     */
    async disconnectWallet(): Promise<void> {
      await this.sdk.disconnectAccount();
      this.connectedAddress = null;
    }
  
    /**
     * Check if a wallet is currently connected.
     */
    isConnected(): boolean {
      return this.connectedAddress !== null;
    }
  
    /**
     * Get the currently connected wallet address.
     */
    getConnectedAddress(): string {
      const address = this.connectedAddress;
  
      if (!this.isConnected() || !address) {
        throw new Error(`Wallet not connected. Call connectWallet() first.`);
      }
  
      return address;
    }
  
    /**
     * Get smart wallet address
     * @param chainId - Zyfai supported chain id
     * @returns Currently connected users Smart Wallet(Safe) address
     */
    async getSmartWalletAddress(
      chainId: SupportedChainId
    ): Promise<SmartWalletResponse> {
      const validatedChainId = this.validateChainId(chainId);
      const address = this.getConnectedAddress();
  
      return this.sdk.getSmartWalletAddress(address, validatedChainId);
    }
  
    /**
     * Deploy a safe
     * @param chainId - Zyfai supported chain id
     * @param strategy - "conservative" | "aggressive". If ommitted defaults to "conservative"
     */
    async deploySafe(
      chainId: SupportedChainId,
      strategy?: Strategy
    ): Promise<DeploySafeResponse> {
      const validatedChainId = this.validateChainId(chainId);
      const address = this.getConnectedAddress();
  
      return this.sdk.deploySafe(address, validatedChainId, strategy);
    }
  }