
import React from 'react';
import { useParams } from 'react-router-dom';
import LeadDebugPanel from '@/components/debug/LeadDebugPanel';
import { SidebarTrigger } from '@/components/ui/sidebar';

const DebugLead = () => {
  const { leadId } = useParams<{ leadId?: string }>();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold text-gray-900">Debug Lead</h1>
        </div>
        
        <LeadDebugPanel leadId={leadId} />
      </div>
    </div>
  );
};

export default DebugLead;
