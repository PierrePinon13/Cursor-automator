
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, MapPin, User, GripVertical, Archive } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ClientJobOffer, User as UserType } from '@/hooks/useClientJobOffers';

interface DraggableJobOffersTableProps {
  jobOffers: ClientJobOffer[];
  users: UserType[];
  onAssignJobOffer: (jobOfferId: string, userId: string | null) => void;
  onUpdateStatus?: (jobOfferId: string, status: string) => void;
}

interface ColumnConfig {
  id: string;
  label: string;
  width: number;
  minWidth: number;
  visible: boolean;
}

const defaultColumns: ColumnConfig[] = [
  { id: 'title', label: 'Titre du poste', width: 300, minWidth: 200, visible: true },
  { id: 'company', label: 'Entreprise', width: 200, minWidth: 150, visible: true },
  { id: 'location', label: 'Localisation', width: 120, minWidth: 100, visible: true },
  { id: 'posted_at', label: 'Date de publication', width: 150, minWidth: 130, visible: true },
  { id: 'status', label: 'Statut', width: 140, minWidth: 120, visible: true },
  { id: 'assignment', label: 'Assignation', width: 200, minWidth: 180, visible: true },
  { id: 'actions', label: 'Actions', width: 80, minWidth: 80, visible: true },
];

export function DraggableJobOffersTable({ jobOffers, users, onAssignJobOffer, onUpdateStatus }: DraggableJobOffersTableProps) {
  const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns);
  const [resizing, setResizing] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ClientJobOffer;
    direction: 'asc' | 'desc';
  } | null>(null);

  const handleSort = (key: keyof ClientJobOffer) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key, direction });
  };

  const sortedJobOffers = [...jobOffers].sort((a, b) => {
    if (!sortConfig) return 0;

    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

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
      case 'non_attribuee': return 'bg-gray-100 text-gray-800';
      case 'en_attente': return 'bg-blue-100 text-blue-800';
      case 'a_relancer': return 'bg-orange-100 text-orange-800';
      case 'negatif': return 'bg-red-100 text-red-800';
      case 'positif': return 'bg-green-100 text-green-800';
      case 'archivee': return 'bg-gray-200 text-gray-600';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatLocation = (location: string | null) => {
    if (!location) return 'Non spécifié';
    
    // Raccourcir la localisation pour économiser l'espace
    const parts = location.split(',');
    if (parts.length > 1) {
      // Prendre la première partie (ville) si elle existe
      return parts[0].trim();
    }
    
    // Si c'est déjà court, le retourner tel quel
    if (location.length <= 20) return location;
    
    // Sinon, le tronquer
    return location.substring(0, 17) + '...';
  };

  const handleMouseDown = (e: React.MouseEvent, columnId: string) => {
    const column = columns.find(col => col.id === columnId);
    if (!column) return;
    
    setResizing(columnId);
    setStartX(e.clientX);
    setStartWidth(column.width);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizing) return;
    
    const diff = e.clientX - startX;
    const column = columns.find(col => col.id === resizing);
    if (!column) return;
    
    const newWidth = Math.max(column.minWidth, startWidth + diff);
    
    setColumns(prev => prev.map(col => 
      col.id === resizing ? { ...col, width: newWidth } : col
    ));
  };

  const handleMouseUp = () => {
    setResizing(null);
  };

  // Gestion des événements de redimensionnement
  React.useEffect(() => {
    if (resizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [resizing, startX, startWidth]);

  const moveColumn = (fromIndex: number, toIndex: number) => {
    const newColumns = [...columns];
    const [movedColumn] = newColumns.splice(fromIndex, 1);
    newColumns.splice(toIndex, 0, movedColumn);
    setColumns(newColumns);
  };

  const visibleColumns = columns.filter(col => col.visible);

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            {visibleColumns.map((column, index) => (
              <TableHead 
                key={column.id}
                style={{ width: column.width, minWidth: column.minWidth, position: 'relative' }}
                className="select-none"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 cursor-move opacity-50 hover:opacity-100"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', index.toString());
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                      moveColumn(fromIndex, index);
                    }}
                  >
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <Button 
                    variant="ghost" 
                    onClick={() => column.id === 'title' ? handleSort('title') : 
                                  column.id === 'company' ? handleSort('company_name') :
                                  column.id === 'location' ? handleSort('location') :
                                  column.id === 'posted_at' ? handleSort('posted_at') :
                                  column.id === 'status' ? handleSort('status') : undefined}
                    className="h-auto p-0 font-medium"
                  >
                    {column.label}
                  </Button>
                </div>
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100"
                  onMouseDown={(e) => handleMouseDown(e, column.id)}
                />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedJobOffers.map((offer) => (
            <TableRow key={offer.id} className="hover:bg-gray-50">
              {visibleColumns.map((column) => {
                if (column.id === 'title') {
                  return (
                    <TableCell key={column.id} style={{ width: column.width }}>
                      <a 
                        href={offer.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-sm line-clamp-2 text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {offer.title || 'Titre non disponible'}
                      </a>
                    </TableCell>
                  );
                }
                
                if (column.id === 'company') {
                  return (
                    <TableCell key={column.id} style={{ width: column.width }}>
                      <div className="text-sm">
                        {offer.company_name || 'Entreprise non renseignée'}
                      </div>
                    </TableCell>
                  );
                }
                
                if (column.id === 'location') {
                  return (
                    <TableCell key={column.id} style={{ width: column.width }}>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin className="h-3 w-3" />
                        {formatLocation(offer.location)}
                      </div>
                    </TableCell>
                  );
                }
                
                if (column.id === 'posted_at') {
                  return (
                    <TableCell key={column.id} style={{ width: column.width }}>
                      {offer.posted_at && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(offer.posted_at), 'dd MMM yyyy', { locale: fr })}
                        </div>
                      )}
                    </TableCell>
                  );
                }

                if (column.id === 'status') {
                  return (
                    <TableCell key={column.id} style={{ width: column.width }}>
                      {onUpdateStatus ? (
                        <Select
                          value={offer.status}
                          onValueChange={(value) => onUpdateStatus(offer.id, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              <span className={`px-2 py-1 rounded-full text-sm ${getStatusColor(offer.status)}`}>
                                {getStatusLabel(offer.status)}
                              </span>
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
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-sm ${getStatusColor(offer.status)}`}>
                          {getStatusLabel(offer.status)}
                        </span>
                      )}
                    </TableCell>
                  );
                }
                
                if (column.id === 'assignment') {
                  return (
                    <TableCell key={column.id} style={{ width: column.width }}>
                      <Select
                        value={offer.assigned_to_user_id || "unassigned"}
                        onValueChange={(value) => 
                          onAssignJobOffer(offer.id, value === "unassigned" ? null : value)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {offer.assigned_to_user_id ? (
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3" />
                                <span className="text-sm">
                                  {getAssignedUser(offer.assigned_to_user_id)?.full_name || 
                                   getAssignedUser(offer.assigned_to_user_id)?.email || 
                                   'Utilisateur inconnu'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-500 text-sm">Non assigné</span>
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
                      {offer.assigned_at && (
                        <div className="text-xs text-gray-500 mt-1">
                          Assigné: {format(new Date(offer.assigned_at), 'dd/MM HH:mm', { locale: fr })}
                        </div>
                      )}
                    </TableCell>
                  );
                }
                
                if (column.id === 'actions') {
                  return (
                    <TableCell key={column.id} style={{ width: column.width }}>
                      {onUpdateStatus && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onUpdateStatus(offer.id, 'archivee')}
                          title="Archiver cette offre"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  );
                }
                
                return null;
              })}
            </TableRow>
          ))}
          
          {sortedJobOffers.length === 0 && (
            <TableRow>
              <TableCell colSpan={visibleColumns.length} className="text-center py-8 text-gray-500">
                Aucune offre d'emploi trouvée
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
