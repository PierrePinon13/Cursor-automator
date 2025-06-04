
import { useContactWorkHistory } from '@/hooks/useContactWorkHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, Calendar, Clock } from 'lucide-react';

interface ContactWorkHistoryProps {
  contactId: string;
}

export function ContactWorkHistory({ contactId }: ContactWorkHistoryProps) {
  const { workHistory, loading } = useContactWorkHistory(contactId);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Historique professionnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (workHistory.length === 0) {
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
            Aucun historique professionnel disponible
          </p>
        </CardContent>
      </Card>
    );
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
        {workHistory.map((experience) => (
          <div key={experience.id} className="border rounded-lg p-4 space-y-2">
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
        ))}
      </CardContent>
    </Card>
  );
}
