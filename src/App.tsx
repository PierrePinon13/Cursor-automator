
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Leads from "./pages/Leads";
import LeadsNew from "./pages/LeadsNew";
import Clients from "./pages/Clients";
import Tasks from "./pages/Tasks";
import JobSearch from "./pages/JobSearch";
import SearchJobs from "./pages/SearchJobs";
import BulkProspecting from "./pages/BulkProspecting";
import HrProviders from "./pages/HrProviders";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import History from "./pages/History";
import ClientSettings from "./pages/ClientSettings";
import DebugLead from "./pages/DebugLead";
import FunnelAnalysis from "./pages/FunnelAnalysis";
import DatasetReprocessingExecution from "./pages/DatasetReprocessingExecution";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SidebarProvider>
              <div className="min-h-screen flex w-full">
                <AppSidebar />
                <div className="flex-1">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/leads" element={<Leads />} />
                    <Route path="/leads-new" element={<LeadsNew />} />
                    <Route path="/clients" element={<Clients />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="/job-search" element={<JobSearch />} />
                    <Route path="/search-jobs" element={<SearchJobs />} />
                    <Route path="/search-posts" element={<SearchPosts />} />
                    <Route path="/bulk-prospecting" element={<BulkProspecting />} />
                    <Route path="/hr-providers" element={<HrProviders />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/client-settings" element={<ClientSettings />} />
                    <Route path="/debug-lead" element={<DebugLead />} />
                    <Route path="/funnel-analysis" element={<FunnelAnalysis />} />
                    <Route path="/dataset-reprocessing-execution" element={<DatasetReprocessingExecution />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </div>
              </div>
            </SidebarProvider>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
