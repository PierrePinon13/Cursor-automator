
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Settings, FileText, Save, MessageSquare } from 'lucide-react';
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
  const [pendingConfirmations, setPendingConfirmations] = useState<Record<number, boolean>>({});

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

  const handleFirstSave = (step: number) => {
    setPendingConfirmations(prev => ({
      ...prev,
      [step]: true
    }));
    
    // Auto-reset après 5 secondes
    setTimeout(() => {
      setPendingConfirmations(prev => ({
        ...prev,
        [step]: false
      }));
    }, 5000);
  };

  const handleConfirmSave = async (step: number) => {
    const prompt = editedPrompts[step] || '';
    
    const success = await savePrompt(step, prompt);
    if (success) {
      setPendingConfirmations(prev => ({
        ...prev,
        [step]: false
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
      description: 'Prompt utilisé pour détecter si un post LinkedIn est une offre d\'emploi',
      icon: FileText
    },
    {
      step: 2,
      title: 'Step 2 - Vérification localisation France',
      description: 'Prompt utilisé pour vérifier si l\'offre est en France',
      icon: FileText
    },
    {
      step: 3,
      title: 'Step 3 - Catégorisation des postes',
      description: 'Prompt utilisé pour catégoriser les offres d\'emploi',
      icon: FileText
    },
    {
      step: 4,
      title: 'Step 4 - Génération du message d\'approche',
      description: 'Prompt utilisé pour générer les messages personnalisés LinkedIn',
      icon: MessageSquare
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
                promptSteps.map(({ step, title, description, icon: Icon }) => (
                  <Card key={step} className={step === 4 ? 'border-blue-200 bg-blue-50' : ''}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
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
                      
                      <div className="flex gap-2">
                        {!pendingConfirmations[step] ? (
                          <Button 
                            onClick={() => handleFirstSave(step)}
                            disabled={saving}
                            className="flex-1"
                            variant="outline"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Sauvegarder Step {step}
                          </Button>
                        ) : (
                          <>
                            <Button 
                              onClick={() => handleConfirmSave(step)}
                              disabled={saving}
                              className="flex-1"
                              variant="destructive"
                            >
                              <Save className="h-4 w-4 mr-2" />
                              {saving ? 'Sauvegarde...' : 'Confirmer la sauvegarde'}
                            </Button>
                            <Button 
                              onClick={() => setPendingConfirmations(prev => ({ ...prev, [step]: false }))}
                              variant="outline"
                            >
                              Annuler
                            </Button>
                          </>
                        )}
                      </div>
                      
                      {pendingConfirmations[step] && (
                        <p className="text-sm text-orange-600 bg-orange-100 p-2 rounded">
                          ⚠️ Cliquez sur "Confirmer la sauvegarde" pour valider la modification en production
                        </p>
                      )}
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
                      Pour valider une modification, cliquez deux fois : d'abord sur "Sauvegarder", puis sur "Confirmer la sauvegarde".
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
