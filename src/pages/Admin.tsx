
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Settings, FileText, Save } from 'lucide-react';
import ProcessingMetrics from '@/components/dashboard/ProcessingMetrics';
import DiagnosticsPanel from '@/components/dashboard/DiagnosticsPanel';
import { useOpenAIPrompts } from '@/hooks/useOpenAIPrompts';

const Admin = () => {
  const { user } = useAuth();
  const { prompts, loading: promptsLoading, saving, savePrompt } = useOpenAIPrompts();
  
  // Only allow Pierre Pinon to access this page
  const isAuthorized = user?.email === 'ppinon@getpro.fr';
  
  const [timeFilter, setTimeFilter] = useState('this-week');
  const [editedPrompts, setEditedPrompts] = useState<Record<number, string>>({});
  const [confirmations, setConfirmations] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!promptsLoading && prompts) {
      setEditedPrompts(prompts);
    }
  }, [prompts, promptsLoading]);

  const handlePromptChange = (step: number, value: string) => {
    setEditedPrompts(prev => ({
      ...prev,
      [step]: value
    }));
  };

  const handleConfirmationChange = (step: number, value: string) => {
    setConfirmations(prev => ({
      ...prev,
      [step]: value
    }));
  };

  const handleSavePrompt = async (step: number) => {
    const confirmation = confirmations[step] || '';
    const prompt = editedPrompts[step] || '';
    
    const success = await savePrompt(step, prompt, confirmation);
    if (success) {
      setConfirmations(prev => ({
        ...prev,
        [step]: ''
      }));
    }
  };

  if (!isAuthorized) {
    return <Navigate to="/dashboard" replace />;
  }

  const promptSteps = [
    {
      step: 1,
      title: 'Step 1 - Détection des offres d\'emploi',
      description: 'Prompt utilisé pour détecter si un post LinkedIn est une offre d\'emploi'
    },
    {
      step: 2,
      title: 'Step 2 - Vérification localisation France',
      description: 'Prompt utilisé pour vérifier si l\'offre est en France'
    },
    {
      step: 3,
      title: 'Step 3 - Catégorisation des postes',
      description: 'Prompt utilisé pour catégoriser les offres d\'emploi'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            <h2 className="text-2xl font-bold">Administration</h2>
            <Badge variant="destructive">Admin Only</Badge>
          </div>
          <p className="text-muted-foreground">
            Panneau d'administration pour la gestion du pipeline LinkedIn
          </p>
        </div>

        <Tabs defaultValue="pipeline" className="space-y-6">
          <TabsList className="grid w-full lg:w-[600px] grid-cols-3">
            <TabsTrigger value="pipeline">Pipeline LinkedIn</TabsTrigger>
            <TabsTrigger value="diagnostics">Diagnostic</TabsTrigger>
            <TabsTrigger value="prompts">Prompts OpenAI</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="space-y-6">
            <ProcessingMetrics 
              timeFilter={timeFilter} 
              onTimeFilterChange={setTimeFilter}
            />
          </TabsContent>

          <TabsContent value="diagnostics" className="space-y-6">
            <DiagnosticsPanel />
          </TabsContent>

          <TabsContent value="prompts" className="space-y-6">
            <div className="grid gap-6">
              {promptsLoading ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">Chargement des prompts...</p>
                  </CardContent>
                </Card>
              ) : (
                promptSteps.map(({ step, title, description }) => (
                  <Card key={step}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {title}
                      </CardTitle>
                      <CardDescription>{description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea
                        value={editedPrompts[step] || ''}
                        onChange={(e) => handlePromptChange(step, e.target.value)}
                        className="min-h-[200px] font-mono text-sm"
                        placeholder={`Prompt Step ${step}...`}
                      />
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-red-600">
                          Confirmation requise pour modification en production :
                        </label>
                        <Input
                          value={confirmations[step] || ''}
                          onChange={(e) => handleConfirmationChange(step, e.target.value)}
                          placeholder='Écrivez: "je confirme vouloir changer le prompt utilisé en production"'
                          className="border-red-200 focus:border-red-400"
                        />
                      </div>
                      
                      <Button 
                        onClick={() => handleSavePrompt(step)}
                        disabled={saving || !confirmations[step]}
                        className="w-full"
                        variant={confirmations[step] === 'je confirme vouloir changer le prompt utilisé en production' ? 'default' : 'secondary'}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Sauvegarde...' : `Sauvegarder Step ${step}`}
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}

              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700">
                    <AlertTriangle className="h-5 w-5" />
                    Attention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-orange-700">
                    <p>
                      La modification des prompts OpenAI peut affecter significativement la qualité et la précision du pipeline de traitement des leads.
                    </p>
                    <p className="font-medium">
                      Pour valider une modification, vous devez écrire exactement : 
                      <span className="bg-orange-100 px-2 py-1 rounded font-mono ml-1">
                        "je confirme vouloir changer le prompt utilisé en production"
                      </span>
                    </p>
                    <p>
                      Testez soigneusement toute modification avant de la déployer en production.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
