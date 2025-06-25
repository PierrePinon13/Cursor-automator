
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { User, Building, MapPin } from 'lucide-react';
import { Persona } from '@/types/jobSearch';

interface DuplicatePersonaDialogProps {
  open: boolean;
  onClose: () => void;
  persona: Persona;
  duplicateOffers: Array<{
    jobId: string;
    jobTitle: string;
    jobCompany: string;
    jobLocation?: string;
  }>;
  onSelectOffer: (jobId: string) => void;
  onSkipPersona: () => void;
}

export const DuplicatePersonaDialog = ({
  open,
  onClose,
  persona,
  duplicateOffers,
  onSelectOffer,
  onSkipPersona
}: DuplicatePersonaDialogProps) => {
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedOfferId) {
      onSelectOffer(selectedOfferId);
    }
    onClose();
  };

  const handleSkip = () => {
    onSkipPersona();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Contact présent sur plusieurs offres
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informations du persona */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-6 w-6 text-gray-500" />
                </div>
                <div>
                  <h3 className="font-medium">{persona.name}</h3>
                  <p className="text-sm text-gray-600">{persona.title}</p>
                  {persona.company && (
                    <p className="text-xs text-gray-500">{persona.company}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Explication */}
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            <p className="font-medium text-blue-900 mb-1">
              Ce contact apparaît sur {duplicateOffers.length} offres différentes
            </p>
            <p>
              Choisissez pour quelle offre vous souhaitez le prospecter, ou ignorez ce contact.
            </p>
          </div>

          {/* Liste des offres */}
          <div className="space-y-3">
            <h4 className="font-medium">Sélectionnez une offre :</h4>
            {duplicateOffers.map((offer) => (
              <Card
                key={offer.jobId}
                className={`cursor-pointer transition-all ${
                  selectedOfferId === offer.jobId
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedOfferId(offer.jobId)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      checked={selectedOfferId === offer.jobId}
                      onChange={() => setSelectedOfferId(offer.jobId)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <h5 className="font-medium flex items-center gap-2">
                        <Building className="h-4 w-4 text-gray-500" />
                        {offer.jobTitle}
                      </h5>
                      <p className="text-sm text-gray-600 mt-1">
                        {offer.jobCompany}
                      </p>
                      {offer.jobLocation && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {offer.jobLocation}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="text-red-600 hover:bg-red-50"
            >
              Ignorer ce contact
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!selectedOfferId}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Prospecter pour cette offre
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
