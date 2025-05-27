
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Phone, PhoneOff, TrendingUp } from 'lucide-react';

interface StatsCardsProps {
  linkedinMessages: number;
  positiveCalls: number;
  negativeCalls: number;
  successRate: number;
}

const StatsCards = ({
  linkedinMessages,
  positiveCalls,
  negativeCalls,
  successRate,
}: StatsCardsProps) => {
  const totalCalls = positiveCalls + negativeCalls;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium">Messages LinkedIn</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pb-3">
          <div className="text-2xl font-bold">{linkedinMessages}</div>
          <p className="text-xs text-muted-foreground">
            Messages envoyés
          </p>
        </CardContent>
      </Card>
      
      <Card className="border border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium">Appels positifs</CardTitle>
          <Phone className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent className="pb-3">
          <div className="text-2xl font-bold text-green-600">{positiveCalls}</div>
          <p className="text-xs text-muted-foreground">
            Appels réussis
          </p>
        </CardContent>
      </Card>
      
      <Card className="border border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium">Appels négatifs</CardTitle>
          <PhoneOff className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent className="pb-3">
          <div className="text-2xl font-bold text-red-600">{negativeCalls}</div>
          <p className="text-xs text-muted-foreground">
            Appels non aboutis
          </p>
        </CardContent>
      </Card>
      
      <Card className="border border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium">Taux de réussite</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pb-3">
          <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">
            Sur {totalCalls} appels
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsCards;
