
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Building, MapPin, X, AlertTriangle } from 'lucide-react';

interface PersonaCardProps {
  persona: {
    id: string;
    name: string;
    title: string;
    profileUrl: string;
    company?: string;
    jobTitle?: string;
    jobCompany?: string;
  };
  isSelected: boolean;
  onToggleSelect: (personaId: string) => void;
  onHide: (personaId: string) => void;
  lastContactInfo?: {
    lastContactAt: string;
    contactedBy: string;
    hoursAgo: number;
    daysAgo: number;
  };
  showJobInfo?: boolean;
}

export const PersonaCard = ({ 
  persona, 
  isSelected, 
  onToggleSelect, 
  onHide, 
  lastContactInfo,
  showJobInfo = false
}: PersonaCardProps) => {
  const handleCardClick = () => {
    onToggleSelect(persona.id);
  };

  const handleHideClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onHide(persona.id);
  };

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md relative group ${
        isSelected 
          ? 'ring-2 ring-blue-500 bg-blue-50/50' 
          : 'hover:ring-1 hover:ring-gray-300'
      } ${
        lastContactInfo ? 'border-orange-200 bg-orange-50/30' : ''
      }`}
      onClick={handleCardClick}
    >
      {/* Bouton de masquage */}
      <div className="absolute top-2 right-2 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleHideClick}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1 h-6 w-6"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* En-tête avec photo et nom */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate text-sm">{persona.name}</h4>
            <p className="text-xs text-gray-600 line-clamp-2">{persona.title}</p>
          </div>
        </div>

        {/* Entreprise */}
        {persona.company && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Building className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{persona.company}</span>
          </div>
        )}

        {/* Informations du job (si showJobInfo est true) */}
        {showJobInfo && (persona.jobTitle || persona.jobCompany) && (
          <div className="pt-2 border-t border-gray-100 space-y-1">
            <p className="text-xs font-medium text-gray-700">Offre d'emploi :</p>
            {persona.jobTitle && (
              <p className="text-xs text-gray-600 truncate">{persona.jobTitle}</p>
            )}
            {persona.jobCompany && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Building className="h-3 w-3" />
                <span className="truncate">{persona.jobCompany}</span>
              </div>
            )}
          </div>
        )}

        {/* Alerte contact récent */}
        {lastContactInfo && (
          <div className="flex items-start gap-2 p-2 bg-orange-100 rounded-md">
            <AlertTriangle className="h-3 w-3 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-orange-800">
              <p className="font-medium">Contacté récemment</p>
              <p>Il y a {lastContactInfo.daysAgo}j par {lastContactInfo.contactedBy}</p>
            </div>
          </div>
        )}

        {/* Badge de sélection */}
        {isSelected && (
          <div className="flex justify-center">
            <Badge variant="default" className="bg-blue-600 text-xs">
              Sélectionné
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
