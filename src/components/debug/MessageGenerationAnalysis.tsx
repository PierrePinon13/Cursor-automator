
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const MessageGenerationAnalysis = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>🤖 Analyse des Messages d'Approche</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg mb-3">Fonctions de génération actuelles</h3>
          
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium text-blue-600 mb-2">1. process-linkedin-post/message-generation.ts</h4>
              <p className="text-sm text-gray-600 mb-2">
                Fonction principale: <code>executeMessageGeneration()</code>
              </p>
              <ul className="text-sm space-y-1">
                <li>• Vérifie si c'est un lead client (skip si oui)</li>
                <li>• Utilise <code>generateApproachMessageWithRetry()</code></li>
                <li>• Système de retry avec 3 tentatives</li>
                <li>• Fallback sur template par défaut</li>
                <li>• Sauvegarde dans linkedin_posts.approach_message</li>
              </ul>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-medium text-blue-600 mb-2">2. regenerate-approach-message/index.ts</h4>
              <p className="text-sm text-gray-600 mb-2">
                Edge Function pour régénération manuelle
              </p>
              <ul className="text-sm space-y-1">
                <li>• Même logique que message-generation.ts</li>
                <li>• Accessible via API pour l'interface</li>
                <li>• Met à jour approach_message_generated_at</li>
                <li>• Gère les erreurs avec approach_message_error</li>
              </ul>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-medium text-orange-600 mb-2">3. specialized-lead-worker/index.ts</h4>
              <p className="text-sm text-gray-600 mb-2">
                Appelle generateApproachMessage() pour les nouveaux leads
              </p>
              <ul className="text-sm space-y-1">
                <li>• Génère le message lors de la création du lead</li>
                <li>• Exclus les leads clients</li>
                <li>• Sauvegarde dans leads.approach_message</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">⚠️ Problème identifié</h4>
            <p className="text-sm text-yellow-700">
              Les messages sont générés dans linkedin_posts ET leads, mais le transfert 
              depuis linkedin_posts vers leads n'est pas systématique.
            </p>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">🔍 Vérifications LinkedIn ID</h4>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Client matching:</strong> 
                <code className="ml-2">client-matching.ts</code> - Compare <code>scrapingResult.company_id</code> 
                avec <code>clients.company_linkedin_id</code>
              </div>
              <div>
                <strong>HR Provider matching:</strong> 
                <code className="ml-2">hr-provider-matching.ts</code> - Compare <code>scrapingResult.company_id</code> 
                avec <code>hr_providers.company_linkedin_id</code>
              </div>
              <div>
                <strong>Historique professionnel:</strong> 
                Les 5 entreprises stockent <code>company_X_linkedin_id</code> pour comparaison future
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MessageGenerationAnalysis;
