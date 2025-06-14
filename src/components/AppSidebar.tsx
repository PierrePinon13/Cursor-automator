
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { BarChart3, Users, Briefcase, Building2, UserCheck, Settings, History, CheckSquare, Search } from 'lucide-react';

const AppSidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthorized = user?.email === 'ppinon@getpro.fr';

  const menuItems = [
    {
      title: "Leads",
      url: "/leads",
      icon: Briefcase,
    },
    {
      title: "Clients",
      url: "/clients",
      icon: Building2,
    },
    {
      title: "Tasks",
      url: "/tasks",
      icon: CheckSquare,
    },
    {
      title: "Job Search",
      url: "/job-search",
      icon: Search,
    },
    {
      title: "Historique",
      url: "/history",
      icon: History,
    },
    {
      title: "Dashboard",
      url: "/dashboard", 
      icon: BarChart3,
    },
    ...(isAuthorized ? [{
      title: "Admin",
      url: "/admin",
      icon: Settings,
    }] : []),
  ];

  return (
    <Sidebar>
      <SidebarContent className="bg-white">
        <div className="p-2">
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  asChild
                  isActive={location.pathname === item.url}
                >
                  <button
                    onClick={() => navigate(item.url)}
                    className="w-full"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export { AppSidebar };
