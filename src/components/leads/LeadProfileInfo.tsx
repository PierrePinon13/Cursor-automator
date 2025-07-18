
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, User } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

type Lead = Tables<'leads'>;

interface LeadProfileInfoProps {
  lead: Lead;
}

const LeadProfileInfo = ({ lead }: LeadProfileInfoProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5" />
          Informations du Profil
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Informations personnelles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Nom complet</label>
            <p className="text-sm text-gray-900">{lead.author_name || 'Non renseigné'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Titre du poste</label>
            <p className="text-sm text-gray-900">{lead.unipile_position || 'Non renseigné'}</p>
          </div>
        </div>

        {/* Entreprise actuelle */}
        {lead.unipile_company && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              Entreprise actuelle
            </label>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{lead.unipile_company}</Badge>
              {lead.is_client_lead && (
                <Badge className="bg-blue-100 text-blue-800">Client</Badge>
              )}
            </div>
          </div>
        )}

        {/* Localisation */}
        {lead.openai_step2_localisation && (
          <div>
            <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              Localisation
            </label>
            <p className="text-sm text-gray-900">{lead.openai_step2_localisation}</p>
          </div>
        )}

        {/* Catégorie */}
        {lead.openai_step3_categorie && (
          <div>
            <label className="text-sm font-medium text-gray-500">Catégorie</label>
            <Badge variant="secondary">{lead.openai_step3_categorie}</Badge>
          </div>
        )}

        {/* Lien LinkedIn */}
        {lead.author_profile_url && (
          <div>
            <a 
              href={lead.author_profile_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm underline"
            >
              Voir le profil LinkedIn
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeadProfileInfo;
