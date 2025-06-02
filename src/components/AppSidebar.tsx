
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { BarChart3, Users, Briefcase, Building2, UserCheck, Settings, History, CheckSquare } from 'lucide-react';

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
      title: "Historique",
      url: "/history",
      icon: History,
    },
    {
      title: "Tableau de bord",
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
      <SidebarHeader className="h-16 flex items-center px-4 border-b bg-white">
        <div className="flex items-center gap-3 w-full">
          <h1 className="text-xl font-semibold group-data-[collapsible=icon]:hidden">Automator</h1>
        </div>
      </SidebarHeader>
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
