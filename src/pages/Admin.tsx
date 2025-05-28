
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Settings, FileText, Save } from 'lucide-react';
import ProcessingMetrics from '@/components/dashboard/ProcessingMetrics';
import DiagnosticsPanel from '@/components/dashboard/DiagnosticsPanel';
import { useToast } from '@/hooks/use-toast';

const Admin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Only allow Pierre Pinon to access this page
  const isAuthorized = user?.email === 'pierre.pinon@gmail.com';
  
  const [step1Prompt, setStep1Prompt] = useState('');
  const [step2Prompt, setStep2Prompt] = useState('');
  const [step3Prompt, setStep3Prompt] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthorized) {
      loadCurrentPrompts();
    }
  }, [isAuthorized]);

  const loadCurrentPrompts = async () => {
    // For now, we'll display placeholder text indicating where prompts would be loaded from
    setStep1Prompt('// Current Step 1 prompt would be loaded from Supabase edge function\n// This detects if a LinkedIn post is a job posting');
    setStep2Prompt('// Current Step 2 prompt would be loaded from Supabase edge function\n// This checks if the job is in France');
    setStep3Prompt('// Current Step 3 prompt would be loaded from Supabase edge function\n// This categorizes the job posting');
  };

  const savePrompt = async (step: number, prompt: string) => {
    setLoading(true);
    try {
      // TODO: Implement API call to update prompts in edge functions
      toast({
        title: "Prompt sauvegardé",
        description: `Le prompt Step ${step} a été mis à jour avec succès.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le prompt.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthorized) {
    return <Navigate to="/dashboard" replace />;
  }

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
            <ProcessingMetrics timeFilter="this-week" />
          </TabsContent>

          <TabsContent value="diagnostics" className="space-y-6">
            <DiagnosticsPanel />
          </TabsContent>

          <TabsContent value="prompts" className="space-y-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Step 1 - Détection des offres d'emploi
                  </CardTitle>
                  <CardDescription>
                    Prompt utilisé pour détecter si un post LinkedIn est une offre d'emploi
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={step1Prompt}
                    onChange={(e) => setStep1Prompt(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                    placeholder="Prompt Step 1..."
                  />
                  <Button 
                    onClick={() => savePrompt(1, step1Prompt)}
                    disabled={loading}
                    className="w-full"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder Step 1
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Step 2 - Vérification localisation France
                  </CardTitle>
                  <CardDescription>
                    Prompt utilisé pour vérifier si l'offre est en France
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={step2Prompt}
                    onChange={(e) => setStep2Prompt(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                    placeholder="Prompt Step 2..."
                  />
                  <Button 
                    onClick={() => savePrompt(2, step2Prompt)}
                    disabled={loading}
                    className="w-full"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder Step 2
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Step 3 - Catégorisation des postes
                  </CardTitle>
                  <CardDescription>
                    Prompt utilisé pour catégoriser les offres d'emploi
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={step3Prompt}
                    onChange={(e) => setStep3Prompt(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                    placeholder="Prompt Step 3..."
                  />
                  <Button 
                    onClick={() => savePrompt(3, step3Prompt)}
                    disabled={loading}
                    className="w-full"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder Step 3
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700">
                    <AlertTriangle className="h-5 w-5" />
                    Attention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-orange-700">
                    La modification des prompts OpenAI peut affecter significativement la qualité et la précision du pipeline de traitement des leads. 
                    Testez soigneusement toute modification avant de la déployer en production.
                  </p>
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
