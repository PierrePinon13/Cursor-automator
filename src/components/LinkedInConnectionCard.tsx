import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Linkedin, Unlink, RefreshCw, CheckCircle, AlertCircle, Clock, XCircle, AlertTriangle, ShieldAlert, Sync } from 'lucide-react';
import { useLinkedInConnection } from '@/hooks/useLinkedInConnection';

const LinkedInConnectionCard = () => {
  const { connections, loading, checkingStatus, syncing, connectLinkedIn, disconnectLinkedIn, checkStatus, syncAccounts, refreshConnections } = useLinkedInConnection();

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
      case 'validation_required':
        return <AlertTriangle className="h-4 w-4 text-blue-600" />;
      case 'checkpoint_required':
        return <ShieldAlert className="h-4 w-4 text-purple-600" />;
      case 'captcha_required':
        return <AlertTriangle className="h-4 w-4 text-yellow-700" />;
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-gray-600" />;
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
      case 'validation_required':
        return 'Validation requise';
      case 'checkpoint_required':
        return 'Vérification requise';
      case 'captcha_required':
        return 'Captcha requis';
      case 'disconnected':
        return 'Déconnecté';
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
      case 'disconnected':
        return 'destructive';
      case 'credentials_required':
      case 'validation_required':
      case 'checkpoint_required':
      case 'captcha_required':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusHelp = (status: string) => {
    switch (status) {
      case 'credentials_required':
        return 'Cliquez sur "Reconnecter" pour mettre à jour vos identifiants LinkedIn';
      case 'validation_required':
        return 'Ouvrez votre application LinkedIn et validez la connexion';
      case 'checkpoint_required':
        return 'Une vérification est requise (code 2FA, validation de sécurité)';
      case 'captcha_required':
        return 'Un captcha doit être résolu pour rétablir la connexion';
      case 'disconnected':
        return 'Le compte a été déconnecté, reconnectez-vous pour continuer';
      default:
        return null;
    }
  };

  const needsUserAction = (status: string) => {
    return ['credentials_required', 'validation_required', 'checkpoint_required', 'captcha_required', 'disconnected'].includes(status);
  };

  const hasActiveConnection = connections.some(conn => conn.status === 'connected');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Linkedin className="h-5 w-5 text-blue-600" />
          Connexion LinkedIn
          <div className="ml-auto flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={syncAccounts}
              disabled={syncing}
              title="Synchroniser avec Unipile"
            >
              <Sync className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshConnections}
              title="Actualiser la liste"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
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
            <div className="flex gap-2 justify-center">
              <Button onClick={connectLinkedIn} disabled={loading}>
                <Linkedin className="h-4 w-4 mr-2" />
                {loading ? 'Connexion...' : 'Connecter LinkedIn'}
              </Button>
              <Button variant="outline" onClick={syncAccounts} disabled={syncing}>
                <Sync className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Synchronisation...' : 'Synchroniser'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map((connection) => (
              <div key={connection.id} className="flex flex-col gap-3 p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Linkedin className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(connection.status)}
                        <p className="font-medium">Compte LinkedIn</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ID: {connection.account_id || connection.unipile_account_id}
                      </p>
                      {connection.linkedin_profile_url && (
                        <p className="text-xs text-muted-foreground">
                          Profil: {connection.linkedin_profile_url}
                        </p>
                      )}
                      {connection.connected_at && (
                        <p className="text-xs text-muted-foreground">
                          Connecté le: {new Date(connection.connected_at).toLocaleString()}
                        </p>
                      )}
                      {connection.last_update && (
                        <p className="text-xs text-muted-foreground">
                          Dernière vérification: {new Date(connection.last_update).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusVariant(connection.status)}>
                      {getStatusLabel(connection.status)}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => checkStatus(connection.account_id || connection.unipile_account_id)}
                      disabled={checkingStatus}
                      title="Vérifier le statut individuel"
                    >
                      <RefreshCw className={`h-4 w-4 ${checkingStatus ? 'animate-spin' : ''}`} />
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
                
                {connection.error_message && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    {connection.error_message}
                  </div>
                )}
                
                {getStatusHelp(connection.status) && (
                  <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                    💡 {getStatusHelp(connection.status)}
                  </div>
                )}
                
                {needsUserAction(connection.status) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={connectLinkedIn}
                    disabled={loading}
                    className="w-full"
                  >
                    <Linkedin className="h-4 w-4 mr-2" />
                    {loading ? 'Reconnexion...' : 'Reconnecter'}
                  </Button>
                )}
              </div>
            ))}
            {!hasActiveConnection && (
              <div className="flex gap-2">
                <Button onClick={connectLinkedIn} disabled={loading} className="flex-1">
                  <Linkedin className="h-4 w-4 mr-2" />
                  {loading ? 'Connexion...' : 'Ajouter une connexion LinkedIn'}
                </Button>
                <Button variant="outline" onClick={syncAccounts} disabled={syncing}>
                  <Sync className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                  Sync
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LinkedInConnectionCard;
