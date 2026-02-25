import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SessionProvider } from "@/contexts/SessionContext";
import ScrollToTop from "@/components/ScrollToTop";
import Index from "./pages/Index";
import ConnectPage from "./pages/ConnectPage";
import ScanPage from "./pages/ScanPage";
import TransferPage from "./pages/TransferPage";
import MappingPage from "./pages/MappingPage";
import PostTransferPage from "./pages/PostTransferPage";
import ToolsPage from "./pages/ToolsPage";
import EmbedStudioPage from "./pages/EmbedStudioPage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";
import KofiWidget from "./components/KofiWidget";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SessionProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/connect" element={<ConnectPage />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/mapping" element={<MappingPage />} />
            <Route path="/transfer" element={<TransferPage />} />
            <Route path="/post-transfer" element={<PostTransferPage />} />
            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/tools/embed-studio" element={<EmbedStudioPage />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
          <KofiWidget />
        </BrowserRouter>
      </SessionProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
