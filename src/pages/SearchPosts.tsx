import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Trash2, Play, Plus, Link, ExternalLink, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';

interface KeywordGroup {
  id: string;
  keywords: string[];
  operator: 'OR' | 'AND';
}

interface SearchConfiguration {
  id?: string;
  name: string;
  searchType: 'parameters' | 'url';
  group1?: KeywordGroup;
  group2?: KeywordGroup;
  urls?: string[];
  autoScraping: boolean;
  active: boolean;
}

interface SavedSearch extends SearchConfiguration {
  id: string;
  created_at: string;
  last_executed_at?: string;
  total_executions: number;
  last_execution_status?: string;
  last_execution_posts_count?: number;
}

const SearchPosts = () => {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [newSearch, setNewSearch] = useState<SearchConfiguration>({
    name: '',
    searchType: 'parameters',
    group1: { id: 'group1', keywords: [''], operator: 'OR' },
    group2: { id: 'group2', keywords: ['', '', '', ''], operator: 'OR' },
    autoScraping: false,
    active: true
  });
  const [bulkUrls, setBulkUrls] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Charger les recherches sauvegardées
  useEffect(() => {
    loadSavedSearches();
  }, []);

  const loadSavedSearches = async () => {
    try {
      const { data, error } = await supabase
        .from('linkedin_search_configurations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedSearches: SavedSearch[] = data.map(search => ({
        id: search.id,
        name: search.name,
        searchType: search.search_type as 'parameters' | 'url',
        group1: search.group1_keywords ? {
          id: 'group1',
          keywords: search.group1_keywords,
          operator: search.group1_operator as 'OR' | 'AND'
        } : undefined,
        group2: search.group2_keywords ? {
          id: 'group2',
          keywords: search.group2_keywords,
          operator: search.group2_operator as 'OR' | 'AND'
        } : undefined,
        urls: search.urls || undefined,
        autoScraping: search.auto_scraping,
        active: search.active,
        created_at: search.created_at,
        last_executed_at: search.last_executed_at,
        total_executions: search.total_executions,
        last_execution_status: search.last_execution_status,
        last_execution_posts_count: search.last_execution_posts_count
      }));

      setSearches(formattedSearches);
    } catch (error: any) {
      console.error('Erreur lors du chargement des recherches:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les recherches sauvegardées",
        variant: "destructive"
      });
    }
  };

  const addKeyword = (groupId: 'group1' | 'group2') => {
    if (groupId === 'group1' && newSearch.group1 && newSearch.group1.keywords.length < 2) {
      setNewSearch(prev => ({
        ...prev,
        group1: {
          ...prev.group1!,
          keywords: [...prev.group1!.keywords, '']
        }
      }));
    } else if (groupId === 'group2' && newSearch.group2 && newSearch.group2.keywords.length < 4) {
      setNewSearch(prev => ({
        ...prev,
        group2: {
          ...prev.group2!,
          keywords: [...prev.group2!.keywords, '']
        }
      }));
    }
  };

  const removeKeyword = (groupId: 'group1' | 'group2', index: number) => {
    setNewSearch(prev => ({
      ...prev,
      [groupId]: {
        ...prev[groupId]!,
        keywords: prev[groupId]!.keywords.filter((_, i) => i !== index)
      }
    }));
  };

  const updateKeyword = (groupId: 'group1' | 'group2', index: number, value: string) => {
    setNewSearch(prev => ({
      ...prev,
      [groupId]: {
        ...prev[groupId]!,
        keywords: prev[groupId]!.keywords.map((kw, i) => i === index ? value : kw)
      }
    }));
  };

  const updateOperator = (groupId: 'group1' | 'group2', operator: 'OR' | 'AND') => {
    setNewSearch(prev => ({
      ...prev,
      [groupId]: {
        ...prev[groupId]!,
        operator
      }
    }));
  };

  const addUrl = () => {
    setNewSearch(prev => ({
      ...prev,
      urls: [...(prev.urls || []), '']
    }));
  };

  const removeUrl = (index: number) => {
    setNewSearch(prev => ({
      ...prev,
      urls: prev.urls?.filter((_, i) => i !== index) || []
    }));
  };

  const updateUrl = (index: number, value: string) => {
    setNewSearch(prev => ({
      ...prev,
      urls: prev.urls?.map((url, i) => i === index ? value : url) || []
    }));
  };

  const extractUrlsFromText = (text: string): string[] => {
    const urlRegex = /https?:\/\/[^\s]+/g;
    return text.match(urlRegex) || [];
  };

  const processBulkUrls = async () => {
    const extractedUrls = extractUrlsFromText(bulkUrls);
    
    if (extractedUrls.length === 0) {
      toast({
        title: "Aucune URL trouvée",
        description: "Aucune URL valide n'a été détectée dans le texte",
        variant: "destructive"
      });
      return;
    }

    try {
      const searchesToInsert = extractedUrls.map((url, index) => ({
        name: `URL Search ${searches.length + index + 1}`,
        search_type: 'url',
        urls: [url],
        auto_scraping: false,
        active: true
      }));

      const { error } = await supabase
        .from('linkedin_search_configurations')
        .insert(searchesToInsert);

      if (error) throw error;

      setBulkUrls('');
      await loadSavedSearches();
      
      toast({
        title: "Succès",
        description: `${extractedUrls.length} recherche(s) URL créée(s)`,
      });
    } catch (error: any) {
      console.error('Erreur lors de l\'insertion des URLs:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer les recherches URL",
        variant: "destructive"
      });
    }
  };

  const saveSearch = async () => {
    if (!newSearch.name.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un nom pour la recherche",
        variant: "destructive"
      });
      return;
    }

    try {
      let searchToSave: any = {
        name: newSearch.name,
        search_type: newSearch.searchType,
        auto_scraping: newSearch.autoScraping,
        active: newSearch.active
      };

      if (newSearch.searchType === 'parameters') {
        const filteredGroup1 = newSearch.group1?.keywords.filter(kw => kw.trim()) || [];
        const filteredGroup2 = newSearch.group2?.keywords.filter(kw => kw.trim()) || [];

        if (filteredGroup1.length === 0 && filteredGroup2.length === 0) {
          toast({
            title: "Erreur",
            description: "Veuillez saisir au moins un mot-clé",
            variant: "destructive"
          });
          return;
        }

        searchToSave = {
          ...searchToSave,
          group1_keywords: filteredGroup1.length > 0 ? filteredGroup1 : null,
          group1_operator: filteredGroup1.length > 0 ? newSearch.group1?.operator : null,
          group2_keywords: filteredGroup2.length > 0 ? filteredGroup2 : null,
          group2_operator: filteredGroup2.length > 0 ? newSearch.group2?.operator : null
        };
      } else {
        const filteredUrls = newSearch.urls?.filter(url => url.trim()) || [];
        
        if (filteredUrls.length === 0) {
          toast({
            title: "Erreur",
            description: "Veuillez saisir au moins une URL",
            variant: "destructive"
          });
          return;
        }

        searchToSave.urls = filteredUrls;
      }

      const { error } = await supabase
        .from('linkedin_search_configurations')
        .insert([searchToSave]);

      if (error) throw error;

      // Reset form
      setNewSearch({
        name: '',
        searchType: 'parameters',
        group1: { id: 'group1', keywords: [''], operator: 'OR' },
        group2: { id: 'group2', keywords: ['', '', '', ''], operator: 'OR' },
        autoScraping: false,
        active: true
      });

      await loadSavedSearches();

      toast({
        title: "Succès",
        description: "Recherche sauvegardée avec succès",
      });
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la recherche",
        variant: "destructive"
      });
    }
  };

  const deleteSearch = async (id: string) => {
    try {
      const { error } = await supabase
        .from('linkedin_search_configurations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadSavedSearches();
      toast({
        title: "Succès",
        description: "Recherche supprimée",
      });
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la recherche",
        variant: "destructive"
      });
    }
  };

  const toggleAutoScraping = async (id: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('linkedin_search_configurations')
        .update({ auto_scraping: !currentValue })
        .eq('id', id);

      if (error) throw error;

      await loadSavedSearches();
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la recherche",
        variant: "destructive"
      });
    }
  };

  const toggleActive = async (id: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('linkedin_search_configurations')
        .update({ active: !currentValue })
        .eq('id', id);

      if (error) throw error;

      await loadSavedSearches();
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la recherche",
        variant: "destructive"
      });
    }
  };

  const getNextUnipileAccount = async (): Promise<string | null> => {
    try {
      // Récupérer tous les comptes Unipile depuis la table profiles
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('unipile_account_id')
        .not('unipile_account_id', 'is', null);

      if (error) throw error;

      if (!profiles || profiles.length === 0) {
        console.log('❌ Aucun compte Unipile trouvé dans les profils');
        return null;
      }

      // Pour l'instant, retourner le premier compte disponible
      // TODO: Implémenter une logique de rotation plus sophistiquée si nécessaire
      const account = profiles[0];
      console.log(`✅ Compte Unipile sélectionné: ${account.unipile_account_id}`);
      
      return account.unipile_account_id;
    } catch (error) {
      console.error('Erreur lors de la récupération du compte Unipile:', error);
      return null;
    }
  };

  const reserveUnipileAccount = async (accountId: string, searchId: string): Promise<boolean> => {
    // Pour l'instant, toujours retourner true car on utilise les comptes des profiles
    // TODO: Implémenter une logique de réservation si nécessaire
    console.log(`🔒 Réservation du compte ${accountId} pour la recherche ${searchId}`);
    return true;
  };

  const triggerSearch = async (search: SavedSearch) => {
    setLoading(true);
    
    try {
      console.log('🔍 Triggering search:', search.name);
      
      // Obtenir le prochain compte Unipile
      const unipileAccountId = await getNextUnipileAccount();
      
      if (!unipileAccountId) {
        throw new Error('Aucun compte Unipile disponible');
      }

      // Réserver le compte pour cette recherche
      const reserved = await reserveUnipileAccount(unipileAccountId, search.id);
      
      if (!reserved) {
        throw new Error('Impossible de réserver le compte Unipile');
      }

      const payload = {
        search_id: search.id,
        search_type: search.searchType,
        name: search.name,
        autoScraping: search.autoScraping,
        unipile_account_id: unipileAccountId,
        ...(search.searchType === 'parameters' 
          ? {
              group1: search.group1,
              group2: search.group2
            }
          : {
              urls: search.urls
            }
        )
      };

      const response = await fetch('https://n8n.getpro.co/webhook/b13ca864-3739-471d-bad4-c859b4cd6333', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Search triggered successfully:', result);

      // Mettre à jour les stats de la recherche
      await supabase
        .from('linkedin_search_configurations')
        .update({
          last_executed_at: new Date().toISOString(),
          total_executions: search.total_executions + 1,
          last_execution_status: 'sent',
          last_unipile_account_used: unipileAccountId
        })
        .eq('id', search.id);

      await loadSavedSearches();

      toast({
        title: "Succès",
        description: `Recherche "${search.name}" déclenchée avec succès`,
      });

    } catch (error: any) {
      console.error('❌ Error triggering search:', error);
      
      // Mettre à jour le statut d'erreur
      await supabase
        .from('linkedin_search_configurations')
        .update({
          last_execution_status: 'error'
        })
        .eq('id', search.id);

      toast({
        title: "Erreur",
        description: error.message || "Impossible de déclencher la recherche",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerAllActiveSearches = async () => {
    setLoading(true);
    const activeSearches = searches.filter(search => search.active);
    
    try {
      for (const search of activeSearches) {
        await triggerSearch(search);
        // Petit délai entre les recherches pour éviter la surcharge
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      toast({
        title: "Succès",
        description: `${activeSearches.length} recherche(s) déclenchée(s)`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors du déclenchement des recherches",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'sent':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Terminé</Badge>;
      case 'processing':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">En cours</Badge>;
      case 'error':
        return <Badge variant="destructive">Erreur</Badge>;
      case 'sent':
        return <Badge variant="default" className="bg-orange-100 text-orange-800">Envoyé</Badge>;
      default:
        return <Badge variant="secondary">Non exécuté</Badge>;
    }
  };

  const truncateUrl = (url: string, maxLength: number = 50) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Recherche de Posts LinkedIn</h1>
              <p className="text-gray-600 mt-1">Configurez et gérez vos recherches automatisées</p>
            </div>
          </div>
          {searches.length > 0 && (
            <Button 
              onClick={triggerAllActiveSearches}
              disabled={loading || searches.filter(s => s.active).length === 0}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              <Play className="h-4 w-4 mr-2" />
              Lancer toutes les recherches actives ({searches.filter(s => s.active).length})
            </Button>
          )}
        </div>

        {/* Nouvelle recherche */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Plus className="h-5 w-5" />
              Nouvelle recherche
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <Label htmlFor="search-name" className="text-sm font-medium text-gray-700">Nom de la recherche</Label>
              <Input
                id="search-name"
                value={newSearch.name}
                onChange={(e) => setNewSearch(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Développeur React Paris"
                className="mt-1"
              />
            </div>

            <Tabs value={newSearch.searchType} onValueChange={(value: 'parameters' | 'url') => setNewSearch(prev => ({ ...prev, searchType: value }))}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="parameters" className="flex items-center gap-2">
                  <span>🔍</span> Recherche par mots-clés
                </TabsTrigger>
                <TabsTrigger value="url" className="flex items-center gap-2">
                  <Link className="h-4 w-4" /> Recherche par URLs
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="parameters" className="space-y-6 mt-6">
                {/* Groupe 1 */}
                <div className="border rounded-lg p-4 bg-gray-50/50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-700">Groupe 1 (max 2 mots-clés)</h3>
                    <Select
                      value={newSearch.group1?.operator}
                      onValueChange={(value: 'OR' | 'AND') => updateOperator('group1', value)}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OR">OR</SelectItem>
                        <SelectItem value="AND">AND</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {newSearch.group1?.keywords.map((keyword, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        value={keyword}
                        onChange={(e) => updateKeyword('group1', index, e.target.value)}
                        placeholder={`Mot-clé ${index + 1}`}
                      />
                      {newSearch.group1!.keywords.length > 1 && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => removeKeyword('group1', index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  {newSearch.group1 && newSearch.group1.keywords.length < 2 && (
                    <Button
                      variant="outline"
                      onClick={() => addKeyword('group1')}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter un mot-clé
                    </Button>
                  )}
                </div>

                {/* Groupe 2 */}
                <div className="border rounded-lg p-4 bg-gray-50/50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-700">Groupe 2 (max 4 mots-clés)</h3>
                    <Select
                      value={newSearch.group2?.operator}
                      onValueChange={(value: 'OR' | 'AND') => updateOperator('group2', value)}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OR">OR</SelectItem>
                        <SelectItem value="AND">AND</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {newSearch.group2?.keywords.map((keyword, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        value={keyword}
                        onChange={(e) => updateKeyword('group2', index, e.target.value)}
                        placeholder={`Mot-clé ${index + 1}`}
                      />
                      {newSearch.group2!.keywords.length > 1 && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => removeKeyword('group2', index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  {newSearch.group2 && newSearch.group2.keywords.length < 4 && (
                    <Button
                      variant="outline"
                      onClick={() => addKeyword('group2')}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter un mot-clé
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="url" className="space-y-6 mt-6">
                {/* URLs individuelles */}
                <div className="border rounded-lg p-4 bg-gray-50/50">
                  <h3 className="font-semibold text-gray-700 mb-4">URLs à scraper</h3>
                  
                  {newSearch.urls?.map((url, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        value={url}
                        onChange={(e) => updateUrl(index, e.target.value)}
                        placeholder={`URL ${index + 1}`}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeUrl(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )) || (
                    <div className="flex gap-2 mb-2">
                      <Input
                        value=""
                        onChange={(e) => setNewSearch(prev => ({ ...prev, urls: [e.target.value] }))}
                        placeholder="URL 1"
                      />
                    </div>
                  )}
                  
                  <Button
                    variant="outline"
                    onClick={addUrl}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une URL
                  </Button>
                </div>

                {/* URLs en bulk */}
                <div className="border rounded-lg p-4 bg-blue-50/50">
                  <h3 className="font-semibold text-blue-800 mb-4">Import en masse d'URLs</h3>
                  <Textarea
                    value={bulkUrls}
                    onChange={(e) => setBulkUrls(e.target.value)}
                    placeholder="Collez ici du texte contenant des URLs. Le système détectera automatiquement toutes les URLs et créera une recherche pour chacune."
                    rows={4}
                    className="mb-4"
                  />
                  <Button
                    variant="outline"
                    onClick={processBulkUrls}
                    className="w-full"
                    disabled={!bulkUrls.trim()}
                  >
                    <Link className="h-4 w-4 mr-2" />
                    Détecter et créer les recherches
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-scraping"
                  checked={newSearch.autoScraping}
                  onCheckedChange={(checked) => setNewSearch(prev => ({ ...prev, autoScraping: checked }))}
                />
                <Label htmlFor="auto-scraping" className="text-sm text-gray-700">Scraping automatique</Label>
              </div>

              <Button onClick={saveSearch} className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800">
                <Plus className="h-4 w-4 mr-2" />
                Sauvegarder la recherche
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recherches sauvegardées */}
        {searches.length > 0 && (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-purple-900">
                <span>📚</span> Recherches sauvegardées ({searches.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-4">
                {searches.map((search) => (
                  <Card key={search.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg text-gray-900 truncate">{search.name}</h3>
                            {getStatusBadge(search.last_execution_status)}
                            <Badge variant={search.searchType === 'parameters' ? 'default' : 'secondary'}>
                              {search.searchType === 'parameters' ? '🔍 Mots-clés' : '🔗 URLs'}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                            {search.last_executed_at && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Dernière exécution: {new Date(search.last_executed_at).toLocaleString()}
                              </div>
                            )}
                            <div>Exécutions: {search.total_executions}</div>
                            {search.last_execution_posts_count !== null && (
                              <div>Posts obtenus: {search.last_execution_posts_count}</div>
                            )}
                          </div>
                          
                          {search.searchType === 'parameters' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              {search.group1 && (
                                <div className="bg-gray-50 rounded p-2">
                                  <p className="font-medium text-gray-700">Groupe 1 ({search.group1.operator})</p>
                                  <p className="text-gray-600">{search.group1.keywords.join(`, ${search.group1.operator} `)}</p>
                                </div>
                              )}
                              {search.group2 && (
                                <div className="bg-gray-50 rounded p-2">
                                  <p className="font-medium text-gray-700">Groupe 2 ({search.group2.operator})</p>
                                  <p className="text-gray-600">{search.group2.keywords.join(`, ${search.group2.operator} `)}</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="bg-gray-50 rounded p-2">
                              <p className="font-medium text-gray-700 mb-2">URLs ({search.urls?.length})</p>
                              <div className="space-y-1 max-h-20 overflow-y-auto">
                                {search.urls?.map((url, index) => (
                                  <div key={index} className="flex items-center gap-2 text-gray-600">
                                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate" title={url}>{truncateUrl(url)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={search.active}
                              onCheckedChange={() => toggleActive(search.id, search.active)}
                            />
                            <Label className="text-xs text-gray-600">Actif</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={search.autoScraping}
                              onCheckedChange={() => toggleAutoScraping(search.id, search.autoScraping)}
                            />
                            <Label className="text-xs text-gray-600">Auto</Label>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => triggerSearch(search)}
                            disabled={loading}
                            className="bg-green-50 border-green-200 hover:bg-green-100"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteSearch(search.id)}
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
            </CardContent>
          </Card>
        )}

        {searches.length === 0 && (
          <Card className="shadow-lg border-2 border-dashed border-gray-300 bg-white/60">
            <CardContent className="text-center py-16">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Aucune recherche sauvegardée
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Créez votre première recherche LinkedIn pour commencer à collecter des posts automatiquement.
              </p>
              <Button 
                onClick={() => document.getElementById('search-name')?.focus()} 
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer ma première recherche
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SearchPosts;
