
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import NotificationButton from './notifications/NotificationButton';
import CustomSidebarTrigger from './ui/CustomSidebarTrigger';

interface DashboardHeaderProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  rightActions?: React.ReactNode;
  centerContent?: React.ReactNode;
}

const DashboardHeader = ({ title, subtitle, children, rightActions, centerContent }: DashboardHeaderProps = {}) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  console.log('DashboardHeader - User:', user?.email);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  return (
    <header className="bg-white px-6 py-4 border-b">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <CustomSidebarTrigger />
          {children}
          {title && (
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
              {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
            </div>
          )}
        </div>
        
        {/* Center content */}
        <div className="flex-1 flex justify-center">
          {centerContent}
        </div>
        
        <div className="flex items-center gap-4">
          {/* Right actions */}
          {rightActions}
          
          {/* Notification Button */}
          <NotificationButton />
          
          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url} alt="Profile" />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium leading-none">{user?.email}</p>
              </div>
              <DropdownMenuItem onClick={handleProfileClick}>
                Profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
