import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { X, Linkedin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import LeadDetailNavigation from './LeadDetailNavigation';
import NotificationButton from '../notifications/NotificationButton';
import CompanyHoverCard from './CompanyHoverCard';

interface Lead {
  author_name: string;
  author_profile_url: string;
  author_headline: string;
  unipile_company: string;
  unipile_position: string;
  company_id?: string;
  company_name?: string;
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
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Toujours passer tous les ids si disponibles
  const companyName = lead.company_name || lead.unipile_company || '';
  const companyId = lead.company_id;
  const companyLinkedInId =
    (lead as any).company_1_linkedin_id ||
    (lead as any).unipile_company_linkedin_id ||
    (lead as any).company_linkedin_id;

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  return (
    <div className="px-6 py-4 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {/* Première ligne : Nom + LinkedIn */}
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-medium text-lg text-gray-900">{lead.author_name || 'N/A'}</h3>
            <a
              href={lead.author_profile_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Linkedin className="h-4 w-4" />
            </a>
          </div>
          
          {/* Deuxième ligne : Poste @ Entreprise */}
          <div className="text-sm text-gray-600 flex items-center gap-1">
            {lead.unipile_position && (
              <span className="text-gray-700">{lead.unipile_position}</span>
            )}
            {lead.unipile_position && companyName && <span className="mx-1 text-gray-400">@</span>}
            {companyName && (
              <CompanyHoverCard 
                companyId={companyId}
                companyLinkedInId={companyLinkedInId}
                companyName={companyName}
              >
                <span className="text-blue-600 hover:text-blue-700 cursor-pointer hover:underline transition-colors">
                  {companyName}
                </span>
              </CompanyHoverCard>
            )}
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
          
          <div className="flex items-center gap-2">
            <NotificationButton />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.user_metadata?.avatar_url} alt="Profile" />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none">{user?.email}</p>
                </div>
                <DropdownMenuItem onClick={handleProfileClick}>
                  Profil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
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
