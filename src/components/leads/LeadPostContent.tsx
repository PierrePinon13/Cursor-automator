
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tables } from '@/integrations/supabase/types';

type Lead = Tables<'leads'>;

interface LeadPostContentProps {
  lead: Lead;
}

const LeadPostContent = ({ lead }: LeadPostContentProps) => {
  if (!lead.post_content) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Contenu du Post LinkedIn</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap text-gray-700">
            {lead.post_content}
          </p>
        </div>
        {lead.post_url && (
          <div className="mt-4">
            <a 
              href={lead.post_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm underline"
            >
              Voir le post sur LinkedIn
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeadPostContent;
