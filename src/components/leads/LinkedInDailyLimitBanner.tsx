
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Trophy, Calendar } from 'lucide-react';

interface LinkedInDailyLimitBannerProps {
  dailyCount: number;
  remainingMessages: number;
  isAtLimit: boolean;
  isAtMaxLimit: boolean;
  loading: boolean;
  limit: number;
}

export function LinkedInDailyLimitBanner({
  dailyCount,
  remainingMessages,
  isAtLimit,
  isAtMaxLimit,
  loading,
  limit
}: LinkedInDailyLimitBannerProps) {
  if (loading) {
    return null;
  }

  // Félicitations si l'utilisateur a atteint la limite
  if (isAtLimit) {
    return (
      <Alert className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <Trophy className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold">🎉 Félicitations !</span> Vous avez atteint votre objectif quotidien de {limit} messages LinkedIn.
              <div className="text-sm mt-1">
                Excellente implication ! Vous avez atteint la limite quotidienne recommandée. À demain pour continuer ! 💪
              </div>
            </div>
            <Badge variant="outline" className="bg-green-100 text-green-700">
              {dailyCount}/{limit}
            </Badge>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Avertissement si proche de la limite
  if (remainingMessages <= 5) {
    return (
      <Alert className="bg-orange-50 border-orange-200">
        <MessageSquare className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Attention :</span> Il vous reste seulement {remainingMessages} message{remainingMessages > 1 ? 's' : ''} LinkedIn pour aujourd'hui.
            </div>
            <Badge variant="outline" className="bg-orange-100 text-orange-700">
              {dailyCount}/{limit}
            </Badge>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Affichage normal du compteur
  return (
    <Alert className="bg-blue-50 border-blue-200">
      <Calendar className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-800">
        <div className="flex items-center justify-between">
          <div>
            Messages LinkedIn envoyés aujourd'hui : <span className="font-medium">{dailyCount}</span>
            <div className="text-sm text-blue-600">
              Limite recommandée : {limit} messages par jour
            </div>
          </div>
          <Badge variant="outline" className="bg-blue-100 text-blue-700">
            {dailyCount}/{limit}
          </Badge>
        </div>
      </AlertDescription>
    </Alert>
  );
}
