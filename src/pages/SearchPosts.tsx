
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Play, Plus, Link } from 'lucide-react';
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
      const { data, error } = await supabase.rpc('get_next_unipile_account');
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération du compte Unipile:', error);
      return null;
    }
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center gap-4 mb-6">
        <SidebarTrigger />
        <h1 className="text-3xl font-bold text-gray-900">Recherche de Posts</h1>
      </div>

      <div className="space-y-6">
        {/* Nouvelle recherche */}
        <Card>
          <CardHeader>
            <CardTitle>Nouvelle recherche</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="search-name">Nom de la recherche</Label>
              <Input
                id="search-name"
                value={newSearch.name}
                onChange={(e) => setNewSearch(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Développeur React Paris"
              />
            </div>

            <Tabs value={newSearch.searchType} onValueChange={(value: 'parameters' | 'url') => setNewSearch(prev => ({ ...prev, searchType: value }))}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="parameters">Recherche par mots-clés</TabsTrigger>
                <TabsTrigger value="url">Recherche par URLs</TabsTrigger>
              </TabsList>
              
              <TabsContent value="parameters" className="space-y-4">
                {/* Groupe 1 - Max 2 mots-clés */}
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Groupe 1 (max 2 mots-clés)</h3>
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
                    <div key={index} className="flex gap-2">
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

                {/* Groupe 2 - Max 4 mots-clés */}
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Groupe 2 (max 4 mots-clés)</h3>
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
                    <div key={index} className="flex gap-2">
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

              <TabsContent value="url" className="space-y-4">
                {/* URLs individuelles */}
                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold">URLs à scraper</h3>
                  
                  {newSearch.urls?.map((url, index) => (
                    <div key={index} className="flex gap-2">
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
                    <div className="flex gap-2">
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
                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold">Import en masse d'URLs</h3>
                  <Textarea
                    value={bulkUrls}
                    onChange={(e) => setBulkUrls(e.target.value)}
                    placeholder="Collez ici du texte contenant des URLs. Le système détectera automatiquement toutes les URLs et créera une recherche pour chacune."
                    rows={4}
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

            <div className="flex items-center space-x-2">
              <Switch
                id="auto-scraping"
                checked={newSearch.autoScraping}
                onCheckedChange={(checked) => setNewSearch(prev => ({ ...prev, autoScraping: checked }))}
              />
              <Label htmlFor="auto-scraping">Scraping automatique</Label>
            </div>

            <Button onClick={saveSearch} className="w-full">
              Sauvegarder la recherche
            </Button>
          </CardContent>
        </Card>

        {/* Recherches sauvegardées */}
        {searches.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recherches sauvegardées ({searches.length})</CardTitle>
                <Button 
                  onClick={triggerAllActiveSearches}
                  disabled={loading || searches.filter(s => s.active).length === 0}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Déclencher toutes les recherches actives
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {searches.map((search) => (
                  <div key={search.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{search.name}</h3>
                        <div className="text-sm text-gray-500 space-y-1">
                          <span>Type: {search.searchType === 'parameters' ? 'Mots-clés' : 'URLs'}</span>
                          {search.last_executed_at && (
                            <div>Dernière exécution: {new Date(search.last_executed_at).toLocaleString()}</div>
                          )}
                          <div>Exécutions: {search.total_executions}</div>
                          {search.last_execution_status && (
                            <div>Statut: {search.last_execution_status}</div>
                          )}
                          {search.last_execution_posts_count && (
                            <div>Posts obtenus: {search.last_execution_posts_count}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={search.active}
                            onCheckedChange={() => toggleActive(search.id, search.active)}
                          />
                          <Label className="text-sm">Actif</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={search.autoScraping}
                            onCheckedChange={() => toggleAutoScraping(search.id, search.autoScraping)}
                          />
                          <Label className="text-sm">Auto</Label>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => triggerSearch(search)}
                          disabled={loading}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteSearch(search.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {search.searchType === 'parameters' ? (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {search.group1 && (
                          <div>
                            <p className="font-medium">Groupe 1 ({search.group1.operator})</p>
                            <p className="text-gray-600">{search.group1.keywords.join(`, ${search.group1.operator} `)}</p>
                          </div>
                        )}
                        {search.group2 && (
                          <div>
                            <p className="font-medium">Groupe 2 ({search.group2.operator})</p>
                            <p className="text-gray-600">{search.group2.keywords.join(`, ${search.group2.operator} `)}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm">
                        <p className="font-medium">URLs ({search.urls?.length})</p>
                        <div className="text-gray-600 max-h-20 overflow-y-auto">
                          {search.urls?.map((url, index) => (
                            <div key={index} className="truncate">{url}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SearchPosts;
