
import React, { useEffect, useState } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  useNavigate,
} from "react-router-dom";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Leads from "./pages/Leads";
import LeadsNew from "./pages/LeadsNew";
import Tasks from "./pages/Tasks";
import Clients from "./pages/Clients";
import HrProviders from "./pages/HrProviders";
import SearchJobs from "./pages/SearchJobs";
import JobSearch from "./pages/JobSearch";
import Admin from "./pages/Admin";
import FunnelAnalysis from "./pages/FunnelAnalysis";
import DatasetReprocessingExecution from "./pages/DatasetReprocessingExecution";
import DebugLead from "./pages/DebugLead";
import ClientSettings from "./pages/ClientSettings";
import History from "./pages/History";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import BulkProspecting from "./pages/BulkProspecting";
import { useAuth } from "./hooks/useAuth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />,
  },
  {
    path: "/auth",
    element: <Auth />,
  },
  {
    path: "/leads",
    element: <Leads />,
  },
  {
    path: "/leads-new",
    element: <LeadsNew />,
  },
  {
    path: "/tasks",
    element: <Tasks />,
  },
  {
    path: "/clients",
    element: <Clients />,
  },
  {
    path: "/hr-providers",
    element: <HrProviders />,
  },
  {
    path: "/search-jobs",
    element: <SearchJobs />,
  },
  {
    path: "/bulk-prospecting",
    element: <BulkProspecting />,
  },
  {
    path: "/job-offers",
    element: <JobSearch />,
  },
  {
    path: "/admin",
    element: <Admin />,
  },
  {
    path: "/funnel-analysis",
    element: <FunnelAnalysis />,
  },
  {
    path: "/dataset-reprocessing-execution",
    element: <DatasetReprocessingExecution />,
  },
  {
    path: "/debug-lead/:leadId",
    element: <DebugLead />,
  },
  {
    path: "/client-settings",
    element: <ClientSettings />,
  },
  {
    path: "/history",
    element: <History />,
  },
  {
    path: "/profile",
    element: <Profile />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

function App() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!session && isFirstLoad) {
        navigate("/auth");
      }
      setIsFirstLoad(false);
    }
  }, [session, loading, navigate, isFirstLoad]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
