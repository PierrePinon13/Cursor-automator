
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Trash2, Calendar, MapPin, Users, FileText, Pencil } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
  onEdit: (search: SavedSearch) => void;
  onDelete: (searchId: string) => void;
  onLoadResults: (searchId: string) => void;
}

export const SavedSearches = ({ searches, onExecute, onEdit, onDelete, onLoadResults }: SavedSearchesProps) => {
  if (searches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recherches sauvegardées</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Aucune recherche sauvegardée</p>
            <p>Créez une nouvelle recherche pour commencer.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Recherches sauvegardées ({searches.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {searches.map((search) => {
            // Log to spot how many results are available for this search
            console.log("SavedSearch card", search.name, "resultsCount:", search.resultsCount);

            return (
              <Card key={search.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Nom de la recherche */}
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-gray-900 line-clamp-2">
                        {search.name}
                      </h3>
                    </div>

                    {/* Informations de la recherche */}
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {search.jobFilters?.keywords || 'Mots-clés non spécifiés'}
                        </span>
                      </div>

                      {search.jobFilters?.location && search.jobFilters.location.length > 0 && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5" />
                          <div className="flex flex-wrap gap-1">
                            {search.jobFilters.location.slice(0, 2).map((loc: any, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {loc.label}
                              </Badge>
                            ))}
                            {search.jobFilters.location.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{search.jobFilters.location.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {search.personaFilters?.role && search.personaFilters.role.length > 0 && (
                        <div className="flex items-start gap-2">
                          <Users className="h-4 w-4 mt-0.5" />
                          <div className="flex flex-wrap gap-1">
                            {search.personaFilters.role.slice(0, 2).map((role: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {role}
                              </Badge>
                            ))}
                            {search.personaFilters.role.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{search.personaFilters.role.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Créée {formatDistanceToNow(search.createdAt, { addSuffix: true, locale: fr })}
                        </span>
                      </div>

                      {search.lastExecuted && (
                        <div className="flex items-center gap-2">
                          <Play className="h-4 w-4" />
                          <span>
                            Dernière exécution {formatDistanceToNow(search.lastExecuted, { addSuffix: true, locale: fr })}
                          </span>
                        </div>
                      )}

                      {/* Always show result count if > 0, and phrase explicitly if 0 */}
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {typeof search.resultsCount === 'number' && search.resultsCount > 0 ? (
                          <span className="font-medium text-blue-600">
                            {search.resultsCount} résultat(s) disponible(s)
                          </span>
                        ) : (
                          <span className="font-medium text-gray-400">
                            Aucun résultat disponible pour cette recherche
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => onExecute(search)}
                        size="sm"
                        className="flex-1 flex items-center gap-2"
                      >
                        <Play className="h-4 w-4" />
                        Exécuter
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => onEdit(search)}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Pencil className="h-4 w-4" />
                        Modifier
                      </Button>

                      {/* Always show Results if count > 0 */}
                      {typeof search.resultsCount === 'number' && search.resultsCount > 0 && (
                        <Button
                          variant="outline"
                          onClick={() => onLoadResults(search.id)}
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <FileText className="h-4 w-4" />
                          Résultats
                        </Button>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="px-3">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer la recherche</AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir supprimer la recherche "{search.name}" ? 
                              Cette action est irréversible et supprimera également tous les résultats associés.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDelete(search.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
