
import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { X, Linkedin } from 'lucide-react';
import LeadDetailNavigation from './LeadDetailNavigation';

interface Lead {
  author_name: string;
  author_profile_url: string;
  author_headline: string;
  unipile_company: string;
  unipile_position: string;
}

interface LeadDetailHeaderProps {
  lead: Lead;
  selectedLeadIndex: number;
  totalLeads: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
}

const LeadDetailHeader = ({
  lead,
  selectedLeadIndex,
  totalLeads,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
  onClose
}: LeadDetailHeaderProps) => {
  return (
    <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-semibold text-lg text-gray-800">{lead.author_name || 'N/A'}</h3>
              <a
                href={lead.author_profile_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 transition-colors hover:scale-110 transform duration-200"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
            <div className="text-sm text-gray-600">
              {lead.unipile_position && (
                <span>{lead.unipile_position}</span>
              )}
              {lead.unipile_position && lead.unipile_company && <span> @ </span>}
              {lead.unipile_company && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help hover:text-blue-600 transition-colors">
                      {lead.unipile_company}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs bg-gray-900 text-white p-3 rounded-lg shadow-lg">
                    <p className="text-sm">
                      {lead.author_headline || "Description de l'activité non disponible"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <LeadDetailNavigation
            currentIndex={selectedLeadIndex}
            totalLeads={totalLeads}
            canGoPrevious={canGoPrevious}
            canGoNext={canGoNext}
            onPrevious={onPrevious}
            onNext={onNext}
          />
          
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailHeader;
