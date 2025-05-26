
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Linkedin, Unlink, RefreshCw, CheckCircle, AlertCircle, Clock, XCircle } from 'lucide-react';
import { useLinkedInConnection } from '@/hooks/useLinkedInConnection';

const LinkedInConnectionCard = () => {
  const { connections, loading, connectLinkedIn, disconnectLinkedIn, checkStatus, refreshConnections } = useLinkedInConnection();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'credentials_required':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Connecté';
      case 'pending':
        return 'En attente';
      case 'error':
        return 'Erreur';
      case 'credentials_required':
        return 'Reconnexion requise';
      default:
        return status;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'connected':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const hasActiveConnection = connections.some(conn => conn.status === 'connected');

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
                    <div className="flex items-center gap-2">
                      {getStatusIcon(connection.status)}
                      <p className="font-medium">Compte LinkedIn</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ID: {connection.unipile_account_id}
                    </p>
                    {connection.error_message && (
                      <p className="text-xs text-red-600 mt-1">
                        {connection.error_message}
                      </p>
                    )}
                    {connection.connected_at && (
                      <p className="text-xs text-muted-foreground">
                        Connecté le: {new Date(connection.connected_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusVariant(connection.status)}>
                    {getStatusLabel(connection.status)}
                  </Badge>
                  {connection.status === 'credentials_required' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={connectLinkedIn}
                      disabled={loading}
                    >
                      Reconnecter
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => checkStatus(connection.account_id || connection.unipile_account_id)}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
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
