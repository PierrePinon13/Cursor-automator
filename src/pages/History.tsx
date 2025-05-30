
import { ActivityList } from '@/components/history/ActivityList';
import { SidebarTrigger } from '@/components/ui/sidebar';
import UserActionsDropdown from '@/components/UserActionsDropdown';

const History = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-2xl font-bold text-gray-900">Historique</h1>
          </div>
          
          <UserActionsDropdown />
        </div>

        <ActivityList />
      </div>
    </div>
  );
};

export default History;
