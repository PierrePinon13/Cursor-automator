
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { useFunnelMetrics } from '@/hooks/useFunnelMetrics';
import { useFunnelStepData } from '@/hooks/useFunnelStepData';

interface ProcessingFunnelProps {
  timeFilter: string;
}

const ProcessingFunnel = ({ timeFilter }: ProcessingFunnelProps) => {
  console.log('ProcessingFunnel rendered with timeFilter:', timeFilter);
  const { metrics, loading, error } = useFunnelMetrics(timeFilter);
  const [openStep, setOpenStep] = useState<string | null>(null);

  console.log('ProcessingFunnel state:', { metrics, loading, error, openStep });

  const toggleStep = (step: string) => {
    console.log('Toggling step:', step);
    setOpenStep(openStep === step ? null : step);
  };

  const getStepColor = (step: string) => {
    switch (step) {
      case 'apify-received': return 'bg-blue-500';
      case 'person-filter': return 'bg-green-500';
      case 'openai-step1': return 'bg-yellow-500';
      case 'openai-step2': return 'bg-orange-500';
      case 'openai-step3': return 'bg-red-500';
      case 'unipile-scraped': return 'bg-purple-500';
      case 'added-to-leads': return 'bg-emerald-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    console.log('Showing loading state');
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Chargement des métriques...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    console.log('Showing error state:', error);
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">Erreur: {error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    console.log('No metrics available');
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Aucune donnée disponible</div>
        </CardContent>
      </Card>
    );
  }

  console.log('Rendering funnel with metrics:', metrics);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Entonnoir de traitement des données</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.steps.map((stepData, index) => (
              <div key={stepData.step}>
                <div 
                  className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleStep(stepData.step)}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full ${getStepColor(stepData.step)} flex items-center justify-center text-white font-bold text-sm`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{stepData.description}</div>
                      <div className="text-sm text-gray-500">
                        {stepData.count.toLocaleString()} posts ({stepData.percentage.toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {stepData.count.toLocaleString()}
                    </Badge>
                    {openStep === stepData.step ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                </div>

                {openStep === stepData.step && (
                  <StepDataTable 
                    step={stepData.step} 
                    timeFilter={timeFilter} 
                    isOpen={openStep === stepData.step}
                  />
                )}

                {index < metrics.steps.length - 1 && (
                  <div className="flex justify-center my-2">
                    <div className="w-0.5 h-4 bg-gray-300"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const StepDataTable = ({ step, timeFilter, isOpen }: { step: string; timeFilter: string; isOpen: boolean }) => {
  console.log('StepDataTable rendered:', { step, timeFilter, isOpen });
  const { data, loading, error } = useFunnelStepData(step, timeFilter, isOpen);

  console.log('StepDataTable state:', { data: data?.length, loading, error });

  if (loading) {
    return (
      <div className="ml-12 mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">Chargement des données...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ml-12 mt-4 p-4 bg-red-50 rounded-lg">
        <div className="text-center text-red-600">Erreur: {error}</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="ml-12 mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-center text-gray-500">Aucune donnée filtrée à cette étape</div>
      </div>
    );
  }

  return (
    <div className="ml-12 mt-4 bg-gray-50 rounded-lg overflow-hidden">
      <div className="p-4 border-b bg-gray-100">
        <h4 className="font-medium">Posts filtrés à cette étape ({data.length})</h4>
      </div>
      <div className="max-h-96 overflow-y-auto">
        <div className="space-y-2 p-4">
          {data.map((post) => (
            <div key={post.id} className="bg-white p-3 rounded border">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="font-medium text-sm mb-1">
                    {post.author_name || 'Auteur inconnu'}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {new Date(post.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(post.url, '_blank')}
                  className="ml-2"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
              
              {post.title && (
                <div className="text-sm font-medium mb-2 text-blue-600">
                  {post.title}
                </div>
              )}
              
              <div className="text-sm text-gray-700 mb-2">
                {post.text.substring(0, 200)}
                {post.text.length > 200 && '...'}
              </div>
              
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">
                  Type: {post.author_type}
                </Badge>
                {post.openai_step1_recrute_poste && (
                  <Badge variant="outline">
                    Step1: {post.openai_step1_recrute_poste}
                  </Badge>
                )}
                {post.openai_step2_reponse && (
                  <Badge variant="outline">
                    Step2: {post.openai_step2_reponse}
                  </Badge>
                )}
                {post.openai_step3_categorie && (
                  <Badge variant="outline">
                    Cat: {post.openai_step3_categorie}
                  </Badge>
                )}
                {post.unipile_profile_scraped !== undefined && (
                  <Badge variant="outline">
                    Unipile: {post.unipile_profile_scraped ? 'Oui' : 'Non'}
                  </Badge>
                )}
                {post.lead_id && (
                  <Badge variant="outline" className="bg-green-100">
                    Lead créé
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProcessingFunnel;
