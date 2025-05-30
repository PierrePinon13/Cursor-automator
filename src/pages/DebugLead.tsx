
import React from 'react';
import { useParams } from 'react-router-dom';
import LeadDebugPanel from '@/components/debug/LeadDebugPanel';
import { SidebarTrigger } from '@/components/ui/sidebar';
import UserActionsDropdown from '@/components/UserActionsDropdown';

const DebugLead = () => {
  const { leadId } = useParams<{ leadId?: string }>();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-2xl font-bold text-gray-900">Debug Lead</h1>
          </div>
          
          <UserActionsDropdown />
        </div>
        
        <LeadDebugPanel leadId={leadId} />
      </div>
    </div>
  );
};

export default DebugLead;
