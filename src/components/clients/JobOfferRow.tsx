
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Archive, User, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ClientJobOffer, User as UserType } from '@/hooks/useClientJobOffers';

interface JobOfferRowProps {
  offer: ClientJobOffer;
  users: UserType[];
  onAssignJobOffer: (jobOfferId: string, userId: string | null) => void;
  onUpdateStatus: (jobOfferId: string, status: string) => void;
  animatingItems: Set<string>;
}

export function JobOfferRow({ 
  offer, 
  users, 
  onAssignJobOffer, 
  onUpdateStatus, 
  animatingItems 
}: JobOfferRowProps) {
  const getAssignedUser = (userId: string | null) => {
    if (!userId) return null;
    return users.find(user => user.id === userId);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'non_attribuee': return 'Non attribuée';
      case 'en_attente': return 'En attente';
      case 'a_relancer': return 'À relancer';
      case 'negatif': return 'Négatif';
      case 'positif': return 'Positif';
      case 'archivee': return 'Archivée';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'non_attribuee': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'en_attente': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'a_relancer': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'negatif': return 'bg-red-100 text-red-800 border-red-200';
      case 'positif': return 'bg-green-100 text-green-800 border-green-200';
      case 'archivee': return 'bg-gray-200 text-gray-600 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isAnimating = animatingItems.has(offer.id);

  return (
    <div className={`bg-white border rounded-lg p-4 transition-all duration-200 ${
      isAnimating ? 'animate-pulse bg-blue-50' : 'hover:bg-gray-50'
    } ${offer.status === 'archivee' ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        
        {/* Titre et informations principales */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            <a 
              href={offer.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-medium text-blue-600 hover:text-blue-800 hover:underline line-clamp-2 flex-1"
            >
              {offer.title || 'Titre non disponible'}
            </a>
            <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
          </div>
          
          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            {offer.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{offer.location}</span>
              </div>
            )}
            
            {offer.posted_at && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(offer.posted_at), 'dd/MM/yyyy', { locale: fr })}</span>
              </div>
            )}
            
            {offer.salary && (
              <div className="text-green-600 font-medium">
                {offer.salary}
              </div>
            )}
          </div>
        </div>

        {/* Contrôles */}
        <div className="flex items-center gap-3 flex-shrink-0">
          
          {/* Statut */}
          <div className="min-w-[140px]">
            <Select
              value={offer.status}
              onValueChange={(value) => onUpdateStatus(offer.id, value)}
            >
              <SelectTrigger className="h-8">
                <SelectValue>
                  <Badge variant="outline" className={getStatusColor(offer.status)}>
                    {getStatusLabel(offer.status)}
                  </Badge>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="non_attribuee">Non attribuée</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
                <SelectItem value="a_relancer">À relancer</SelectItem>
                <SelectItem value="negatif">Négatif</SelectItem>
                <SelectItem value="positif">Positif</SelectItem>
                <SelectItem value="archivee">Archivée</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assignation */}
          <div className="min-w-[160px]">
            <Select
              value={offer.assigned_to_user_id || "unassigned"}
              onValueChange={(value) => 
                onAssignJobOffer(offer.id, value === "unassigned" ? null : value)
              }
            >
              <SelectTrigger className="h-8">
                <SelectValue>
                  {offer.assigned_to_user_id ? (
                    <div className="flex items-center gap-1 truncate">
                      <User className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">
                        {getAssignedUser(offer.assigned_to_user_id)?.full_name || 
                         getAssignedUser(offer.assigned_to_user_id)?.email || 
                         'Inconnu'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-500">Non assigné</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">
                  <span className="text-gray-500">Non assigné</span>
                </SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      {user.full_name || user.email}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action d'archivage individuel */}
          {offer.status !== 'archivee' && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onUpdateStatus(offer.id, 'archivee')}
              title="Archiver cette offre"
              className="h-8 w-8 p-0"
            >
              <Archive className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
