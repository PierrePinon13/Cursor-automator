
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import GlobalPageHeader from '@/components/GlobalPageHeader';
import PageLayout from '@/components/PageLayout';
import { Users, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProspectingStepProfile } from '@/components/bulk-prospecting/ProspectingStepProfile';
import { ProspectingStepTemplate } from '@/components/bulk-prospecting/ProspectingStepTemplate';
import { ProspectingStepMessages } from '@/components/bulk-prospecting/ProspectingStepMessages';
import { ProspectingStepValidation } from '@/components/bulk-prospecting/ProspectingStepValidation';

interface JobData {
  id: string;
  title: string;
  company: string;
  personas: any[];
}

interface BulkProspectingState {
  selectedPersonas: any[];
  messageTemplate: string;
  personalizedMessages: { [personaId: string]: string };
}

const BulkProspecting = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [bulkState, setBulkState] = useState<BulkProspectingState>({
    selectedPersonas: [],
    messageTemplate: '',
    personalizedMessages: {}
  });

  // Récupérer les données de la job search depuis les paramètres URL
  useEffect(() => {
    const searchId = searchParams.get('searchId');
    const jobId = searchParams.get('jobId');
    const title = searchParams.get('title');
    const company = searchParams.get('company');
    const personasParam = searchParams.get('personas');
    const templateParam = searchParams.get('template');
    
    if (!searchId || !jobId || !title || !company) {
      navigate('/search-jobs');
      return;
    }

    try {
      const personas = personasParam ? JSON.parse(personasParam) : [];
      
      const mockJobData: JobData = {
        id: jobId,
        title: title,
        company: company,
        personas: personas
      };
      
      setJobData(mockJobData);
      setBulkState(prev => ({
        ...prev,
        selectedPersonas: personas,
        messageTemplate: templateParam || ''
      }));
    } catch (error) {
      console.error('Erreur lors du parsing des données:', error);
      navigate('/search-jobs');
    }
  }, [searchParams, navigate]);

  const steps = [
    { number: 1, title: 'Sélection des profils', description: 'Nettoyer et sélectionner les profils à prospecter' },
    { number: 2, title: 'Template de message', description: 'Réviser le template de message principal' },
    { number: 3, title: 'Messages individuels', description: 'Personnaliser les messages pour chaque profil' },
    { number: 4, title: 'Validation finale', description: 'Valider et envoyer tous les messages' }
  ];

  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return bulkState.selectedPersonas.length > 0;
      case 2:
        return bulkState.messageTemplate.trim().length > 0;
      case 3:
        return Object.keys(bulkState.personalizedMessages).length === bulkState.selectedPersonas.length;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canGoNext() && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateBulkState = (updates: Partial<BulkProspectingState>) => {
    setBulkState(prev => ({ ...prev, ...updates }));
  };

  if (!jobData) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Chargement des données...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <ProspectingStepProfile
            jobData={jobData}
            selectedPersonas={bulkState.selectedPersonas}
            onSelectionChange={(personas) => updateBulkState({ selectedPersonas: personas })}
          />
        );
      case 2:
        return (
          <ProspectingStepTemplate
            jobData={jobData}
            template={bulkState.messageTemplate}
            onTemplateChange={(template) => updateBulkState({ messageTemplate: template })}
          />
        );
      case 3:
        return (
          <ProspectingStepMessages
            jobData={jobData}
            selectedPersonas={bulkState.selectedPersonas}
            messageTemplate={bulkState.messageTemplate}
            personalizedMessages={bulkState.personalizedMessages}
            onMessagesChange={(messages) => updateBulkState({ personalizedMessages: messages })}
          />
        );
      case 4:
        return (
          <ProspectingStepValidation
            jobData={jobData}
            bulkState={bulkState}
            onSend={() => {
              // Logique d'envoi des messages
              console.log('Envoi des messages:', bulkState);
              navigate('/search-jobs');
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <PageLayout>
      <GlobalPageHeader
        title="Prospection de masse"
        subtitle={`${jobData.title} chez ${jobData.company}`}
        icon={<Users className="h-6 w-6 text-blue-600" />}
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Search Jobs", href: "/search-jobs" },
          { label: "Prospection de masse" }
        ]}
      />

      <div className="space-y-6">
        {/* Stepper */}
        <Card>
          <CardHeader>
            <CardTitle>Processus de prospection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    currentStep >= step.number 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : 'border-gray-300 text-gray-500'
                  }`}>
                    {step.number}
                  </div>
                  <div className="ml-3 min-w-0 flex-1">
                    <p className={`text-sm font-medium ${
                      currentStep >= step.number ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowRight className="h-5 w-5 text-gray-400 mx-4" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Étape actuelle */}
        <div className="min-h-96">
          {renderCurrentStep()}
        </div>

        {/* Navigation */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  Étape {currentStep} sur {steps.length}
                </Badge>
                {currentStep === 1 && (
                  <Badge variant="secondary">
                    {bulkState.selectedPersonas.length} profil(s) sélectionné(s)
                  </Badge>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Précédent
                </Button>
                
                {currentStep < 4 ? (
                  <Button
                    onClick={handleNext}
                    disabled={!canGoNext()}
                  >
                    Suivant
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      console.log('Finaliser la prospection');
                      navigate('/search-jobs');
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Finaliser la prospection
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default BulkProspecting;
