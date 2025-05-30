
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Linkedin, Unlink, RefreshCw, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { useLinkedInConnection } from '@/hooks/useLinkedInConnection';

const LinkedInConnectionCard = () => {
  const { unipileAccountId, isConnected, loading, syncing, connectLinkedIn, disconnectLinkedIn, syncAccounts, refreshConnection } = useLinkedInConnection();

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
              <RotateCcw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshConnection}
              title="Actualiser la connexion"
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
        {!isConnected ? (
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
                <RotateCcw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Synchronisation...' : 'Synchroniser'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col gap-3 p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Linkedin className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <p className="font-medium">Compte LinkedIn connecté</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ID: {unipileAccountId}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">
                    Connecté
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={disconnectLinkedIn}
                  >
                    <Unlink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LinkedInConnectionCard;
