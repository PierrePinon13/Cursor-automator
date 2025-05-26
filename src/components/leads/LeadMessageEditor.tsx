
import React, { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface Lead {
  author_name: string;
  openai_step3_postes_selectionnes: string[];
  openai_step3_categorie: string;
  approach_message?: string | null;
  approach_message_generated?: boolean | null;
  approach_message_generated_at?: string | null;
}

interface LeadMessageEditorProps {
  lead: Lead;
  message: string;
  onMessageChange: (message: string) => void;
  disabled?: boolean;
}

const LeadMessageEditor = ({ lead, message, onMessageChange, disabled }: LeadMessageEditorProps) => {
  const MAX_CHARACTERS = 300;
  const isOverLimit = message.length > MAX_CHARACTERS;
  const remainingChars = MAX_CHARACTERS - message.length;

  const generateDefaultMessage = () => {
    // Use the generated approach message if available, otherwise use the old template
    if (lead.approach_message) {
      return lead.approach_message;
    }
    
    return `Bonjour ${lead.author_name?.split(' ')[0] || 'Cher(e) professionnel(le)'},

J'ai remarqué votre récente publication concernant la recherche de ${lead.openai_step3_postes_selectionnes?.[0] || 'profils qualifiés'}. 

En tant que spécialiste du recrutement dans le secteur ${lead.openai_step3_categorie}, je dispose d'un réseau de candidats expérimentés qui pourraient parfaitement correspondre à vos besoins.

Seriez-vous disponible pour un échange téléphonique de 15 minutes cette semaine pour discuter de vos enjeux de recrutement ?

Bien cordialement,
[Votre nom]`;
  };

  const handleReset = () => {
    onMessageChange(generateDefaultMessage());
  };

  // Initialize message only once when component mounts
  useEffect(() => {
    if (!message) {
      onMessageChange(generateDefaultMessage());
    }
  }, []); // Empty dependency array to run only once

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-800">Message LinkedIn</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={disabled}
        >
          Réinitialiser
        </Button>
      </div>
      
      {lead.approach_message && (
        <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
          ✓ Message généré automatiquement par l'IA
        </div>
      )}
      
      <div className="space-y-2">
        <Textarea
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          placeholder="Cliquez ici pour modifier le message..."
          className={`min-h-[380px] resize-none text-sm bg-gray-50 focus:bg-white transition-colors ${isOverLimit ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
          disabled={disabled}
        />
        <div className="flex items-center justify-end text-xs">
          <div className={`flex items-center gap-1 ${isOverLimit ? 'text-red-600' : remainingChars < 50 ? 'text-orange-500' : 'text-gray-500'}`}>
            {isOverLimit && <AlertCircle className="h-3 w-3" />}
            <span className="font-medium">
              {message.length}/{MAX_CHARACTERS}
            </span>
            {remainingChars >= 0 ? (
              <span>({remainingChars} restants)</span>
            ) : (
              <span>({Math.abs(remainingChars)} en trop)</span>
            )}
          </div>
        </div>
        {isOverLimit && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>
              Votre message dépasse la limite de {MAX_CHARACTERS} caractères. 
              Veuillez le raccourcir pour pouvoir l'envoyer.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadMessageEditor;
