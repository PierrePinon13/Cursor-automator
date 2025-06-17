
import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, X, Clock } from 'lucide-react';

interface Persona {
  id: string;
  name: string;
  title: string;
  profileUrl: string;
  company?: string;
  linkedin_id?: string;
}

interface PersonaCardProps {
  persona: Persona;
  isSelected: boolean;
  onToggleSelect: (personaId: string) => void;
  onHide: (personaId: string) => void;
  lastContactInfo?: {
    lastContactAt: string;
    contactedBy: string;
    daysAgo: number;
  };
}

export const PersonaCard = ({ 
  persona, 
  isSelected, 
  onToggleSelect, 
  onHide,
  lastContactInfo 
}: PersonaCardProps) => {
  const [isHidden, setIsHidden] = useState(false);

  const handleHide = () => {
    setIsHidden(true);
    onHide(persona.id);
  };

  if (isHidden) {
    return null;
  }

  return (
    <Card className={`relative transition-all duration-200 hover:shadow-md ${
      isSelected ? 'ring-2 ring-blue-500' : ''
    } ${lastContactInfo ? 'border-orange-200' : ''}`}>
      {/* Bouton pour masquer */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleHide}
        className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600 z-10"
        title="Masquer ce contact"
      >
        <X className="h-3 w-3" />
      </Button>

      <CardHeader 
        className="pb-3 pr-8 cursor-pointer" 
        onClick={() => onToggleSelect(persona.id)}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-gray-900 truncate">
              {persona.name}
            </h4>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {persona.title}
            </p>
            {persona.company && (
              <p className="text-xs text-gray-400 mt-1">
                {persona.company}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {isSelected && (
              <Badge variant="default" className="text-xs">
                Sélectionné
              </Badge>
            )}
            {lastContactInfo && (
              <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                <Clock className="h-3 w-3 mr-1" />
                Contacté il y a {lastContactInfo.daysAgo}j
              </Badge>
            )}
          </div>
          
          <Button
            variant={isSelected ? "secondary" : "outline"}
            size="sm"
            onClick={() => onToggleSelect(persona.id)}
            className="text-xs h-7"
          >
            {isSelected ? 'Désélectionner' : 'Sélectionner'}
          </Button>
        </div>
        
        {lastContactInfo && (
          <p className="text-xs text-orange-600 mt-2">
            Dernier contact par {lastContactInfo.contactedBy}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
