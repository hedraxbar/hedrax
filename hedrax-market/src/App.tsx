import { Routes, Route, Navigate } from "react-router-dom";
import { LandingPage } from "./screens/LandingPage";
import { MarketplacePage } from "./screens/MarketplacePage";
import { Launchpad } from "./screens/Launchpad";
import CreateDropHub from "./screens/Launchpad/CreateDropHub";

// real pages
import SelfCreate from "./screens/Launchpad/SelfCreate";
import VerifiedCreate from "./screens/Launchpad/VerifiedCreate";
import TokenCreate from "./screens/Launchpad/TokenCreate"; // can stay a stub for now

// optional stubs so your nav links don't 404 (top-level pages only)
const CreatePage = () => <div style={{ paddingTop: 96, color: "#d5d7e3" }}>Create</div>;
const SwapPage   = () => <div style={{ paddingTop: 96, color: "#d5d7e3" }}>Swap</div>;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/marketplace" element={<MarketplacePage />} />

      {/* Launchpad hub */}
      <Route path="/launchpad" element={<Launchpad />} />
      {/* Create hub (matches the screenshot) */}
      <Route path="/launchpad/create" element={<CreateDropHub />} />
      {/* Sub-flows */}
      <Route path="/launchpad/create/self" element={<SelfCreate />} />
      <Route path="/launchpad/create/verified" element={<VerifiedCreate />} />
      <Route path="/launchpad/create/token" element={<TokenCreate />} />

      {/* other top-level pages */}
      <Route path="/create" element={<CreatePage />} />
      <Route path="/swap" element={<SwapPage />} />

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
