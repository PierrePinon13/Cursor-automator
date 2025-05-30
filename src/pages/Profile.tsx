
import DashboardHeader from '@/components/DashboardHeader';
import LinkedInConnectionCard from '@/components/LinkedInConnectionCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { SidebarTrigger } from '@/components/ui/sidebar';
import UserActionsDropdown from '@/components/UserActionsDropdown';

const Profile = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
          </div>
          
          <UserActionsDropdown />
        </div>

        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Mon profil</h2>
            <p className="text-muted-foreground">
              Gérez vos informations personnelles et vos connexions
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-1">
              <CardHeader>
                <CardTitle>Informations personnelles</CardTitle>
                <CardDescription>
                  Vos informations de compte
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm text-gray-900 mt-1">{user?.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Compte créé le</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <div className="xl:col-span-2">
              <LinkedInConnectionCard />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
