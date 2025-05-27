
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, Wifi } from 'lucide-react';

interface SystemStatusProps {
  className?: string;
}

const SystemStatus = ({ className }: SystemStatusProps) => {
  const [status, setStatus] = React.useState<'operational' | 'degraded' | 'outage'>('operational');
  const [lastCheck, setLastCheck] = React.useState<Date>(new Date());

  // This would be connected to a real status monitoring system
  const checkSystemStatus = React.useCallback(async () => {
    try {
      // In a real implementation, this would check Unipile API health
      // For now, we'll simulate based on recent errors
      setStatus('operational');
      setLastCheck(new Date());
    } catch (error) {
      setStatus('degraded');
    }
  }, []);

  React.useEffect(() => {
    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [checkSystemStatus]);

  const getStatusInfo = () => {
    switch (status) {
      case 'operational':
        return {
          icon: CheckCircle,
          color: 'bg-green-100 text-green-800 border-green-200',
          badgeColor: 'bg-green-500',
          title: 'Tous les systèmes sont opérationnels',
          description: 'LinkedIn et tous les services fonctionnent normalement.'
        };
      case 'degraded':
        return {
          icon: AlertCircle,
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          badgeColor: 'bg-yellow-500',
          title: 'Performance dégradée',
          description: 'Certains services LinkedIn peuvent être lents. Les messages seront automatiquement renvoyés.'
        };
      case 'outage':
        return {
          icon: Wifi,
          color: 'bg-red-100 text-red-800 border-red-200',
          badgeColor: 'bg-red-500',
          title: 'Interruption de service',
          description: 'LinkedIn est temporairement indisponible. Vos messages seront mis en file d\'attente.'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;

  if (status === 'operational') {
    return null; // Don't show status when everything is working
  }

  return (
    <Alert className={`${statusInfo.color} ${className}`}>
      <Icon className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        {statusInfo.title}
        <Badge className={`${statusInfo.badgeColor} text-white`}>
          <Clock className="h-3 w-3 mr-1" />
          {lastCheck.toLocaleTimeString()}
        </Badge>
      </AlertTitle>
      <AlertDescription>
        {statusInfo.description}
      </AlertDescription>
    </Alert>
  );
};

export default SystemStatus;
