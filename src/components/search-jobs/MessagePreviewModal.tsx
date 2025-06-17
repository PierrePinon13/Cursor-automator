import { useState, useMemo, lazy, Suspense } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageSquare, Send, Clock, CheckCircle, AlertCircle, User, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Persona {
  id: string;
  name: string;
  title: string;
  profileUrl: string;
  company?: string;
  linkedin_id?: string;
}

interface MessagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  personas: Persona[];
  jobTitle: string;
  companyName: string;
  initialTemplate?: string;
}

interface MessageStatus {
  personaId: string;
  status: 'pending' | 'sending' | 'sent' | 'error';
  error?: string;
}

interface MessagePreview {
  persona: Persona;
  preview: string;
  characterCount: number;
  isOverLimit: boolean;
  lastContactInfo?: {
    lastContactAt: string;
    contactedBy: string;
    hoursAgo: number;
    daysAgo: number;
  };
}

const MAX_MESSAGE_LENGTH = 300;

export const MessagePreviewModal = ({ 
  isOpen, 
  onClose, 
  personas, 
  jobTitle, 
  companyName,
  initialTemplate = ''
}: MessagePreviewModalProps) => {
  // Importer le nouveau composant éditable
  const EditableMessagePreviewModal = lazy(() => 
    import('./EditableMessagePreviewModal').then(module => ({ 
      default: module.EditableMessagePreviewModal 
    }))
  );

  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <EditableMessagePreviewModal
        isOpen={isOpen}
        onClose={onClose}
        personas={personas}
        jobTitle={jobTitle}
        companyName={companyName}
        initialTemplate={initialTemplate}
      />
    </Suspense>
  );
};
