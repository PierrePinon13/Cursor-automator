
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Search, Brain, Loader2 } from 'lucide-react';
import { diagnoseMissingLeads } from '@/utils/leadsDiagnostics';

const DiagnosticsPanel = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [diagnosticsResult, setDiagnosticsResult] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setDiagnosticsResult(null);
    setAiAnalysis(null);
    
    try {
      // Capture console output
      const originalConsoleLog = console.log;
      const logs: string[] = [];
      
      console.log = (...args) => {
        logs.push(args.join(' '));
        originalConsoleLog(...args);
      };

      await diagnoseMissingLeads();
      
      // Restore console.log
      console.log = originalConsoleLog;
      
      const diagnosticsText = logs.join('\n');
      setDiagnosticsResult(diagnosticsText);
      
      // Run AI analysis
      await runAiAnalysis(diagnosticsText);
      
    } catch (error) {
      console.error('Erreur lors du diagnostic:', error);
      setDiagnosticsResult(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const runAiAnalysis = async (diagnosticsData: string) => {
    setIsAnalyzing(true);
    
    try {
      const response = await fetch('/api/analyze-diagnostics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          diagnosticsData
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'analyse IA');
      }

      const data = await response.json();
      setAiAnalysis(data.analysis);
    } catch (error) {
      console.error('Erreur analyse IA:', error);
      setAiAnalysis('Erreur lors de l\'analyse IA des données de diagnostic.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bouton de diagnostic */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Diagnostic des leads manqués
          </CardTitle>
          <CardDescription>
            Analyser le pipeline pour identifier les problèmes de traitement des leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={runDiagnostics} 
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Diagnostic en cours...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Lancer le diagnostic
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Résultats du diagnostic */}
      {diagnosticsResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Résultats du diagnostic
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
              <pre className="text-xs whitespace-pre-wrap font-mono">
                {diagnosticsResult}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analyse IA */}
      {(aiAnalysis || isAnalyzing) && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              Analyse IA du diagnostic
              {isAnalyzing && <Badge variant="outline">En cours...</Badge>}
            </CardTitle>
            <CardDescription>
              Analyse automatique des problèmes identifiés et recommandations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAnalyzing ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyse des données en cours...
              </div>
            ) : (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="whitespace-pre-wrap text-sm">
                  {aiAnalysis}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DiagnosticsPanel;
