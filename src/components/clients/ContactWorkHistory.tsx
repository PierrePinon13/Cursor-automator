
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, Calendar, Clock } from 'lucide-react';

interface ContactWorkHistoryProps {
  contactId: string;
  contact?: any; // Le contact avec les nouvelles colonnes
}

interface WorkExperience {
  company_name: string;
  position: string;
  duration_months?: number;
  start_date?: string;
  end_date?: string;
  is_current: boolean;
}

export function ContactWorkHistory({ contactId, contact }: ContactWorkHistoryProps) {
  if (!contact) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Historique professionnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Contact non trouvé
          </p>
        </CardContent>
      </Card>
    );
  }

  // Extraire l'historique professionnel des nouvelles colonnes
  const workHistory: WorkExperience[] = [];
  
  for (let i = 1; i <= 5; i++) {
    const companyName = contact[`company_${i}_name`];
    const position = contact[`company_${i}_position`];
    
    if (companyName && position) {
      workHistory.push({
        company_name: companyName,
        position: position,
        duration_months: contact[`company_${i}_duration_months`],
        start_date: contact[`company_${i}_start_date`],
        end_date: contact[`company_${i}_end_date`],
        is_current: contact[`company_${i}_is_current`] || false
      });
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Présent';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDuration = (months: number | null) => {
    if (!months) return '';
    
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (years === 0) {
      return `${remainingMonths} mois`;
    } else if (remainingMonths === 0) {
      return `${years} an${years > 1 ? 's' : ''}`;
    } else {
      return `${years} an${years > 1 ? 's' : ''} ${remainingMonths} mois`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Historique professionnel ({workHistory.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {workHistory.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Aucun historique professionnel disponible
          </p>
        ) : (
          workHistory.map((experience, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="font-medium">{experience.position}</h4>
                  <p className="text-sm text-muted-foreground">
                    {experience.company_name}
                  </p>
                </div>
                {experience.is_current && (
                  <Badge variant="secondary" className="text-xs">
                    Actuel
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(experience.start_date)} - {formatDate(experience.end_date)}
                </div>
                {experience.duration_months && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(experience.duration_months)}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
