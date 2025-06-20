
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Trash2, Play, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface KeywordGroup {
  id: string;
  keywords: string[];
  operator: 'OR' | 'AND';
}

interface SearchConfiguration {
  id: string;
  name: string;
  group1: KeywordGroup;
  group2: KeywordGroup;
  autoScraping: boolean;
  active: boolean;
}

const SearchPosts = () => {
  const [searches, setSearches] = useState<SearchConfiguration[]>([]);
  const [newSearch, setNewSearch] = useState<SearchConfiguration>({
    id: '',
    name: '',
    group1: { id: 'group1', keywords: [''], operator: 'OR' },
    group2: { id: 'group2', keywords: ['', '', '', ''], operator: 'OR' },
    autoScraping: false,
    active: true
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const addKeyword = (groupId: 'group1' | 'group2') => {
    if (groupId === 'group1' && newSearch.group1.keywords.length < 2) {
      setNewSearch(prev => ({
        ...prev,
        group1: {
          ...prev.group1,
          keywords: [...prev.group1.keywords, '']
        }
      }));
    } else if (groupId === 'group2' && newSearch.group2.keywords.length < 4) {
      setNewSearch(prev => ({
        ...prev,
        group2: {
          ...prev.group2,
          keywords: [...prev.group2.keywords, '']
        }
      }));
    }
  };

  const removeKeyword = (groupId: 'group1' | 'group2', index: number) => {
    setNewSearch(prev => ({
      ...prev,
      [groupId]: {
        ...prev[groupId],
        keywords: prev[groupId].keywords.filter((_, i) => i !== index)
      }
    }));
  };

  const updateKeyword = (groupId: 'group1' | 'group2', index: number, value: string) => {
    setNewSearch(prev => ({
      ...prev,
      [groupId]: {
        ...prev[groupId],
        keywords: prev[groupId].keywords.map((kw, i) => i === index ? value : kw)
      }
    }));
  };

  const updateOperator = (groupId: 'group1' | 'group2', operator: 'OR' | 'AND') => {
    setNewSearch(prev => ({
      ...prev,
      [groupId]: {
        ...prev[groupId],
        operator
      }
    }));
  };

  const saveSearch = () => {
    if (!newSearch.name.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un nom pour la recherche",
        variant: "destructive"
      });
      return;
    }

    const filteredGroup1 = newSearch.group1.keywords.filter(kw => kw.trim());
    const filteredGroup2 = newSearch.group2.keywords.filter(kw => kw.trim());

    if (filteredGroup1.length === 0 && filteredGroup2.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir au moins un mot-clé",
        variant: "destructive"
      });
      return;
    }

    const searchToSave: SearchConfiguration = {
      ...newSearch,
      id: Date.now().toString(),
      group1: { ...newSearch.group1, keywords: filteredGroup1 },
      group2: { ...newSearch.group2, keywords: filteredGroup2 }
    };

    setSearches(prev => [...prev, searchToSave]);
    setNewSearch({
      id: '',
      name: '',
      group1: { id: 'group1', keywords: [''], operator: 'OR' },
      group2: { id: 'group2', keywords: ['', '', '', ''], operator: 'OR' },
      autoScraping: false,
      active: true
    });

    toast({
      title: "Succès",
      description: "Recherche sauvegardée avec succès",
    });
  };

  const deleteSearch = (id: string) => {
    setSearches(prev => prev.filter(search => search.id !== id));
    toast({
      title: "Succès",
      description: "Recherche supprimée",
    });
  };

  const toggleAutoScraping = (id: string) => {
    setSearches(prev => prev.map(search => 
      search.id === id 
        ? { ...search, autoScraping: !search.autoScraping }
        : search
    ));
  };

  const toggleActive = (id: string) => {
    setSearches(prev => prev.map(search => 
      search.id === id 
        ? { ...search, active: !search.active }
        : search
    ));
  };

  const triggerSearch = async (search: SearchConfiguration) => {
    setLoading(true);
    
    try {
      console.log('🔍 Triggering search:', search.name);
      
      const payload = {
        name: search.name,
        group1: search.group1,
        group2: search.group2,
        autoScraping: search.autoScraping
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

      toast({
        title: "Succès",
        description: `Recherche "${search.name}" déclenchée avec succès`,
      });

    } catch (error: any) {
      console.error('❌ Error triggering search:', error);
      toast({
        title: "Erreur",
        description: "Impossible de déclencher la recherche",
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

            {/* Groupe 1 - Max 2 mots-clés */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Groupe 1 (max 2 mots-clés)</h3>
                <Select
                  value={newSearch.group1.operator}
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
              
              {newSearch.group1.keywords.map((keyword, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={keyword}
                    onChange={(e) => updateKeyword('group1', index, e.target.value)}
                    placeholder={`Mot-clé ${index + 1}`}
                  />
                  {newSearch.group1.keywords.length > 1 && (
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
              
              {newSearch.group1.keywords.length < 2 && (
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
                  value={newSearch.group2.operator}
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
              
              {newSearch.group2.keywords.map((keyword, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={keyword}
                    onChange={(e) => updateKeyword('group2', index, e.target.value)}
                    placeholder={`Mot-clé ${index + 1}`}
                  />
                  {newSearch.group2.keywords.length > 1 && (
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
              
              {newSearch.group2.keywords.length < 4 && (
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
                      <h3 className="font-semibold text-lg">{search.name}</h3>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={search.active}
                            onCheckedChange={() => toggleActive(search.id)}
                          />
                          <Label className="text-sm">Actif</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={search.autoScraping}
                            onCheckedChange={() => toggleAutoScraping(search.id)}
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
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Groupe 1 ({search.group1.operator})</p>
                        <p className="text-gray-600">{search.group1.keywords.join(`, ${search.group1.operator} `)}</p>
                      </div>
                      <div>
                        <p className="font-medium">Groupe 2 ({search.group2.operator})</p>
                        <p className="text-gray-600">{search.group2.keywords.join(`, ${search.group2.operator} `)}</p>
                      </div>
                    </div>
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
