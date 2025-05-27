
import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Phone, PhoneOff, Search } from 'lucide-react';
import { useUserStats } from '@/hooks/useUserStats';

interface ActivityLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ActivityLogSheet = ({ open, onOpenChange }: ActivityLogSheetProps) => {
  const { stats, loading, fetchStats } = useUserStats();
  const [searchTerm, setSearchTerm] = useState('');
  const [activityFilter, setActivityFilter] = useState('all');

  useEffect(() => {
    if (open) {
      // Charger toutes les activités quand le sheet s'ouvre
      fetchStats('personal', 'all-time');
    }
  }, [open, fetchStats]);

  const getActivityIcon = (stat: any) => {
    if (stat.linkedin_messages_sent > 0) return <MessageSquare className="h-4 w-4 text-blue-500" />;
    if (stat.positive_calls > 0) return <Phone className="h-4 w-4 text-green-500" />;
    if (stat.negative_calls > 0) return <PhoneOff className="h-4 w-4 text-red-500" />;
    return <div className="h-4 w-4 bg-gray-300 rounded-full" />;
  };

  const getActivityDescription = (stat: any) => {
    const activities = [];
    if (stat.linkedin_messages_sent > 0) {
      activities.push(`${stat.linkedin_messages_sent} message${stat.linkedin_messages_sent > 1 ? 's' : ''} LinkedIn`);
    }
    if (stat.positive_calls > 0) {
      activities.push(`${stat.positive_calls} appel${stat.positive_calls > 1 ? 's' : ''} positif${stat.positive_calls > 1 ? 's' : ''}`);
    }
    if (stat.negative_calls > 0) {
      activities.push(`${stat.negative_calls} appel${stat.negative_calls > 1 ? 's' : ''} négatif${stat.negative_calls > 1 ? 's' : ''}`);
    }
    return activities.join(' • ') || 'Aucune activité';
  };

  const filteredStats = stats.filter(stat => {
    const description = getActivityDescription(stat).toLowerCase();
    const matchesSearch = description.includes(searchTerm.toLowerCase());
    
    if (activityFilter === 'all') return matchesSearch;
    if (activityFilter === 'linkedin' && stat.linkedin_messages_sent > 0) return matchesSearch;
    if (activityFilter === 'calls' && (stat.positive_calls > 0 || stat.negative_calls > 0)) return matchesSearch;
    
    return false;
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Journal des activités</SheetTitle>
          <SheetDescription>
            Historique complet de vos activités
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-4 mt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher dans les activités..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={activityFilter} onValueChange={setActivityFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tout</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="calls">Appels</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Chargement des activités...
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-3">
                {filteredStats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune activité trouvée
                  </div>
                ) : (
                  filteredStats.map((stat, index) => (
                    <div key={`${stat.user_id}-${stat.stat_date}-${index}`} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="mt-1">
                        {getActivityIcon(stat)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {getActivityDescription(stat)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(stat.stat_date).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(stat.stat_date), { 
                            addSuffix: true, 
                            locale: fr 
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ActivityLogSheet;
