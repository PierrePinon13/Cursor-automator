import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, TrendingDown } from 'lucide-react';

interface UserStat {
  user_id: string;
  user_email?: string;
  linkedin_messages_sent: number;
  positive_calls: number;
  negative_calls: number;
}

interface UserStatsTableProps {
  stats: UserStat[];
}

const UserStatsTable = ({ stats }: UserStatsTableProps) => {
  // Agrégation des stats par utilisateur
  const userAggregatedStats = stats.reduce((acc, stat) => {
    const userId = stat.user_id;
    if (!acc[userId]) {
      acc[userId] = {
        user_id: userId,
        user_email: stat.user_email || 'Utilisateur inconnu',
        linkedin_messages_sent: 0,
        positive_calls: 0,
        negative_calls: 0,
      };
    }
    
    acc[userId].linkedin_messages_sent += stat.linkedin_messages_sent;
    acc[userId].positive_calls += stat.positive_calls;
    acc[userId].negative_calls += stat.negative_calls;
    
    return acc;
  }, {} as Record<string, {
    user_id: string;
    user_email: string;
    linkedin_messages_sent: number;
    positive_calls: number;
    negative_calls: number;
  }>);

  const userStats = Object.values(userAggregatedStats)
    .sort((a, b) => (b.positive_calls + b.negative_calls) - (a.positive_calls + a.negative_calls));

  // Helper function to get display name from email
  const getDisplayName = (email: string) => {
    if (email === 'Utilisateur inconnu') return email;
    
    // Extract name from email (before @)
    const nameFromEmail = email.split('@')[0];
    
    // Convert formats like "prenom.nom" or "prenom_nom" to "Prénom Nom"
    const nameParts = nameFromEmail
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
    
    return nameParts.join(' ');
  };

  if (userStats.length === 0) {
    return (
      <Card className="shadow-sm border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-600" />
            Performances par collaborateur
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium text-gray-600 mb-2">Aucune donnée disponible</p>
            <p className="text-sm text-gray-500">
              Les performances des collaborateurs apparaîtront ici pour la période sélectionnée
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-gray-600" />
          Performances par collaborateur
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Collaborateur</TableHead>
                <TableHead className="text-right font-semibold">Messages LinkedIn</TableHead>
                <TableHead className="text-right font-semibold">Appels +</TableHead>
                <TableHead className="text-right font-semibold">Appels -</TableHead>
                <TableHead className="text-right font-semibold">Total appels</TableHead>
                <TableHead className="text-right font-semibold">Taux de réussite</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userStats.map((user, index) => {
                const totalCalls = user.positive_calls + user.negative_calls;
                const successRate = totalCalls > 0 ? (user.positive_calls / totalCalls) * 100 : 0;
                const displayName = getDisplayName(user.user_email);
                
                return (
                  <TableRow key={user.user_id} className="hover:bg-gray-50 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-sm font-semibold">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">{displayName}</span>
                          <span className="text-xs text-gray-500">{user.user_email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {user.linkedin_messages_sent}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {user.positive_calls}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        {user.negative_calls}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {totalCalls}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {successRate >= 50 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        <span className={`font-semibold ${successRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                          {successRate.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserStatsTable;
