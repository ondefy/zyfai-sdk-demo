import { SdkProvider } from "./context/SdkContext";
import { Header } from "./components/Header";
import { StatusBar } from "./components/StatusBar";
import { ChainSelector } from "./components/ChainSelector";

// ── Core (Account deployment → Session key → Deposit / Withdraw) ──
import { SmartWalletPanel } from "./components/SmartWalletPanel";
import { SessionKeyPanel } from "./components/SessionKeyPanel";
import { DepositWithdrawPanel } from "./components/DepositWithdrawPanel";

// ── Earnings ──
import { EarningsPanel } from "./components/EarningsPanel";

// ── User details, profile & configuration ──
import { UserDetailsPanel } from "./components/UserDetailsPanel";
import { AdvancedProfilePanel } from "./components/AdvancedProfilePanel";
import { ProtocolManagementPanel } from "./components/ProtocolManagementPanel";
import { PoolCustomizationPanel } from "./components/PoolCustomizationPanel";
import { IdentityRegistryPanel } from "./components/IdentityRegistryPanel";

// ── Data & analytics ──
import { PositionsPanel } from "./components/PositionsPanel";
import { PortfolioPanel } from "./components/PortfolioPanel";
import { YieldOpportunitiesPanel } from "./components/YieldOpportunitiesPanel";
import { OpportunitiesRiskPanel } from "./components/OpportunitiesRiskPanel";
import { RebalancePanel } from "./components/RebalancePanel";

// ── Platform-wide stats & SDK key info ──
import { PlatformStatsPanel } from "./components/PlatformStatsPanel";
import { SdkKeyInfoPanel } from "./components/SdkKeyInfoPanel";
import { ActiveWalletsPanel } from "./components/ActiveWalletsPanel";
import { FirstTopupHistoryPanel } from "./components/FirstTopupHistoryPanel";

// ---------------------------------------------------------------------------
// Main App layout
// ---------------------------------------------------------------------------

export default function App() {
  return (
    <SdkProvider>
      <div className="flex flex-col gap-6">
        {/* ── Header & status ── */}
        <Header />
        <StatusBar />
        <ChainSelector />

        {/* ── 1. Account deployment ── */}
        <SectionTitle>Account Deployment</SectionTitle>
        <SmartWalletPanel />

        {/* ── 2. Session key ── */}
        <SectionTitle>Session Key Signatures</SectionTitle>
        <SessionKeyPanel />

        {/* ── 3. Deposit / Withdraw ── */}
        <SectionTitle>Deposit & Withdraw</SectionTitle>
        <DepositWithdrawPanel />

        {/* ── 4. Earnings ── */}
        <SectionTitle>Earnings</SectionTitle>
        <EarningsPanel />

        {/* ── 5. User details, configuration & splitting ── */}
        <SectionTitle>User Details & Configuration</SectionTitle>
        <UserDetailsPanel />
        <AdvancedProfilePanel />
        <ProtocolManagementPanel />
        <PoolCustomizationPanel />
        <IdentityRegistryPanel />

        {/* ── 6. Positions & Portfolio ── */}
        <SectionTitle>Positions & Portfolio</SectionTitle>
        <PositionsPanel />
        <PortfolioPanel />

        {/* ── 7. Yield opportunities & risk ── */}
        <SectionTitle>Yield Opportunities & Risk</SectionTitle>
        <YieldOpportunitiesPanel />
        <OpportunitiesRiskPanel />
        <RebalancePanel />

        {/* ── 8. Platform stats & SDK info ── */}
        <SectionTitle>Platform Stats & SDK Info</SectionTitle>
        <PlatformStatsPanel />
        <SdkKeyInfoPanel />
        <ActiveWalletsPanel />
        <FirstTopupHistoryPanel />
      </div>
    </SdkProvider>
  );
}

// ---------------------------------------------------------------------------
// Small helper for visual section headings
// ---------------------------------------------------------------------------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-4 border-b border-dark-600 pb-2 text-lg font-bold tracking-wide text-slate-300 uppercase">
      {children}
    </h2>
  );
}
