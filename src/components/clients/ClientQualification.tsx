
import { useState } from 'react';
import { useClients } from '@/hooks/useClients';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';

interface ClientQualificationProps {
  onBack: () => void;
}

export function ClientQualification({ onBack }: ClientQualificationProps) {
  const { clients, updateClient, getUnqualifiedClients } = useClients();
  const [updating, setUpdating] = useState<Set<string>>(new Set());
  
  const unqualifiedClients = getUnqualifiedClients();

  const handleTierUpdate = async (clientId: string, tier: string) => {
    setUpdating(prev => new Set(prev).add(clientId));
    try {
      await updateClient(clientId, { tier });
    } finally {
      setUpdating(prev => {
        const newSet = new Set(prev);
        newSet.delete(clientId);
        return newSet;
      });
    }
  };

  const handleTrackingUpdate = async (clientId: string, trackingEnabled: boolean) => {
    setUpdating(prev => new Set(prev).add(clientId));
    try {
      await updateClient(clientId, { tracking_enabled: trackingEnabled });
    } finally {
      setUpdating(prev => {
        const newSet = new Set(prev);
        newSet.delete(clientId);
        return newSet;
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
        <h2 className="text-xl font-semibold">Qualification des clients</h2>
        <Badge variant="secondary">
          {unqualifiedClients.length} clients non qualifiés
        </Badge>
      </div>

      {unqualifiedClients.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Tous les clients sont qualifiés !</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {unqualifiedClients.map((client) => (
            <Card key={client.id}>
              <CardHeader>
                <CardTitle className="text-lg">{client.company_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`tier-${client.id}`}>Tier</Label>
                    <Select
                      value={client.tier || ''}
                      onValueChange={(value) => handleTierUpdate(client.id, value)}
                      disabled={updating.has(client.id)}
                    >
                      <SelectTrigger id={`tier-${client.id}`}>
                        <SelectValue placeholder="Sélectionner un tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tier 1">Tier 1</SelectItem>
                        <SelectItem value="Tier 2">Tier 2</SelectItem>
                        <SelectItem value="Tier 3">Tier 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`tracking-${client.id}`}
                      checked={client.tracking_enabled}
                      onCheckedChange={(checked) => handleTrackingUpdate(client.id, checked)}
                      disabled={updating.has(client.id)}
                    />
                    <Label htmlFor={`tracking-${client.id}`}>Suivi activé</Label>
                  </div>
                </div>

                {updating.has(client.id) && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Mise à jour en cours...
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
