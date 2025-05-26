
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, ExternalLink } from 'lucide-react';
import { useHrProviders } from '@/hooks/useHrProviders';
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

interface HrProvider {
  id: string;
  company_name: string;
  company_linkedin_url: string | null;
  company_linkedin_id: string | null;
  created_at: string;
  updated_at: string;
}

interface HrProvidersTableProps {
  hrProviders: HrProvider[];
  onEdit: (hrProvider: HrProvider) => void;
}

export function HrProvidersTable({ hrProviders, onEdit }: HrProvidersTableProps) {
  const { deleteHrProvider } = useHrProviders();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteHrProvider(id);
    } catch (error) {
      console.error('Error deleting HR provider:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom de l'entreprise</TableHead>
            <TableHead>LinkedIn</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Date de création</TableHead>
            <TableHead className="w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hrProviders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                Aucun prestataire RH trouvé
              </TableCell>
            </TableRow>
          ) : (
            hrProviders.map((hrProvider) => (
              <TableRow key={hrProvider.id}>
                <TableCell className="font-medium">
                  {hrProvider.company_name}
                </TableCell>
                <TableCell>
                  {hrProvider.company_linkedin_url ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(hrProvider.company_linkedin_url!, '_blank')}
                        className="p-0 h-auto"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      {hrProvider.company_linkedin_id && (
                        <Badge variant="secondary" className="text-xs">
                          ID: {hrProvider.company_linkedin_id}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={hrProvider.company_linkedin_url && hrProvider.company_linkedin_id ? "default" : "secondary"}
                  >
                    {hrProvider.company_linkedin_url && hrProvider.company_linkedin_id ? "Complet" : "Incomplet"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {formatDate(hrProvider.created_at)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(hrProvider)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === hrProvider.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                          <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer le prestataire RH "{hrProvider.company_name}" ? 
                            Cette action est irréversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(hrProvider.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
