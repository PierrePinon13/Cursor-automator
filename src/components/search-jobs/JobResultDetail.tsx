
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Building, MapPin, Calendar, ExternalLink, MessageSquare, X, Linkedin, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface JobResultDetailProps {
  job: {
    id: string;
    title: string;
    company: string;
    location: string;
    postedDate: Date;
    description: string;
    jobUrl?: string;
    salary?: string;
    messageTemplate?: string;
    personas: Array<{
      id: string;
      name: string;
      title: string;
      profileUrl: string;
      company?: string;
    }>;
    type?: string;
  };
  onClose: () => void;
  onPersonaRemoved?: (jobId: string, personaId: string) => void;
}

export const JobResultDetail = ({ job, onClose, onPersonaRemoved }: JobResultDetailProps) => {
  const navigate = useNavigate();

  const handleBulkProspecting = () => {
    if (!job.personas || job.personas.length === 0) return;
    
    const params = new URLSearchParams({
      searchId: 'single-job',
      searchName: `${job.title} - ${job.company}`,
      totalJobs: '1',
      totalPersonas: job.personas.length.toString(),
      personas: JSON.stringify(job.personas.map(persona => ({
        ...persona,
        jobTitle: job.title,
        jobCompany: job.company,
        jobId: job.id
      }))),
      template: job.messageTemplate || ''
    });
    
    navigate(`/bulk-prospecting?${params.toString()}`);
    onClose();
  };

  const handleLinkedInClick = (profileUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(profileUrl, '_blank', 'noopener,noreferrer');
  };

  const handleRemovePersona = (personaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('Removing persona:', personaId, 'from job:', job.id);
    if (onPersonaRemoved) {
      onPersonaRemoved(job.id, personaId);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold text-gray-900 mb-2">
                {job.title}
              </DialogTitle>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  {job.company}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {job.location}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDistanceToNow(job.postedDate, { addSuffix: true, locale: fr })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              {job.type && (
                <Badge variant="secondary" className="px-3 py-1">
                  {job.type}
                </Badge>
              )}
              <Button variant="ghost" size="sm" className="p-2" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {/* Description de l'offre */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Description de l'offre</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {job.description}
                </p>
                {job.salary && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <div className="font-medium text-green-800">Salaire</div>
                    <div className="text-green-700">{job.salary}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Liste des contacts avec profils LinkedIn cliquables */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5" />
                  Contacts trouvés ({job.personas.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {job.personas.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Aucun contact trouvé pour cette offre
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {job.personas.map((persona) => (
                      <div
                        key={persona.id}
                        className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 mb-1">
                              {persona.name}
                            </div>
                            <div className="text-sm text-gray-600 mb-2">
                              {persona.title}
                            </div>
                            {persona.company && (
                              <div className="text-xs text-gray-500 mb-2">
                                {persona.company}
                              </div>
                            )}
                            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              Offre: {job.title} - {job.company}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => handleLinkedInClick(persona.profileUrl, e)}
                              className="flex items-center gap-1 hover:bg-blue-50 hover:border-blue-200"
                            >
                              <Linkedin className="h-4 w-4 text-blue-600" />
                              <span className="text-blue-600">Profil</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => handleRemovePersona(persona.id, e)}
                              className="flex items-center gap-1 hover:bg-red-50 hover:border-red-200 text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {/* Actions en bas */}
        <div className="border-t p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              {job.jobUrl && (
                <Button
                  variant="outline"
                  onClick={() => window.open(job.jobUrl, '_blank')}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Voir l'offre
                </Button>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Fermer
              </Button>
              {job.personas.length > 0 && (
                <Button
                  onClick={handleBulkProspecting}
                  className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Prospecter ({job.personas.length} contacts)
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
