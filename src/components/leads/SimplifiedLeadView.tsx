
import React from 'react';
import { ExternalLink, Calendar, User, Linkedin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Lead {
  id: string;
  author_name: string;
  author_profile_url: string;
  unipile_company: string;
  unipile_position: string;
  openai_step3_postes_selectionnes: string[];
  url: string;
  title: string;
  approach_message?: string | null;
  linkedin_message_sent_at?: string | null;
}

interface SimplifiedLeadViewProps {
  lead: Lead;
}

const SimplifiedLeadView = ({ lead }: SimplifiedLeadViewProps) => {
  return (
    <div className="h-full flex flex-col space-y-8">
      {/* Informations du Lead */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-blue-600" />
          Informations du Lead
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-medium text-gray-900">{lead.author_name}</h3>
              <a
                href={lead.author_profile_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
            <p className="text-gray-600 mb-1">{lead.unipile_position}</p>
            <p className="text-gray-600">{lead.unipile_company}</p>
          </div>
        </div>
      </div>

      {/* Poste recherché */}
      <div className="bg-green-50 rounded-lg p-6 border border-green-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          Poste recherché
        </h2>
        <div className="mb-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {lead.openai_step3_postes_selectionnes?.map((poste, index) => (
              <Badge key={index} className="bg-green-100 text-green-800 border-green-300 text-sm px-3 py-1">
                {poste}
              </Badge>
            ))}
          </div>
          <a
            href={lead.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors"
          >
            Voir la publication LinkedIn
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Message envoyé */}
      {lead.approach_message && (
        <div className="bg-orange-50 rounded-lg p-6 border border-orange-200 flex-1">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-600" />
            Message LinkedIn envoyé
          </h2>
          
          {/* Détails d'envoi */}
          <div className="mb-4 p-3 bg-orange-100 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Envoyé par :</span>
              <span className="font-medium text-gray-800">Utilisateur Connecté</span>
            </div>
            {lead.linkedin_message_sent_at && (
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-600">Date d'envoi :</span>
                <span className="font-medium text-gray-800">
                  {new Date(lead.linkedin_message_sent_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Contenu du message */}
          <div className="bg-white rounded-lg p-4 border border-orange-200">
            <h4 className="font-medium text-gray-700 mb-2">Contenu du message :</h4>
            <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
              {lead.approach_message}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimplifiedLeadView;
