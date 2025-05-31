
import SystemStatus from '@/components/SystemStatus';
import { SidebarTrigger } from '@/components/ui/sidebar';
import UserActionsDropdown from '@/components/UserActionsDropdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, BarChart3, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FunnelChart from '@/components/admin/FunnelChart';
import FunnelFilters from '@/components/admin/FunnelFilters';
import ApifyWebhookStats from '@/components/admin/ApifyWebhookStats';
import { useState } from 'react';

const Admin = () => {
  console.log('Admin component rendered');
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState('today');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
          </div>
          
          <UserActionsDropdown />
        </div>

        <div className="mb-8">
          <FunnelFilters 
            timeFilter={timeFilter}
            onTimeFilterChange={setTimeFilter}
          />
          
          <FunnelChart timeFilter={timeFilter} />
        </div>

        <div className="mb-8">
          <ApifyWebhookStats />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Analyse du Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Analysez le funnel de traitement des données pour identifier où les leads sont perdus dans le processus.
              </p>
              <Button 
                onClick={() => {
                  console.log('Navigating to funnel analysis');
                  navigate('/funnel-analysis');
                }}
              >
                Voir l'analyse du funnel
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Statut du Système
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Surveillez l'état général du système et les métriques de performance.
              </p>
              <Button variant="outline" onClick={() => document.getElementById('system-status')?.scrollIntoView()}>
                Voir le statut
              </Button>
            </CardContent>
          </Card>
        </div>

        <div id="system-status">
          <SystemStatus />
        </div>
      </div>
    </div>
  );
};

export default Admin;
