
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-blue-800">Messages LinkedIn</CardTitle>
          <div className="p-2 bg-blue-200 rounded-lg">
            <MessageSquare className="h-4 w-4 text-blue-700" />
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="text-3xl font-bold text-blue-900 mb-1">{linkedinMessages}</div>
          <p className="text-xs text-blue-600">
            Messages envoyés
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-green-800">Appels positifs</CardTitle>
          <div className="p-2 bg-green-200 rounded-lg">
            <Phone className="h-4 w-4 text-green-700" />
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="text-3xl font-bold text-green-900 mb-1">{positiveCalls}</div>
          <p className="text-xs text-green-600">
            Appels réussis
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-red-800">Appels négatifs</CardTitle>
          <div className="p-2 bg-red-200 rounded-lg">
            <PhoneOff className="h-4 w-4 text-red-700" />
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="text-3xl font-bold text-red-900 mb-1">{negativeCalls}</div>
          <p className="text-xs text-red-600">
            Appels non aboutis
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-purple-800">Taux de réussite</CardTitle>
          <div className="p-2 bg-purple-200 rounded-lg">
            <TrendingUp className="h-4 w-4 text-purple-700" />
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="text-3xl font-bold text-purple-900 mb-1">{successRate.toFixed(1)}%</div>
          <p className="text-xs text-purple-600">
            Sur {totalCalls} appels
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsCards;
