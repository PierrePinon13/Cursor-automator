
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, Trash2, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SavedSearch {
  id: string;
  name: string;
  jobFilters: any;
  personaFilters: any;
  messageTemplate?: string;
  createdAt: Date;
  lastExecuted?: Date;
  resultsCount?: number;
}

interface SavedSearchesProps {
  searches: SavedSearch[];
  onExecute: (search: SavedSearch) => void;
  onDelete: (searchId: string) => void;
}

export const SavedSearches = ({ searches, onExecute, onDelete }: SavedSearchesProps) => {
  if (searches.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Recherches sauvegardées
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {searches.map((search) => (
            <Card key={search.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* En-tête */}
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-gray-900 truncate">{search.name}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(search.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Détails */}
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>
                      <strong>Mots-clés :</strong> {search.jobFilters.keywords}
                    </p>
                    {search.jobFilters.location?.length > 0 && (
                      <p>
                        <strong>Localisation :</strong> {search.jobFilters.location.join(', ')}
                      </p>
                    )}
                    {search.personaFilters.role?.length > 0 && (
                      <div>
                        <strong>Rôles ciblés :</strong>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {search.personaFilters.role.map((role: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Métadonnées */}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    Créée {formatDistanceToNow(search.createdAt, { addSuffix: true, locale: fr })}
                  </div>

                  {search.lastExecuted && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>Dernière exécution :</span>
                      {formatDistanceToNow(search.lastExecuted, { addSuffix: true, locale: fr })}
                      {search.resultsCount !== undefined && (
                        <Badge variant="outline" className="text-xs">
                          {search.resultsCount} résultats
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <Button
                    onClick={() => onExecute(search)}
                    className="w-full flex items-center gap-2"
                    size="sm"
                  >
                    <Play className="h-4 w-4" />
                    Relancer la recherche
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
