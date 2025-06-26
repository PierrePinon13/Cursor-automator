
import { useState } from 'react';
import { Search, MapPin, Building, Calendar, Filter, Briefcase, Star, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import CustomSidebarTrigger from '@/components/ui/CustomSidebarTrigger';
import { JobCard } from '@/components/jobs/JobCard';
import { useIsMobile } from '@/hooks/use-mobile';

const JobSearch = () => {
  console.log('JobSearch component rendering');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('');

  // Mock job data with enhanced information
  const jobs = [
    {
      id: 1,
      title: 'Senior Frontend Developer',
      company: 'TechCorp',
      location: 'Paris, France',
      type: 'CDI',
      salary: '60k - 80k €',
      posted: '2 jours',
      description: 'Nous recherchons un développeur frontend expérimenté pour rejoindre notre équipe dynamique et contribuer au développement de nos applications web innovantes.',
      skills: ['React', 'TypeScript', 'Tailwind CSS'],
      featured: true,
      remote: false,
      urgent: false
    },
    {
      id: 2,
      title: 'Product Manager',
      company: 'StartupXYZ',
      location: 'Lyon, France',
      type: 'CDI',
      salary: '55k - 70k €',
      posted: '3 jours',
      description: 'Rejoignez notre équipe produit dynamique et aidez-nous à façonner l\'avenir de notre plateforme SaaS en pleine croissance.',
      skills: ['Product Strategy', 'Agile', 'Analytics'],
      featured: false,
      remote: true,
      urgent: true
    },
    {
      id: 3,
      title: 'UX/UI Designer',
      company: 'DesignStudio',
      location: 'Remote',
      type: 'Freelance',
      salary: '45k - 60k €',
      posted: '1 semaine',
      description: 'Nous cherchons un designer créatif pour améliorer l\'expérience utilisateur de nos produits digitaux et créer des interfaces intuitives.',
      skills: ['Figma', 'Design System', 'User Research'],
      featured: false,
      remote: true,
      urgent: false
    }
  ];

  // Définition des couleurs harmonisées pour le mock
  const jobTypeColors: Record<string, { 
    card: string, 
    header: string, 
    badge: string 
  }> = {
    'CDI': {
      card: 'bg-gradient-to-br from-blue-50/80 to-blue-100/60 border-blue-200/60 backdrop-blur-sm',
      header: 'bg-gradient-to-r from-blue-100/80 to-blue-50/60 border-blue-200/60',
      badge: 'bg-blue-100/80 text-blue-800 border-blue-200/60'
    },
    'Freelance': {
      card: 'bg-gradient-to-br from-indigo-50/80 to-indigo-100/60 border-indigo-200/60 backdrop-blur-sm',
      header: 'bg-gradient-to-r from-indigo-100/80 to-indigo-50/60 border-indigo-200/60',
      badge: 'bg-indigo-100/80 text-indigo-800 border-indigo-200/60'
    },
    'Stage': {
      card: 'bg-gradient-to-br from-yellow-50/80 to-yellow-100/60 border-yellow-200/60 backdrop-blur-sm',
      header: 'bg-gradient-to-r from-yellow-100/80 to-yellow-50/60 border-yellow-200/60',
      badge: 'bg-yellow-100/80 text-yellow-800 border-yellow-200/60'
    }
  };

  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isMobile = useIsMobile();

  return (
    <div className="flex-1 flex flex-col h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Unified Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <CustomSidebarTrigger />
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Briefcase className="h-6 w-6 text-indigo-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Job Offers</h1>
              <p className="text-sm text-gray-600">Find your next professional challenge</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className={`flex-1 overflow-auto ${isMobile ? 'px-2 pt-4 pb-6' : 'p-6'}`}>
        {/* Unified Search Section */}
        <Card className={`${isMobile ? 'mb-4 border-none bg-white/90' : 'mb-8 shadow-lg border-0 bg-white/80 backdrop-blur-sm'}`}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Search className="h-6 w-6 text-indigo-600" />
              Search for Job Offers
            </CardTitle>
            <CardDescription className="text-base">
              Explore thousands of job offers adapted to your profile
            </CardDescription>
          </CardHeader>
          <CardContent className={isMobile ? 'space-y-4' : 'space-y-6'}>
            {/* Search Inputs */}
            <div className={isMobile ? 'flex flex-col gap-3' : 'grid grid-cols-1 lg:grid-cols-3 gap-4'}>
              <div className={isMobile ? '' : 'lg:col-span-1'}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position or Company
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Ex: React Developer, Product Manager..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`pl-10 h-12 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 ${isMobile ? 'text-base' : ''}`}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Ex: Paris, Lyon, Remote..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className={`pl-10 h-12 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 ${isMobile ? 'text-base' : ''}`}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Type
                </label>
                <Select value={jobType} onValueChange={setJobType}>
                  <SelectTrigger className={`h-12 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 ${isMobile ? 'text-base' : ''}`}>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="cdi">CDI</SelectItem>
                    <SelectItem value="cdd">CDD</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                    <SelectItem value="stage">Stage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={`flex flex-wrap gap-3 ${isMobile ? 'justify-center' : ''}`}>
              <Button size={isMobile ? 'sm' : 'lg'} className={`px-8 bg-indigo-700 hover:bg-indigo-800 text-white w-full ${isMobile ? 'max-w-xs mx-auto' : ''}`}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button variant="outline" size={isMobile ? 'sm' : 'lg'} className={`px-6 border-indigo-200 text-indigo-700 hover:bg-indigo-50 w-full ${isMobile ? 'max-w-xs mx-auto' : ''}`}>
                <Filter className="h-4 w-4 mr-2" />
                Advanced Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Header */}
        <div className={`flex items-center justify-between mb-6 ${isMobile ? "flex-col gap-2" : ""}`}>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {filteredJobs.length} job offers found
            </h2>
            <p className="text-gray-600 mt-1">
              Sorted by relevance and date of publication
            </p>
          </div>
          <Select defaultValue="recent">
            <SelectTrigger className={isMobile ? "w-full h-10 mt-2" : "w-56 h-10"}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="relevant">Most Relevant</SelectItem>
              <SelectItem value="salary">Salary Ascending</SelectItem>
              <SelectItem value="company">Company A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Harmonized Job Offers Cards */}
        <div className={isMobile ? "flex flex-col gap-4" : "space-y-6"}>
          {filteredJobs.map((job) => {
            const colorSet = jobTypeColors[job.type] || jobTypeColors['CDI'];
            return (
              <JobCard
                key={job.id}
                job={job}
                colorSet={colorSet}
                isMobile={isMobile}
              />
            );
          })}
        </div>

        {/* Enhanced Empty State */}
        {filteredJobs.length === 0 && (
          <Card className={`bg-white/90 border-none`}>
            <CardContent className="p-8 text-center">
              <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                No job offer found
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Try modifying your search criteria or use other keywords to discover more opportunities.
              </p>
              <Button variant="outline" onClick={() => {
                setSearchTerm('');
                setLocation('');
                setJobType('');
              }}>
                Reset filters
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default JobSearch;
