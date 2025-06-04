
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  // Déterminer quel nom d'entreprise utiliser et quel ID
  const companyName = lead.company_name || lead.unipile_company;
  const companyId = lead.company_id;

  return (
    <div className="px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {/* Première ligne : Nom + LinkedIn */}
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-xl text-gray-900">{lead.author_name || 'N/A'}</h3>
            <a
              href={lead.author_profile_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 transition-colors hover:scale-110 transform duration-200"
            >
              <Linkedin className="h-5 w-5" />
            </a>
          </div>
          
          {/* Deuxième ligne : Poste @ Entreprise */}
          <div className="text-gray-600 flex items-center gap-1">
            {lead.unipile_position && (
              <span className="font-medium text-gray-700">{lead.unipile_position}</span>
            )}
            {lead.unipile_position && companyName && <span className="mx-1 text-gray-500">@</span>}
            {companyName && (
              <CompanyHoverCard 
                companyId={companyId} 
                companyName={companyName}
              >
                <span className="font-semibold text-blue-600 hover:text-blue-800 cursor-pointer hover:underline transition-all duration-200 bg-blue-50 px-2 py-1 rounded">
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
          
          {/* Boutons de notifications et profil */}
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
            className="h-8 w-8 p-0 border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailHeader;
