
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Leads from "./pages/Leads";
import Clients from "./pages/Clients";
import HrProviders from "./pages/HrProviders";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import History from "./pages/History";
import NotFound from "./pages/NotFound";
import DebugLead from "./pages/DebugLead";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<Index />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={<Navigate to="/leads" replace />} />
      <Route path="/" element={<Navigate to="/leads" replace />} />
      <Route path="/leads" element={
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <div className="flex-1">
              <Leads />
            </div>
          </div>
        </SidebarProvider>
      } />
      <Route path="/clients" element={
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <div className="flex-1">
              <Clients />
            </div>
          </div>
        </SidebarProvider>
      } />
      <Route path="/hr-providers" element={
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <div className="flex-1">
              <HrProviders />
            </div>
          </div>
        </SidebarProvider>
      } />
      <Route path="/dashboard" element={
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <div className="flex-1">
              <Dashboard />
            </div>
          </div>
        </SidebarProvider>
      } />
      <Route path="/admin" element={
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <div className="flex-1">
              <Admin />
            </div>
          </div>
        </SidebarProvider>
      } />
      <Route path="/profile" element={
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <div className="flex-1">
              <Profile />
            </div>
          </div>
        </SidebarProvider>
      } />
      <Route path="/history" element={
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <div className="flex-1">
              <History />
            </div>
          </div>
        </SidebarProvider>
      } />
      <Route path="/debug/:leadId" element={
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <div className="flex-1">
              <DebugLead />
            </div>
          </div>
        </SidebarProvider>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
