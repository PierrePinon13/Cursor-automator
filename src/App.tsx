import React, { useEffect, useState } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  useNavigate,
} from "react-router-dom";

import Index from "./pages";
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
import { useAuth } from "./hooks/useAuth";
import { MantineProvider } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { theme } from "./theme";
import BulkProspecting from "./pages/BulkProspecting";

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
  const { session, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      if (!session && isFirstLoad) {
        navigate("/auth");
      }
      setIsFirstLoad(false);
    }
  }, [session, isLoading, navigate, isFirstLoad]);

  return (
    <>
      <Notifications />
      <MantineProvider theme={theme} withGlobalStyles withNormalizeCSS>
        <QueryClientProvider client={queryClient}>
          <ReactQueryDevtools initialIsOpen={false} />
          <ModalsProvider>
            <RouterProvider router={router} />
          </ModalsProvider>
        </QueryClientProvider>
      </MantineProvider>
    </>
  );
}

export default App;
