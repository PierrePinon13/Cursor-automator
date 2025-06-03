
import { useState } from 'react';
import { useClientContacts } from '@/hooks/useClientContacts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ContactDialog } from './ContactDialog';
import { ContactUserAssociations } from './ContactUserAssociations';
import { 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  Globe, 
  Plus, 
  Edit2, 
  Trash2,
  FileText,
  Calendar
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface ContactsListProps {
  clientId: string;
  clientName: string;
}

export function ContactsList({ clientId, clientName }: ContactsListProps) {
  const { contacts, loading, deleteContact } = useClientContacts(clientId);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);

  const handleEdit = (contact: any) => {
    setEditingContact(contact);
    setShowContactDialog(true);
  };

  const handleCreate = () => {
    setEditingContact(null);
    setShowContactDialog(true);
  };

  const handleDelete = async (contactId: string) => {
    await deleteContact(contactId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Chargement des contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Contacts - {clientName}</h3>
          <p className="text-sm text-muted-foreground">
            {contacts.length} contact{contacts.length > 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nouveau contact
        </Button>
      </div>

      {/* Contacts Grid */}
      {contacts.length === 0 ? (
        <Card className="p-8 text-center">
          <CardContent>
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h4 className="text-lg font-medium mb-2">Aucun contact</h4>
            <p className="text-muted-foreground mb-4">
              Commencez par ajouter un contact pour ce client
            </p>
            <Button onClick={handleCreate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un contact
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact) => (
            <Card key={contact.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-base">
                      {contact.first_name} {contact.last_name}
                    </CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(contact)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer le contact</AlertDialogTitle>
                          <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer {contact.first_name} {contact.last_name} ? 
                            Cette action est irréversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(contact.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                
                {contact.position && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    {contact.position}
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Contact Info */}
                <div className="space-y-2">
                  {contact.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`mailto:${contact.email}`}
                        className="text-blue-600 hover:underline truncate"
                      >
                        {contact.email}
                      </a>
                    </div>
                  )}

                  {contact.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`tel:${contact.phone}`}
                        className="text-blue-600 hover:underline"
                      >
                        {contact.phone}
                      </a>
                    </div>
                  )}

                  {contact.linkedin_url && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={contact.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate"
                      >
                        Profil LinkedIn
                      </a>
                    </div>
                  )}
                </div>

                {/* User Associations */}
                <ContactUserAssociations 
                  contactId={contact.id} 
                  contactName={`${contact.first_name} ${contact.last_name}`}
                />

                {/* Notes */}
                {contact.notes && (
                  <div className="flex gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground line-clamp-2">{contact.notes}</p>
                  </div>
                )}

                {/* Status badges */}
                <div className="flex gap-2">
                  {contact.unipile_extracted_at && (
                    <Badge variant="secondary" className="text-xs">
                      LinkedIn extrait
                    </Badge>
                  )}
                </div>

                {/* Created date */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                  <Calendar className="h-3 w-3" />
                  Créé le {formatDate(contact.created_at)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Contact Dialog */}
      <ContactDialog
        open={showContactDialog}
        onOpenChange={(open) => {
          setShowContactDialog(open);
          if (!open) setEditingContact(null);
        }}
        clientId={clientId}
        contact={editingContact}
      />
    </div>
  );
}
