
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Leads from "./pages/Leads";
import LeadsNew from "./pages/LeadsNew";
import Clients from "./pages/Clients";
import ClientSettings from "./pages/ClientSettings";
import HrProviders from "./pages/HrProviders";
import History from "./pages/History";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import FunnelAnalysis from "./pages/FunnelAnalysis";
import Profile from "./pages/Profile";
import DebugLead from "./pages/DebugLead";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/leads" element={<Leads />} />
                <Route path="/leads-new" element={<LeadsNew />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/client-settings/:clientId" element={<ClientSettings />} />
                <Route path="/hr-providers" element={<HrProviders />} />
                <Route path="/history" element={<History />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/funnel-analysis" element={<FunnelAnalysis />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/debug-lead/:leadId" element={<DebugLead />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
