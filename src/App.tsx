
import { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/hooks/useAuth';
import { useSidebarAutoShow } from '@/hooks/useSidebarAutoShow';
import './App.css';

const Admin = lazy(() => import('@/pages/Admin'));
const Clients = lazy(() => import('@/pages/Clients'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const HRProviders = lazy(() => import('@/pages/HrProviders'));
const Leads = lazy(() => import('@/pages/Leads'));
const Profile = lazy(() => import('@/pages/Profile'));
const HistoryPage = lazy(() => import('@/pages/History'));
const Auth = lazy(() => import('@/pages/Auth'));

const queryClient = new QueryClient();

const Layout = () => {
  useSidebarAutoShow();
  
  return (
    <div className="min-h-screen flex w-full">
      <AppSidebar />
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Suspense fallback={<div>Loading...</div>}><Leads /></Suspense>,
      },
      {
        path: "leads",
        element: <Suspense fallback={<div>Loading...</div>}><Leads /></Suspense>,
      },
      {
        path: "clients",
        element: <Suspense fallback={<div>Loading...</div>}><Clients /></Suspense>,
      },
      {
        path: "hr-providers",
        element: <Suspense fallback={<div>Loading...</div>}><HRProviders /></Suspense>,
      },
      {
        path: "dashboard",
        element: <Suspense fallback={<div>Loading...</div>}><Dashboard /></Suspense>,
      },
      {
        path: "admin",
        element: <Suspense fallback={<div>Loading...</div>}><Admin /></Suspense>,
      },
      {
        path: "profile",
        element: <Suspense fallback={<div>Loading...</div>}><Profile /></Suspense>,
      },
      {
        path: "history",
        element: <Suspense fallback={<div>Loading...</div>}><HistoryPage /></Suspense>,
      },
    ]
  },
  {
    path: "/login",
    element: <Suspense fallback={<div>Loading...</div>}><Auth /></Suspense>,
  },
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SidebarProvider>
          <RouterProvider router={router} />
          <Toaster />
        </SidebarProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
