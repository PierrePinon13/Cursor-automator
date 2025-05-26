
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { BarChart3, Users, User, Briefcase } from 'lucide-react';

const menuItems = [
  {
    title: "Leads",
    url: "/leads",
    icon: Briefcase,
  },
  {
    title: "Tableau de bord",
    url: "/dashboard", 
    icon: BarChart3,
  },
  {
    title: "Profil",
    url: "/profile",
    icon: User,
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Sidebar>
      <SidebarHeader className="h-16 flex items-center justify-between px-4 border-b bg-white">
        <h1 className="text-xl font-semibold">CRM LinkedIn</h1>
        <SidebarTrigger />
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
}
