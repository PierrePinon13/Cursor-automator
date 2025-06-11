
export interface AppointmentData {
  id: string;
  lead_id: string;
  booked_by_user_name: string;
  appointment_date: string;
  notes: string;
  status: string;
  created_at: string;
  lead?: {
    author_name?: string;
    company_name?: string;
    unipile_company?: string;
    phone_number?: string;
  } | null;
}

export interface AppointmentsSectionProps {
  className?: string;
}
