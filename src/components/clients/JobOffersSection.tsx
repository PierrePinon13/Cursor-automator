
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, Calendar, MapPin, Building2, User, UserX } from 'lucide-react';
import { useClientJobOffers } from '@/hooks/useClientJobOffers';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function JobOffersSection() {
  const {
    filteredJobOffers,
    users,
    loading,
    selectedDateFilter,
    setSelectedDateFilter,
    selectedClientFilter,
    setSelectedClientFilter,
    selectedAssignmentFilter,
    setSelectedAssignmentFilter,
    availableClients,
    assignJobOffer
  } = useClientJobOffers();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleAssignmentChange = (jobOfferId: string, userId: string) => {
    const actualUserId = userId === 'unassign' ? null : userId;
    assignJobOffer(jobOfferId, actualUserId);
  };

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <Select value={selectedDateFilter} onValueChange={setSelectedDateFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filtrer par date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les dates</SelectItem>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="yesterday">Hier</SelectItem>
              <SelectItem value="last_7_days">7 derniers jours</SelectItem>
              <SelectItem value="last_30_days">30 derniers jours</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <Select value={selectedClientFilter} onValueChange={setSelectedClientFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filtrer par client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les clients</SelectItem>
              {availableClients.map((client) => (
                <SelectItem key={client.id} value={client.id!}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <Select value={selectedAssignmentFilter} onValueChange={setSelectedAssignmentFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filtrer par assignation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="assigned">Assignées</SelectItem>
              <SelectItem value="unassigned">Non assignées</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Badge variant="outline" className="ml-auto">
          {filteredJobOffers.length} offre(s)
        </Badge>
      </div>

      {/* Tableau des offres d'emploi */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre du poste</TableHead>
              <TableHead>Entreprise</TableHead>
              <TableHead>Localisation</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Client correspondant</TableHead>
              <TableHead>Assigné à</TableHead>
              <TableHead>Date de réception</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredJobOffers.map((jobOffer) => {
              const assignedUser = users.find(user => user.id === jobOffer.assigned_to_user_id);
              
              return (
                <TableRow key={jobOffer.id}>
                  <TableCell className="font-medium max-w-[300px]">
                    <div className="truncate" title={jobOffer.title}>
                      {jobOffer.title}
                    </div>
                  </TableCell>
                  <TableCell>
                    {jobOffer.company_name || (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {jobOffer.location ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[150px]" title={jobOffer.location}>
                          {jobOffer.location}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {jobOffer.job_type ? (
                      <Badge variant="secondary" className="text-xs">
                        {jobOffer.job_type}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {jobOffer.matched_client_name ? (
                      <Badge variant="outline" className="text-xs">
                        {jobOffer.matched_client_name}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">Aucun</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={jobOffer.assigned_to_user_id || 'unassigned'}
                      onValueChange={(value) => handleAssignmentChange(jobOffer.id, value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue>
                          {assignedUser ? (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span className="truncate">
                                {assignedUser.full_name || assignedUser.email}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-gray-400">
                              <UserX className="h-3 w-3" />
                              <span>Non assigné</span>
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">
                          <div className="flex items-center gap-2">
                            <UserX className="h-3 w-3" />
                            Non assigné
                          </div>
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
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-600">
                      {formatDistanceToNow(new Date(jobOffer.created_at), {
                        addSuffix: true,
                        locale: fr
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(jobOffer.url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredJobOffers.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  Aucune offre d'emploi trouvée pour les filtres sélectionnés.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
