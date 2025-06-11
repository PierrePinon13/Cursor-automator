
-- Table pour stocker les rendez-vous bookés
CREATE TABLE public.booked_appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  booked_by_user_id UUID NOT NULL,
  booked_by_user_name TEXT,
  booked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  appointment_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, completed, cancelled, no_show
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ajouter une colonne pour traquer qui a contacté le lead
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS contacted_by_user_id UUID,
ADD COLUMN IF NOT EXISTS contacted_by_user_name TEXT,
ADD COLUMN IF NOT EXISTS has_booked_appointment BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS appointment_booked_at TIMESTAMP WITH TIME ZONE;

-- Ajouter une colonne pour traquer les réponses positives
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS positive_response_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS positive_response_by_user_id UUID,
ADD COLUMN IF NOT EXISTS positive_response_notes TEXT;

-- RLS pour booked_appointments
ALTER TABLE public.booked_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all booked appointments" 
  ON public.booked_appointments 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can create booked appointments" 
  ON public.booked_appointments 
  FOR INSERT 
  WITH CHECK (auth.uid() = booked_by_user_id);

CREATE POLICY "Users can update their own booked appointments" 
  ON public.booked_appointments 
  FOR UPDATE 
  USING (auth.uid() = booked_by_user_id);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_booked_appointments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_booked_appointments_updated_at
  BEFORE UPDATE ON public.booked_appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_booked_appointments_updated_at();

-- Trigger pour mettre à jour le lead quand un RDV est booké
CREATE OR REPLACE FUNCTION update_lead_on_appointment_booking()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.leads 
  SET 
    has_booked_appointment = true,
    appointment_booked_at = NEW.booked_at,
    last_updated_at = now()
  WHERE id = NEW.lead_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lead_on_appointment_booking
  AFTER INSERT ON public.booked_appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_on_appointment_booking();
