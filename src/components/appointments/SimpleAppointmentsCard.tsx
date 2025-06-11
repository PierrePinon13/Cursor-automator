
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SimpleAppointment {
  id: string;
  lead_id: string;
  booked_by_user_name: string;
  appointment_date: string;
  notes: string;
  status: string;
  created_at: string;
  // Données du lead récupérées séparément
  lead_author_name?: string;
  lead_company_name?: string;
  lead_phone_number?: string;
}

const SimpleAppointmentsCard = () => {
  const [appointments, setAppointments] = useState<SimpleAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      
      // Récupérer d'abord les rendez-vous
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('booked_appointments')
        .select('*')
        .order('appointment_date', { ascending: true });

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
        throw appointmentsError;
      }

      if (!appointmentsData || appointmentsData.length === 0) {
        setAppointments([]);
        return;
      }

      // Récupérer les IDs des leads
      const leadIds = appointmentsData.map(apt => apt.lead_id);
      
      // Récupérer les données des leads séparément
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('id, author_name, company_name, unipile_company, phone_number')
        .in('id', leadIds);

      if (leadsError) {
        console.error('Error fetching leads:', leadsError);
        // Continuer même si les leads ne peuvent pas être récupérés
      }

      // Combiner les données
      const combinedAppointments: SimpleAppointment[] = appointmentsData.map(apt => {
        const lead = leadsData?.find(l => l.id === apt.lead_id);
        return {
          id: apt.id,
          lead_id: apt.lead_id,
          booked_by_user_name: apt.booked_by_user_name || 'Utilisateur inconnu',
          appointment_date: apt.appointment_date || '',
          notes: apt.notes || '',
          status: apt.status || 'scheduled',
          created_at: apt.created_at,
          lead_author_name: lead?.author_name || 'Nom inconnu',
          lead_company_name: lead?.company_name || lead?.unipile_company || '',
          lead_phone_number: lead?.phone_number || ''
        };
      });
      
      setAppointments(combinedAppointments);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les rendez-vous",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('booked_appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Statut mis à jour",
        description: "Le statut du rendez-vous a été mis à jour",
      });

      fetchAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline" className="text-blue-600 border-blue-300">Programmé</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-green-600 border-green-300">Terminé</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-red-600 border-red-300">Annulé</Badge>;
      case 'no_show':
        return <Badge variant="outline" className="text-orange-600 border-orange-300">Absent</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const upcomingAppointments = appointments.filter(apt => {
    if (!apt.appointment_date) return false;
    const appointmentDate = new Date(apt.appointment_date);
    return appointmentDate >= new Date() && apt.status === 'scheduled';
  });

  const pastAppointments = appointments.filter(apt => {
    if (!apt.appointment_date) return apt.status !== 'scheduled';
    const appointmentDate = new Date(apt.appointment_date);
    return appointmentDate < new Date() || apt.status !== 'scheduled';
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Rendez-vous
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Chargement des rendez-vous...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Rendez-vous ({appointments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rendez-vous à venir */}
        {upcomingAppointments.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-3 text-green-700">Prochains rendez-vous</h3>
            <div className="space-y-3">
              {upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="border rounded-lg p-4 bg-green-50 border-green-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-gray-600" />
                        <span className="font-medium">{appointment.lead_author_name}</span>
                        {getStatusBadge(appointment.status)}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {format(new Date(appointment.appointment_date), 'PPpp', { locale: fr })}
                        </div>
                        
                        {appointment.lead_company_name && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs">Entreprise:</span>
                            <span>{appointment.lead_company_name}</span>
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-500">
                          Programmé par {appointment.booked_by_user_name}
                        </div>
                        
                        {appointment.notes && (
                          <div className="mt-2">
                            <span className="text-sm">{appointment.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                        className="text-green-600 border-green-300 hover:bg-green-50"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rendez-vous passés */}
        {pastAppointments.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-3 text-gray-700">Historique</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pastAppointments.slice(0, 10).map((appointment) => (
                <div key={appointment.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-gray-600" />
                        <span className="font-medium">{appointment.lead_author_name}</span>
                        {getStatusBadge(appointment.status)}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {format(new Date(appointment.appointment_date), 'PPpp', { locale: fr })}
                        </div>
                        
                        {appointment.lead_company_name && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs">Entreprise:</span>
                            <span>{appointment.lead_company_name}</span>
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-500">
                          Programmé par {appointment.booked_by_user_name}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {appointments.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Aucun rendez-vous programmé</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SimpleAppointmentsCard;
