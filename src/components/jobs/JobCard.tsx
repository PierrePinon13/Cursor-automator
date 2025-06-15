
import React from 'react';
import { Building, MapPin, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface JobCardProps {
  job: {
    id: number;
    title: string;
    company: string;
    location: string;
    type: string;
    salary?: string;
    posted: string;
    description: string;
    skills: string[];
    featured: boolean;
    remote: boolean;
    urgent: boolean;
  };
  colorSet: {
    card: string;
    header: string;
    badge: string;
  };
  isMobile: boolean;
}

export const JobCard: React.FC<JobCardProps> = ({ job, colorSet, isMobile }) => {
  const fontSizeClass = job.title.length > 35
    ? (isMobile ? "text-base" : "text-xl")
    : (isMobile ? "text-lg" : "text-xl");

  return (
    <div
      className={`
        ${colorSet.card} rounded-xl border shadow-sm transition-all duration-300 overflow-hidden flex flex-col
        ${isMobile
          ? "min-h-[170px] active:scale-[0.97] touch-manipulation"
          : "min-h-[230px] hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] cursor-pointer"
        }
      `}
    >
      {/* Header */}
      <div className={`${colorSet.header} border-b min-h-[56px] flex items-center justify-between flex-shrink-0 backdrop-blur-sm ${isMobile ? "p-3" : "p-4"}`}>
        <div className="flex-1 flex flex-col min-h-0 justify-center">
          <div className={`font-bold leading-tight ${fontSizeClass} mb-1 truncate`} style={{
            color: colorSet.badge.includes('text-') && colorSet.badge.split(' ').find((c:string) => c.startsWith('text-')),
            textShadow: '0 1px 2px rgba(0,0,0,0.07)'
          }}>
            {job.title}
          </div>
        </div>
        <div className="ml-2 flex-shrink-0">
          <Badge 
            variant="secondary" 
            className={`text-xs px-2 py-1 ${colorSet.badge} border font-semibold backdrop-blur-sm`}
            style={isMobile ? { fontSize: 12, padding: '3px 8px' } : undefined}
          >
            {job.type}
          </Badge>
        </div>
      </div>
      {/* Central Section */}
      <div className={`flex-1 bg-white/20 backdrop-blur-sm ${isMobile ? "p-3 space-y-2" : "p-4 space-y-3"}`}>
        <div className="flex items-center justify-between">
          <span className={`font-semibold text-gray-900 flex items-center gap-2 ${isMobile ? "text-xs" : "text-sm"}`}>
            <Building className="h-4 w-4" />
            {job.company}
          </span>
          {job.salary && (
            <span className="font-medium text-green-700 flex items-center gap-1">
              {job.salary}
            </span>
          )}
        </div>
        <div className={`flex items-center gap-2 text-gray-700 ${isMobile ? "text-xs" : "text-sm"}`}>
          <MapPin className="h-4 w-4" />
          {job.location}
          {job.remote && (
            <Badge variant="secondary" className="ml-1 text-xs">
              Remote
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-gray-600 text-xs">
          <Calendar className="h-4 w-4" />
          Posted {job.posted} ago
        </div>
        <p className="text-xs text-gray-600 line-clamp-2">
          {job.description}
        </p>
        {/* Skills */}
        {job.skills && (
          <div className="flex gap-2 flex-wrap">
            {job.skills.map((skill, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="text-xs px-3 py-1 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 transition-colors"
              >
                {skill}
              </Badge>
            ))}
          </div>
        )}
      </div>
      {/* Footer */}
      <div className={`bg-white/30 backdrop-blur-sm px-4 py-3 border-t border-gray-200/40 flex-shrink-0 flex ${isMobile ? 'justify-center' : 'justify-end'}`}>
        <Button size={isMobile ? "sm" : "sm"} className="px-6 bg-indigo-700 hover:bg-indigo-800 text-white">Apply Now</Button>
      </div>
    </div>
  )
}
