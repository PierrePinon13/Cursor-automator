
import { useState } from 'react';
import { Search, MapPin, Building, Calendar, Filter, Briefcase, Star, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import CustomSidebarTrigger from '@/components/ui/CustomSidebarTrigger';

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

  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Enhanced Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <CustomSidebarTrigger />
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Briefcase className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Recherche d'emploi</h1>
              <p className="text-sm text-gray-600">Trouvez votre prochain défi professionnel</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Enhanced Search Section */}
        <Card className="mb-8 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Search className="h-6 w-6 text-blue-600" />
              Rechercher des opportunités
            </CardTitle>
            <CardDescription className="text-base">
              Explorez des milliers d'offres d'emploi adaptées à votre profil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search Inputs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Poste ou entreprise
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Ex: Développeur React, Product Manager..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Localisation
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Ex: Paris, Lyon, Remote..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de contrat
                </label>
                <Select value={jobType} onValueChange={setJobType}>
                  <SelectTrigger className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Tous les types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="cdi">CDI</SelectItem>
                    <SelectItem value="cdd">CDD</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                    <SelectItem value="stage">Stage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="px-8">
                <Search className="h-4 w-4 mr-2" />
                Rechercher
              </Button>
              <Button variant="outline" size="lg" className="px-6">
                <Filter className="h-4 w-4 mr-2" />
                Filtres avancés
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {filteredJobs.length} offres trouvées
            </h2>
            <p className="text-gray-600 mt-1">
              Triées par pertinence et date de publication
            </p>
          </div>
          <Select defaultValue="recent">
            <SelectTrigger className="w-56 h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Plus récentes</SelectItem>
              <SelectItem value="relevant">Plus pertinentes</SelectItem>
              <SelectItem value="salary">Salaire croissant</SelectItem>
              <SelectItem value="company">Entreprise A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Enhanced Job Cards */}
        <div className="space-y-6">
          {filteredJobs.map((job) => (
            <Card key={job.id} className="hover:shadow-xl transition-all duration-300 cursor-pointer border-0 shadow-md bg-white/90 backdrop-blur-sm group">
              <CardContent className="p-6">
                {/* Job Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {job.title}
                      </h3>
                      {job.featured && (
                        <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0">
                          <Star className="h-3 w-3 mr-1" />
                          Mise en avant
                        </Badge>
                      )}
                      {job.urgent && (
                        <Badge variant="destructive" className="animate-pulse">
                          <Clock className="h-3 w-3 mr-1" />
                          Urgent
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        <span className="font-medium">{job.company}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{job.location}</span>
                        {job.remote && (
                          <Badge variant="secondary" className="ml-1 text-xs">
                            Remote
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>il y a {job.posted}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right ml-6">
                    <div className="text-xl font-bold text-green-600 mb-2">
                      {job.salary}
                    </div>
                    <Badge 
                      variant={job.type === 'CDI' ? 'default' : 'secondary'}
                      className="text-sm px-3 py-1"
                    >
                      {job.type}
                    </Badge>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Job Description */}
                <p className="text-gray-700 mb-4 leading-relaxed">
                  {job.description}
                </p>

                {/* Skills and Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 flex-wrap">
                    {job.skills.map((skill, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="text-xs px-3 py-1 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex gap-3">
                    <Button variant="outline" size="sm" className="px-4">
                      <Star className="h-4 w-4 mr-1" />
                      Sauvegarder
                    </Button>
                    <Button size="sm" className="px-6">
                      Postuler maintenant
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Enhanced Empty State */}
        {filteredJobs.length === 0 && (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Search className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Aucune offre trouvée
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Essayez de modifier vos critères de recherche ou explorez d'autres mots-clés pour découvrir plus d'opportunités.
              </p>
              <Button variant="outline" onClick={() => {
                setSearchTerm('');
                setLocation('');
                setJobType('');
              }}>
                Réinitialiser les filtres
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default JobSearch;
