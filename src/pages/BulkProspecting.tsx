import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import GlobalPageHeader from '@/components/GlobalPageHeader';
import PageLayout from '@/components/PageLayout';
import { Users, ArrowRight, ArrowLeft, CheckCircle, Clock, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ProspectingStepProfile } from '@/components/bulk-prospecting/ProspectingStepProfile';
import { ProspectingStepTemplate } from '@/components/bulk-prospecting/ProspectingStepTemplate';
import { ProspectingStepMessages } from '@/components/bulk-prospecting/ProspectingStepMessages';
import { ProspectingStepValidation } from '@/components/bulk-prospecting/ProspectingStepValidation';
import { TemplateChoiceStep } from '@/components/bulk-prospecting/TemplateChoiceStep';
import { ProspectingStepVariables } from '@/components/bulk-prospecting/ProspectingStepVariables';
import { supabase } from '@/integrations/supabase/client';
import { JobData, BulkProspectingState, Persona } from '@/types/jobSearch';
import { useHiddenJobs } from '@/hooks/useHiddenJobs';
import CustomSidebarTrigger from '@/components/ui/CustomSidebarTrigger';

const BulkProspecting = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [searchName, setSearchName] = useState('');
  const [totalJobs, setTotalJobs] = useState(0);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [templateMode, setTemplateMode] = useState<'unified' | 'individual'>('unified');
  const [individualTemplates, setIndividualTemplates] = useState<{ [searchId: string]: string }>({});
  const { isJobHidden } = useHiddenJobs();
  const [bulkState, setBulkState] = useState<BulkProspectingState>({
    selectedPersonas: [],
    messageTemplate: '',
    personalizedMessages: {}
  });
  const [variableReplacements, setVariableReplacements] = useState<any>({});

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
      // Récupérer toutes les company_ids uniques
      const companyIds = Array.from(new Set((Array.isArray(results) ? results : []).map(job => job.company_id).filter(Boolean)));
      let companiesMap: Record<string, { logo?: string; linkedin_id?: string; name?: string }> = {};
      if (companyIds.length > 0) {
        // Appel Supabase pour récupérer les infos des entreprises
        const { data: companiesData, error: companiesError } = await supabase
          .from('companies')
          .select('id, name, logo, linkedin_id')
          .in('id', companyIds);
        if (!companiesError && Array.isArray(companiesData)) {
          companiesData.forEach(c => {
            companiesMap[c.id] = { logo: c.logo, linkedin_id: c.linkedin_id, name: c.name };
          });
        }
      }
      if (Array.isArray(results)) {
        results.forEach((job) => {
          if (isJobHidden(job.id)) return;
          let personas: Persona[] = [];
          if (job.personas) {
            try {
              if (typeof job.personas === 'string') {
                personas = JSON.parse(job.personas);
              } else if (Array.isArray(job.personas)) {
                personas = job.personas as unknown as Persona[];
              } else if (typeof job.personas === 'object' && job.personas !== null) {
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
          if (Array.isArray(personas)) {
            personas.forEach((persona: any) => {
              if (persona && typeof persona === 'object' && persona.name && persona.title) {
                // Enrichir avec infos company
                const companyInfo = companiesMap[job.company_id] || {};
                allPersonas.push({
                  id: persona.id || `${job.id}-${persona.name}`,
                  name: String(persona.name),
                  title: String(persona.title),
                  company: String(persona.company || job.company_name || ''),
                  profile_url: String(persona.profile_url || ''),
                  location: persona.location ? String(persona.location) : undefined,
                  jobTitle: job.job_title ? String(job.job_title) : undefined,
                  jobCompany: job.company_name ? String(job.company_name) : undefined,
                  jobLocation: job.location ? String(job.location) : undefined,
                  jobUrl: job.job_url ? String(job.job_url) : undefined,
                  // Champs pour la carte enrichie
                  company_logo: companyInfo.logo,
                  company_id: job.company_id,
                  company_linkedin_id: companyInfo.linkedin_id,
                  company_name: companyInfo.name || job.company_name,
                  ...persona,
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

  const updateBulkState = (updates: Partial<BulkProspectingState>) => {
    setBulkState(prev => ({ ...prev, ...updates }));
  };

  const handlePersonaRemovedFromMessages = (personaId: string) => {
    // Supprimer le persona de la liste des personas sélectionnés
    const updatedPersonas = bulkState.selectedPersonas.filter(p => p.id !== personaId);
    setBulkState(prev => ({
      ...prev,
      selectedPersonas: updatedPersonas,
      // Supprimer aussi le message personnalisé correspondant
      personalizedMessages: Object.fromEntries(
        Object.entries(prev.personalizedMessages).filter(([id]) => id !== personaId)
      )
    }));
  };

  const getProgressPercentage = () => {
    return (currentStep / steps.length) * 100;
  };

  const steps = [
    { number: 1, title: 'Profils', description: 'Nettoyer et sélectionner les profils', icon: Users },
    { number: 2, title: 'Template', description: 'Configurer les templates de message', icon: Clock },
    { number: 3, title: 'Variables', description: 'Revoir et corriger les variables', icon: List },
    { number: 4, title: 'Messages', description: 'Personnaliser individuellement', icon: ArrowRight },
    { number: 5, title: 'Validation', description: 'Valider et envoyer', icon: CheckCircle }
  ];

  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return bulkState.selectedPersonas.length > 0;
      case 2:
        if (templateMode === 'unified') {
          return bulkState.messageTemplate.trim().length > 0;
        } else {
          return savedSearches.every(search => (individualTemplates[search.id] && individualTemplates[search.id].trim().length > 0) || (search.messageTemplate && search.messageTemplate.trim().length > 0));
        }
      case 3:
        // Toujours possible d'aller à l'étape suivante (pas de validation bloquante sur les variables)
        return true;
      case 4:
        const selectedPersonaIds = bulkState.selectedPersonas.map(p => p.id);
        const hasAllMessages = selectedPersonaIds.every(id => bulkState.personalizedMessages[id] && bulkState.personalizedMessages[id].trim().length > 0);
        return hasAllMessages;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canGoNext() && currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

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
        // Déterminer si on est dans un contexte multi-recherches
        const isMultiSearch = searchParams.get('fromSavedSearch') === 'true' || savedSearches.length > 1;
        
        if (isMultiSearch) {
          return (
            <TemplateChoiceStep
              savedSearches={savedSearches}
              templateMode={templateMode}
              unifiedTemplate={bulkState.messageTemplate}
              individualTemplates={individualTemplates}
              onTemplateModeChange={setTemplateMode}
              onUnifiedTemplateChange={(template) => updateBulkState({ messageTemplate: template })}
              onIndividualTemplateChange={(searchId, template) => {
                setIndividualTemplates(prev => ({
                  ...prev,
                  [searchId]: template
                }));
              }}
            />
          );
        } else {
          return (
            <ProspectingStepTemplate
              jobData={jobData}
              template={bulkState.messageTemplate}
              onTemplateChange={(template) => updateBulkState({ messageTemplate: template })}
            />
          );
        }
      case 3:
        return (
          <ProspectingStepVariables
            template={templateMode === 'unified' ? bulkState.messageTemplate : ''}
            selectedPersonas={bulkState.selectedPersonas}
            variableReplacements={variableReplacements}
            onChange={setVariableReplacements}
          />
        );
      case 4:
        // Déterminer le template à utiliser pour chaque persona
        const getTemplateForPersona = (persona: Persona) => {
          if (templateMode === 'unified') {
            return bulkState.messageTemplate;
          } else {
            // Trouver la search correspondante au persona
            const searchId = persona.jobId; // Assuming jobId maps to search
            return individualTemplates[searchId] || 
                   savedSearches.find(s => s.id === searchId)?.messageTemplate || 
                   bulkState.messageTemplate;
          }
        };

        return (
          <ProspectingStepMessages
            jobData={jobData}
            selectedPersonas={bulkState.selectedPersonas}
            messageTemplate={templateMode === 'unified' ? bulkState.messageTemplate : ''}
            personalizedMessages={bulkState.personalizedMessages}
            onMessagesChange={(messages) => updateBulkState({ personalizedMessages: messages })}
            onPersonaRemoved={handlePersonaRemovedFromMessages}
            getTemplateForPersona={getTemplateForPersona}
            variableReplacements={variableReplacements}
          />
        );
      case 5:
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

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header bleu avec titre et stepper */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-4">
            <div className="flex flex-row items-center gap-4 mb-4">
              <CustomSidebarTrigger />
              <h1 className="text-3xl font-bold text-gray-900">Processus de prospection</h1>
              <span className="text-base font-medium text-blue-800 bg-blue-100 rounded px-3 py-1">
                Étape {currentStep} sur {steps.length}
              </span>
            </div>
            <Progress value={getProgressPercentage()} className="h-2 mb-4" />
          </CardHeader>
          <CardContent className="pt-0">
            {/* Stepper toujours sur une ligne, sans scroll */}
            <div className="flex flex-row flex-nowrap gap-4 overflow-x-visible w-full justify-between">
              {steps.map((step) => {
                const isActive = currentStep === step.number;
                const isCompleted = currentStep > step.number;
                const IconComponent = step.icon;
                return (
                  <div key={step.number} className={`flex-1 flex items-center gap-3 p-3 rounded-lg min-w-0 transition-all
                    ${isActive 
                      ? 'bg-blue-100 border-2 border-blue-300' 
                      : isCompleted 
                        ? 'bg-green-100 border-2 border-green-300' 
                        : 'bg-white border border-gray-200'}
                  `} style={{ minWidth: 0 }}>
                    <IconComponent className={`h-6 w-6 ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`} />
                    <div className="truncate min-w-0">
                      <div className={`font-semibold truncate ${isActive ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-gray-700'}`}>{step.title}</div>
                      <div className="text-xs text-gray-500 truncate">{step.description}</div>
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
                {currentStep >= 3 && Object.keys(variableReplacements).length > 0 && (
                  <Badge variant="secondary" className="px-3 py-1">
                    {Object.keys(variableReplacements).length} variable(s) configurée(s)
                  </Badge>
                )}
                {currentStep >= 4 && Object.keys(bulkState.personalizedMessages).length > 0 && (
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
                {currentStep < 5 ? (
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
