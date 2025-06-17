
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import GlobalPageHeader from '@/components/GlobalPageHeader';
import PageLayout from '@/components/PageLayout';
import { Users, ArrowRight, ArrowLeft, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ProspectingStepProfile } from '@/components/bulk-prospecting/ProspectingStepProfile';
import { ProspectingStepTemplate } from '@/components/bulk-prospecting/ProspectingStepTemplate';
import { ProspectingStepMessages } from '@/components/bulk-prospecting/ProspectingStepMessages';
import { ProspectingStepValidation } from '@/components/bulk-prospecting/ProspectingStepValidation';
import { supabase } from '@/integrations/supabase/client';
import { JobData, BulkProspectingState, Persona } from '@/types/jobSearch';

const BulkProspecting = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [searchName, setSearchName] = useState('');
  const [totalJobs, setTotalJobs] = useState(0);
  const [bulkState, setBulkState] = useState<BulkProspectingState>({
    selectedPersonas: [],
    messageTemplate: '',
    personalizedMessages: {}
  });

  // Récupérer les données depuis les paramètres URL
  useEffect(() => {
    const searchId = searchParams.get('searchId');
    const searchNameParam = searchParams.get('searchName');
    const totalJobsParam = searchParams.get('totalJobs');
    const totalPersonasParam = searchParams.get('totalPersonas');
    const personasParam = searchParams.get('personas');
    const templateParam = searchParams.get('template');
    const fromSavedSearch = searchParams.get('fromSavedSearch');
    
    if (!searchId) {
      navigate('/search-jobs');
      return;
    }

    // Si on vient d'une recherche sauvegardée, récupérer les résultats
    if (fromSavedSearch === 'true') {
      fetchSavedSearchResults(searchId, searchNameParam, templateParam);
    } else if (personasParam) {
      // Utiliser les données passées en paramètres
      try {
        const personas: Persona[] = JSON.parse(personasParam);
        
        const mockJobData: JobData = {
          id: searchId,
          title: `${totalPersonasParam || personas.length} contacts`,
          company: `${totalJobsParam || 0} offres d'emploi`,
          personas: personas
        };
        
        setJobData(mockJobData);
        setSearchName(searchNameParam || 'Recherche');
        setTotalJobs(parseInt(totalJobsParam || '0'));
        setBulkState(prev => ({
          ...prev,
          selectedPersonas: personas,
          messageTemplate: templateParam || ''
        }));
      } catch (error) {
        console.error('Erreur lors du parsing des données:', error);
        navigate('/search-jobs');
      }
    } else {
      navigate('/search-jobs');
    }
  }, [searchParams, navigate]);

  const fetchSavedSearchResults = async (searchId: string, searchName: string | null, template: string | null) => {
    try {
      // Récupérer tous les résultats de la recherche sauvegardée
      const { data: results, error } = await supabase
        .from('job_search_results')
        .select('*')
        .eq('search_id', searchId);

      if (error) throw error;

      console.log('Raw results from database:', results);

      // Extraire tous les personas avec transformation sécurisée
      const allPersonas: Persona[] = [];
      
      if (Array.isArray(results)) {
        results.forEach((job) => {
          // Transformation sécurisée des personas depuis Json vers Persona[]
          let personas: Persona[] = [];
          
          if (job.personas) {
            try {
              // Si personas est une string JSON, la parser
              if (typeof job.personas === 'string') {
                personas = JSON.parse(job.personas);
              } 
              // Si c'est déjà un array, l'utiliser directement
              else if (Array.isArray(job.personas)) {
                personas = job.personas as unknown as Persona[];
              }
              // Si c'est un objet, essayer de l'extraire
              else if (typeof job.personas === 'object' && job.personas !== null) {
                // Traiter comme un objet qui pourrait contenir un array
                const personasObj = job.personas as any;
                if (Array.isArray(personasObj)) {
                  personas = personasObj as unknown as Persona[];
                } else if (personasObj.personas && Array.isArray(personasObj.personas)) {
                  personas = personasObj.personas as unknown as Persona[];
                }
              }
            } catch (parseError) {
              console.warn('Erreur parsing personas pour job', job.id, parseError);
              personas = [];
            }
          }

          // Valider et nettoyer chaque persona
          if (Array.isArray(personas)) {
            personas.forEach((persona: any) => {
              if (persona && typeof persona === 'object' && persona.name && persona.title) {
                allPersonas.push({
                  id: persona.id || `${job.id}-${persona.name}`,
                  name: String(persona.name),
                  title: String(persona.title),
                  company: String(persona.company || job.company_name || ''),
                  profile_url: String(persona.profile_url || ''),
                  location: persona.location ? String(persona.location) : undefined,
                  jobTitle: job.job_title ? String(job.job_title) : undefined,
                  jobCompany: job.company_name ? String(job.company_name) : undefined,
                  jobId: String(job.id)
                });
              }
            });
          }
        });
      }

      const mockJobData: JobData = {
        id: searchId,
        title: `${allPersonas.length} contacts`,
        company: `${results?.length || 0} offres d'emploi`,
        personas: allPersonas
      };
      
      setJobData(mockJobData);
      setSearchName(searchName || 'Recherche sauvegardée');
      setTotalJobs(results?.length || 0);
      setBulkState(prev => ({
        ...prev,
        selectedPersonas: allPersonas,
        messageTemplate: template || ''
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des résultats:', error);
      navigate('/search-jobs');
    }
  };

  const steps = [
    { 
      number: 1, 
      title: 'Sélection', 
      description: 'Nettoyer et sélectionner les profils',
      icon: Users
    },
    { 
      number: 2, 
      title: 'Template', 
      description: 'Personnaliser le message principal',
      icon: Clock
    },
    { 
      number: 3, 
      title: 'Messages', 
      description: 'Personnaliser individuellement',
      icon: ArrowRight
    },
    { 
      number: 4, 
      title: 'Validation', 
      description: 'Valider et envoyer',
      icon: CheckCircle
    }
  ];

  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return bulkState.selectedPersonas.length > 0;
      case 2:
        return bulkState.messageTemplate.trim().length > 0;
      case 3:
        // Vérifier que tous les personas sélectionnés ont un message personnalisé
        const selectedPersonaIds = bulkState.selectedPersonas.map(p => p.id);
        const hasAllMessages = selectedPersonaIds.every(id => 
          bulkState.personalizedMessages[id] && 
          bulkState.personalizedMessages[id].trim().length > 0
        );
        console.log('Step 3 validation:', {
          selectedPersonaIds,
          personalizedMessages: bulkState.personalizedMessages,
          hasAllMessages
        });
        return hasAllMessages;
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

  const getProgressPercentage = () => {
    return (currentStep / steps.length) * 100;
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
        title="Prospection volumique"
        subtitle={`${searchName} • ${totalJobs} offres • ${bulkState.selectedPersonas.length} contacts sélectionnés`}
        icon={<Users className="h-6 w-6 text-blue-600" />}
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Search Jobs", href: "/search-jobs" },
          { label: "Prospection volumique" }
        ]}
      />

      <div className="space-y-6">
        {/* Progress Bar & Stepper amélioré */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="text-lg">Processus de prospection</CardTitle>
              <Badge variant="secondary" className="px-3 py-1">
                Étape {currentStep} sur {steps.length}
              </Badge>
            </div>
            <Progress value={getProgressPercentage()} className="h-2 mb-4" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {steps.map((step) => {
                const isActive = currentStep === step.number;
                const isCompleted = currentStep > step.number;
                const IconComponent = step.icon;
                
                return (
                  <div key={step.number} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    isActive 
                      ? 'bg-blue-100 border-2 border-blue-300' 
                      : isCompleted 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-white border border-gray-200'
                  }`}>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                      isActive 
                        ? 'bg-blue-600 text-white' 
                        : isCompleted 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-200 text-gray-600'
                    }`}>
                      {isCompleted ? <CheckCircle className="h-4 w-4" /> : step.number}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${
                        isActive ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-gray-600'
                      }`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-500">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Étape actuelle */}
        <div className="min-h-96">
          {renderCurrentStep()}
        </div>

        {/* Navigation améliorée */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="px-3 py-1">
                  {bulkState.selectedPersonas.length} profil(s) sélectionné(s)
                </Badge>
                {currentStep >= 2 && bulkState.messageTemplate && (
                  <Badge variant="secondary" className="px-3 py-1">
                    Template configuré
                  </Badge>
                )}
                {currentStep >= 3 && Object.keys(bulkState.personalizedMessages).length > 0 && (
                  <Badge variant="secondary" className="px-3 py-1">
                    {Object.keys(bulkState.personalizedMessages).length} message(s) personnalisé(s)
                  </Badge>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Précédent
                </Button>
                
                {currentStep < 4 ? (
                  <Button
                    onClick={handleNext}
                    disabled={!canGoNext()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    Suivant
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      console.log('Finaliser la prospection');
                      navigate('/search-jobs');
                    }}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4" />
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
