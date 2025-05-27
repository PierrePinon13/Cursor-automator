
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

  if (userStats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performances par collaborateur</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Aucune donnée disponible pour la période sélectionnée
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performances par collaborateur</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Collaborateur</TableHead>
              <TableHead className="text-right">Messages LinkedIn</TableHead>
              <TableHead className="text-right">Appels +</TableHead>
              <TableHead className="text-right">Appels -</TableHead>
              <TableHead className="text-right">Total appels</TableHead>
              <TableHead className="text-right">Taux de réussite</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {userStats.map((user) => {
              const totalCalls = user.positive_calls + user.negative_calls;
              const successRate = totalCalls > 0 ? (user.positive_calls / totalCalls) * 100 : 0;
              
              return (
                <TableRow key={user.user_id}>
                  <TableCell className="font-medium">
                    {user.user_email}
                  </TableCell>
                  <TableCell className="text-right">
                    {user.linkedin_messages_sent}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {user.positive_calls}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {user.negative_calls}
                  </TableCell>
                  <TableCell className="text-right">
                    {totalCalls}
                  </TableCell>
                  <TableCell className="text-right">
                    {successRate.toFixed(1)}%
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default UserStatsTable;
