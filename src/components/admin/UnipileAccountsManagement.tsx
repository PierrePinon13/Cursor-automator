
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Clock, User, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UnipileAccount {
  id: string;
  account_id: string;
  account_name: string;
  is_active: boolean;
  last_used_at: string | null;
  daily_usage_count: number;
  daily_limit: number;
  current_search_id: string | null;
  search_started_at: string | null;
  created_at: string;
}

const UnipileAccountsManagement = () => {
  const [accounts, setAccounts] = useState<UnipileAccount[]>([]);
  const [newAccount, setNewAccount] = useState({
    account_id: '',
    account_name: '',
    daily_limit: 100
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAccounts();
    // Rafraîchir toutes les 30 secondes pour voir les changements en temps réel
    const interval = setInterval(loadAccounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('unipile_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des comptes:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les comptes Unipile",
        variant: "destructive"
      });
    }
  };

  const addAccount = async () => {
    if (!newAccount.account_id.trim() || !newAccount.account_name.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('unipile_accounts')
        .insert([{
          account_id: newAccount.account_id.trim(),
          account_name: newAccount.account_name.trim(),
          daily_limit: newAccount.daily_limit,
          is_active: true
        }]);

      if (error) throw error;

      setNewAccount({
        account_id: '',
        account_name: '',
        daily_limit: 100
      });

      await loadAccounts();
      toast({
        title: "Succès",
        description: "Compte Unipile ajouté avec succès",
      });
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout:', error);
      toast({
        title: "Erreur",
        description: error.message.includes('duplicate') 
          ? "Ce compte ID existe déjà" 
          : "Impossible d'ajouter le compte",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('unipile_accounts')
        .update({ is_active: !currentValue })
        .eq('id', id);

      if (error) throw error;
      await loadAccounts();
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le compte",
        variant: "destructive"
      });
    }
  };

  const updateDailyLimit = async (id: string, newLimit: number) => {
    try {
      const { error } = await supabase
        .from('unipile_accounts')
        .update({ daily_limit: newLimit })
        .eq('id', id);

      if (error) throw error;
      await loadAccounts();
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la limite",
        variant: "destructive"
      });
    }
  };

  const deleteAccount = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce compte ?')) return;

    try {
      const { error } = await supabase
        .from('unipile_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadAccounts();
      toast({
        title: "Succès",
        description: "Compte supprimé",
      });
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le compte",
        variant: "destructive"
      });
    }
  };

  const forceReleaseAccount = async (id: string) => {
    try {
      const { error } = await supabase
        .from('unipile_accounts')
        .update({ 
          current_search_id: null,
          search_started_at: null 
        })
        .eq('id', id);

      if (error) throw error;
      await loadAccounts();
      toast({
        title: "Succès",
        description: "Compte libéré manuellement",
      });
    } catch (error: any) {
      console.error('Erreur lors de la libération:', error);
      toast({
        title: "Erreur",
        description: "Impossible de libérer le compte",
        variant: "destructive"
      });
    }
  };

  const getAccountStatus = (account: UnipileAccount) => {
    if (!account.is_active) {
      return <Badge variant="secondary">Inactif</Badge>;
    }
    if (account.current_search_id) {
      return <Badge variant="default" className="bg-orange-100 text-orange-800">En cours</Badge>;
    }
    if (account.daily_usage_count >= account.daily_limit) {
      return <Badge variant="destructive">Limite atteinte</Badge>;
    }
    return <Badge variant="default" className="bg-green-100 text-green-800">Disponible</Badge>;
  };

  const isAccountBlocked = (account: UnipileAccount) => {
    if (!account.search_started_at) return false;
    const startTime = new Date(account.search_started_at);
    const now = new Date();
    return (now.getTime() - startTime.getTime()) > 60 * 60 * 1000; // Plus d'1 heure
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Gestion des comptes Unipile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ajouter un nouveau compte */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold mb-4">Ajouter un nouveau compte</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="account_id">ID du compte Unipile</Label>
                <Input
                  id="account_id"
                  value={newAccount.account_id}
                  onChange={(e) => setNewAccount(prev => ({ ...prev, account_id: e.target.value }))}
                  placeholder="unipile_account_xxx"
                />
              </div>
              <div>
                <Label htmlFor="account_name">Nom du compte</Label>
                <Input
                  id="account_name"
                  value={newAccount.account_name}
                  onChange={(e) => setNewAccount(prev => ({ ...prev, account_name: e.target.value }))}
                  placeholder="Compte LinkedIn 1"
                />
              </div>
              <div>
                <Label htmlFor="daily_limit">Limite quotidienne</Label>
                <Input
                  id="daily_limit"
                  type="number"
                  value={newAccount.daily_limit}
                  onChange={(e) => setNewAccount(prev => ({ ...prev, daily_limit: parseInt(e.target.value) }))}
                  min="1"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={addAccount}
                  disabled={loading}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </div>
          </div>

          {/* Liste des comptes */}
          <div className="space-y-4">
            <h3 className="font-semibold">Comptes existants ({accounts.length})</h3>
            {accounts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aucun compte Unipile configuré</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {accounts.map((account) => (
                  <Card key={account.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-lg truncate">{account.account_name}</h4>
                            {getAccountStatus(account)}
                            {isAccountBlocked(account) && (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Bloqué {'>'}1h
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">ID:</span> {account.account_id}
                            </div>
                            <div>
                              <span className="font-medium">Usage:</span> {account.daily_usage_count}/{account.daily_limit}
                            </div>
                            {account.last_used_at && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Dernière utilisation: {new Date(account.last_used_at).toLocaleString()}
                              </div>
                            )}
                            {account.current_search_id && (
                              <div className="md:col-span-3 bg-orange-50 border border-orange-200 rounded p-2">
                                <span className="font-medium text-orange-800">Recherche en cours:</span> {account.current_search_id}
                                {account.search_started_at && (
                                  <div className="text-xs text-orange-600 mt-1">
                                    Démarrée: {new Date(account.search_started_at).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={account.is_active}
                              onCheckedChange={() => toggleActive(account.id, account.is_active)}
                              size="sm"
                            />
                            <Label className="text-xs text-gray-600">Actif</Label>
                          </div>
                          
                          <Input
                            type="number"
                            value={account.daily_limit}
                            onChange={(e) => updateDailyLimit(account.id, parseInt(e.target.value))}
                            className="w-16 h-8 text-xs"
                            min="1"
                          />
                          
                          {account.current_search_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => forceReleaseAccount(account.id)}
                              className="bg-orange-50 border-orange-200 hover:bg-orange-100"
                            >
                              Libérer
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteAccount(account.id)}
                            className="bg-red-50 border-red-200 hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnipileAccountsManagement;
