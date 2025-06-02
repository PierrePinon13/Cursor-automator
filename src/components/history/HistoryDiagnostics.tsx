
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Database, AlertTriangle, CheckCircle } from 'lucide-react';

const HistoryDiagnostics = () => {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    try {
      // Test 1: Count activities
      console.log('🔍 Testing activities count...');
      const { count: activitiesCount, error: countError } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true });

      results.tests.push({
        name: 'Activities Count',
        status: countError ? 'error' : 'success',
        result: activitiesCount,
        error: countError?.message
      });

      // Test 2: Simple activities query
      console.log('🔍 Testing simple activities query...');
      const { data: simpleData, error: simpleError } = await supabase
        .from('activities')
        .select('*')
        .limit(5);

      results.tests.push({
        name: 'Simple Activities Query',
        status: simpleError ? 'error' : 'success',
        result: simpleData?.length || 0,
        error: simpleError?.message,
        sample: simpleData?.[0]
      });

      // Test 3: Leads count
      console.log('🔍 Testing leads count...');
      const { count: leadsCount, error: leadsCountError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

      results.tests.push({
        name: 'Leads Count',
        status: leadsCountError ? 'error' : 'success',
        result: leadsCount,
        error: leadsCountError?.message
      });

      // Test 4: Join query (the problematic one)
      console.log('🔍 Testing join query...');
      const { data: joinData, error: joinError } = await supabase
        .from('activities')
        .select(`
          *,
          lead:leads!activities_lead_id_fkey(
            id,
            author_name,
            company_position
          )
        `)
        .limit(2);

      results.tests.push({
        name: 'Activities-Leads Join',
        status: joinError ? 'error' : 'success',
        result: joinData?.length || 0,
        error: joinError?.message
      });

      // Test 5: Check foreign key constraints
      console.log('🔍 Testing foreign key info...');
      const { data: fkData, error: fkError } = await supabase
        .rpc('get_foreign_keys', { table_name: 'activities' })
        .single();

      results.tests.push({
        name: 'Foreign Key Constraints',
        status: fkError ? 'error' : 'success',
        result: fkData,
        error: fkError?.message
      });

    } catch (error: any) {
      results.tests.push({
        name: 'General Error',
        status: 'error',
        error: error.message
      });
    }

    setDiagnostics(results);
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Database className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <Card className="mb-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Diagnostics Base de Données
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <div className="space-y-4">
              <Button 
                onClick={runDiagnostics} 
                disabled={loading}
                size="sm"
                className="w-full"
              >
                {loading ? 'Analyse en cours...' : 'Lancer les diagnostics'}
              </Button>

              {diagnostics && (
                <div className="space-y-3">
                  <div className="text-xs text-gray-500">
                    Dernière analyse: {new Date(diagnostics.timestamp).toLocaleString('fr-FR')}
                  </div>
                  
                  {diagnostics.tests.map((test: any, index: number) => (
                    <div key={index} className="border rounded p-3 text-sm">
                      <div className="flex items-center gap-2 font-medium mb-1">
                        {getStatusIcon(test.status)}
                        {test.name}
                      </div>
                      
                      {test.result !== undefined && (
                        <div className="text-gray-600">
                          Résultat: {typeof test.result === 'object' ? JSON.stringify(test.result, null, 2) : test.result}
                        </div>
                      )}
                      
                      {test.error && (
                        <div className="text-red-600 text-xs mt-1">
                          Erreur: {test.error}
                        </div>
                      )}

                      {test.sample && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer">Voir échantillon</summary>
                          <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                            {JSON.stringify(test.sample, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default HistoryDiagnostics;
