
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface ApproachMessageSectionProps {
  leadData: any;
}

const ApproachMessageSection = ({ leadData }: ApproachMessageSectionProps) => {
  return (
    <div className="border-2 border-blue-200 p-4 rounded-lg bg-blue-50">
      <h3 className="font-semibold text-lg mb-3 text-blue-800">🔍 Message d'Approche - Investigation</h3>
      <div className="space-y-3">
        <div>
          <strong>Message généré:</strong>
          <Badge className="ml-2">
            {leadData.approach_message_generated ? 'Oui' : 'Non'}
          </Badge>
        </div>
        
        {leadData.approach_message_generated_at && (
          <div>
            <strong>Généré le:</strong> {new Date(leadData.approach_message_generated_at).toLocaleString()}
          </div>
        )}

        <div>
          <strong>Message stocké:</strong>
          <div className="mt-2 p-3 bg-white border rounded text-sm whitespace-pre-wrap">
            {leadData.approach_message || '❌ Aucun message stocké'}
          </div>
        </div>

        {leadData.approach_message_error && (
          <div>
            <strong>Détails d'erreur:</strong>
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {leadData.approach_message_error}
            </div>
          </div>
        )}

        {/* Indicateur de qualité du message */}
        <div className="mt-3 p-2 rounded border">
          <strong>Qualité du message:</strong>
          {leadData.approach_message_generated && leadData.approach_message && !leadData.approach_message_error?.includes('[Used default template]') ? (
            <span className="ml-2 text-green-600">✅ Message IA de qualité</span>
          ) : leadData.approach_message_error?.includes('[Used default template]') ? (
            <span className="ml-2 text-orange-600">⚠️ Template par défaut</span>
          ) : (
            <span className="ml-2 text-red-600">❌ Échec de génération</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApproachMessageSection;
