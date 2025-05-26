
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Linkedin, Unlink, RefreshCw } from 'lucide-react';
import { useLinkedInConnection } from '@/hooks/useLinkedInConnection';

const LinkedInConnectionCard = () => {
  const { connections, loading, connectLinkedIn, disconnectLinkedIn, refreshConnections } = useLinkedInConnection();

  const hasActiveConnection = connections.some(conn => conn.connection_status === 'connected');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Linkedin className="h-5 w-5 text-blue-600" />
          Connexion LinkedIn
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshConnections}
            className="ml-auto"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
        <CardDescription>
          Connectez votre compte LinkedIn via Unipile pour analyser vos publications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connections.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">
              Aucune connexion LinkedIn configurée
            </p>
            <Button onClick={connectLinkedIn} disabled={loading}>
              <Linkedin className="h-4 w-4 mr-2" />
              {loading ? 'Connexion...' : 'Connecter LinkedIn'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map((connection) => (
              <div key={connection.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Linkedin className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="font-medium">Compte LinkedIn</p>
                    {connection.linkedin_profile_url && (
                      <p className="text-sm text-muted-foreground">
                        {connection.linkedin_profile_url}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      ID: {connection.unipile_account_id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={connection.connection_status === 'connected' ? 'default' : 'secondary'}>
                    {connection.connection_status === 'connected' ? 'Connecté' : connection.connection_status}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => disconnectLinkedIn(connection.id)}
                  >
                    <Unlink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {!hasActiveConnection && (
              <Button onClick={connectLinkedIn} disabled={loading} className="w-full">
                <Linkedin className="h-4 w-4 mr-2" />
                {loading ? 'Connexion...' : 'Ajouter une connexion LinkedIn'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LinkedInConnectionCard;
