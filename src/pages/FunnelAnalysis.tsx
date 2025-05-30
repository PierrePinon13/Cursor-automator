
import React, { useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import UserActionsDropdown from '@/components/UserActionsDropdown';
import ProcessingFunnel from '@/components/admin/ProcessingFunnel';
import FunnelFilters from '@/components/admin/FunnelFilters';

const FunnelAnalysis = () => {
  console.log('FunnelAnalysis component rendered');
  const [timeFilter, setTimeFilter] = useState('today');

  console.log('FunnelAnalysis state:', { timeFilter });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-2xl font-bold text-gray-900">Analyse du Funnel de Traitement</h1>
          </div>
          
          <UserActionsDropdown />
        </div>

        <FunnelFilters 
          timeFilter={timeFilter}
          onTimeFilterChange={setTimeFilter}
        />

        <ProcessingFunnel timeFilter={timeFilter} />
      </div>
    </div>
  );
};

export default FunnelAnalysis;
