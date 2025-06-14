
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { BarChart3, Users, Briefcase, Building2, UserCheck, Settings, History, CheckSquare, Search, User, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

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
      description: "Gérer vos prospects"
    },
    {
      title: "Clients",
      url: "/clients",
      icon: Building2,
      description: "Base clients"
    },
    {
      title: "Tâches",
      url: "/tasks",
      icon: CheckSquare,
      description: "Suivi des tâches"
    },
    {
      title: "Recherche d'emploi",
      url: "/job-search",
      icon: Search,
      description: "Offres d'emploi"
    },
    {
      title: "Historique",
      url: "/history",
      icon: History,
      description: "Activités récentes"
    },
    {
      title: "Dashboard",
      url: "/dashboard", 
      icon: BarChart3,
      description: "Tableaux de bord"
    },
    ...(isAuthorized ? [{
      title: "Administration",
      url: "/admin",
      icon: Settings,
      description: "Paramètres admin"
    }] : []),
  ];

  return (
    <Sidebar className="border-r border-gray-200">
      <SidebarHeader className="border-b border-gray-100">
        <div className="flex items-center gap-3 p-4">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">GP</span>
          </div>
          <div>
            <h2 className="font-bold text-gray-900">GetPro</h2>
            <p className="text-xs text-gray-500">CRM Platform</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-white px-2 py-4">
        <SidebarMenu className="space-y-1">
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton 
                asChild
                isActive={location.pathname === item.url}
                className="group"
              >
                <button
                  onClick={() => navigate(item.url)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-gray-50 data-[active=true]:bg-blue-50 data-[active=true]:text-blue-700 data-[active=true]:border-blue-200"
                >
                  <item.icon className="h-5 w-5 text-gray-600 group-data-[active=true]:text-blue-600" />
                  <div className="flex-1 text-left">
                    <span className="font-medium text-sm">{item.title}</span>
                    <p className="text-xs text-gray-500 group-data-[active=true]:text-blue-600">{item.description}</p>
                  </div>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-100 p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-blue-100 text-blue-700 text-sm font-medium">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.email?.split('@')[0] || 'Utilisateur'}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex-1 justify-start gap-2 text-gray-600 hover:text-gray-900"
            onClick={() => navigate('/profile')}
          >
            <User className="h-4 w-4" />
            Profil
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-600 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export { AppSidebar };
