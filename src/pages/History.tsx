
import { useState } from 'react';
import ActivityList from '@/components/history/ActivityList';
import { SidebarTrigger } from '@/components/ui/sidebar';
import UserActionsDropdown from '@/components/UserActionsDropdown';
import { useActivities } from '@/hooks/useActivities';

interface Activity {
  id: string;
  type: 'lead_assigned' | 'reminder_due' | 'linkedin_message' | 'phone_call';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  lead_data?: any;
  sender_name?: string;
  message_type?: 'connection_request' | 'direct_message';
}

const History = () => {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const { activities, loading } = useActivities();

  const handleSelectActivity = (activity: Activity) => {
    setSelectedActivity(activity);
  };

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

        {loading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <ActivityList 
            activities={activities}
            selectedActivity={selectedActivity}
            onSelectActivity={handleSelectActivity}
          />
        )}
      </div>
    </div>
  );
};

export default History;
