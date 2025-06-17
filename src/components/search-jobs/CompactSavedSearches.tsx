
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Play, Pencil, Trash2, FileText, MapPin, Users } from 'lucide-react';
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

interface CompactSavedSearchesProps {
  searches: SavedSearch[];
  onExecute: (search: SavedSearch) => void;
  onEdit: (search: SavedSearch) => void;
  onDelete: (searchId: string) => void;
  onLoadResults: (searchId: string) => void;
  onSelect?: (search: SavedSearch) => void;
  onBulkProspecting?: (search: SavedSearch) => void;
  selectedSearchId?: string | null;
}

export const CompactSavedSearches = ({
  searches,
  onExecute,
  onEdit,
  onDelete,
  onLoadResults,
  onSelect,
  onBulkProspecting,
  selectedSearchId,
}: CompactSavedSearchesProps) => {
  if (searches.length === 0) {
    return null;
  }

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      'Comptelio': 'bg-blue-100 text-blue-800',
      'RH': 'bg-green-100 text-green-800',
      'Product': 'bg-purple-100 text-purple-800',
      'Tech': 'bg-gray-100 text-gray-800',
      'Marketing': 'bg-orange-100 text-orange-800',
      'Commercial': 'bg-yellow-100 text-yellow-800',
      'Finance': 'bg-red-100 text-red-800',
    };
    return colors[category || ''] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className="border-0 bg-white/95 backdrop-blur-sm shadow-sm">
      <CardContent className="pt-6">
        <div className="space-y-3">
          {searches.map((search) => {
            const isSelected = selectedSearchId === search.id;
            const jobKeywords = search.jobFilters?.keywords || '';
            const jobLocations = search.jobFilters?.location || [];
            const personaRoles = search.personaFilters?.role || [];
            const category = search.jobFilters?.category;

            return (
              <div
                key={search.id}
                className={`group p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  isSelected
                    ? "border-blue-200 bg-blue-50/50"
                    : "border-gray-100 hover:border-gray-200 hover:bg-gray-50/50"
                }`}
                onClick={() => onSelect && onSelect(search)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Première ligne : Keywords + Catégorie */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-gray-900 truncate">
                        {jobKeywords || 'Sans mots-clés'}
                      </span>
                      {category && (
                        <Badge variant="outline" className={`text-xs ${getCategoryColor(category)}`}>
                          {category}
                        </Badge>
                      )}
                      {search.resultsCount !== undefined && search.resultsCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {search.resultsCount} résultat{search.resultsCount > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>

                    {/* Deuxième ligne : Localisation + Rôles */}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {jobLocations.length > 0 && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">
                            {jobLocations.slice(0, 2).map((loc: any) => loc.label).join(', ')}
                            {jobLocations.length > 2 && ` +${jobLocations.length - 2}`}
                          </span>
                        </div>
                      )}
                      
                      {personaRoles.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span className="truncate">
                            {personaRoles.slice(0, 2).join(', ')}
                            {personaRoles.length > 2 && ` +${personaRoles.length - 2}`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Troisième ligne : Date */}
                    <div className="text-xs text-gray-500 mt-1">
                      Créée {formatDistanceToNow(search.createdAt, { addSuffix: true, locale: fr })}
                      {search.lastExecuted && (
                        <span className="ml-2">
                          • Dernière exécution {formatDistanceToNow(search.lastExecuted, { addSuffix: true, locale: fr })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onExecute(search);
                      }}
                      className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      title="Exécuter"
                    >
                      <Play className="h-4 w-4" />
                    </Button>

                    {/* Bouton de prospection volumique pour chaque recherche */}
                    {search.resultsCount !== undefined && search.resultsCount > 0 && onBulkProspecting && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onBulkProspecting(search);
                        }}
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                        title="Prospection volumique"
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(search);
                      }}
                      className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                      title="Modifier"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    {search.resultsCount !== undefined && search.resultsCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLoadResults(search.id);
                        }}
                        className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                        title="Voir les résultats"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Supprimer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer la recherche</AlertDialogTitle>
                          <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer cette recherche ? 
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
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
