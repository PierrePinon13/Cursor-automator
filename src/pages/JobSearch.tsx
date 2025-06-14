
import { useState } from 'react';
import { Search, MapPin, Building, Calendar, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import CustomSidebarTrigger from '@/components/ui/CustomSidebarTrigger';

const JobSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('');

  // Mock job data
  const jobs = [
    {
      id: 1,
      title: 'Senior Frontend Developer',
      company: 'TechCorp',
      location: 'Paris, France',
      type: 'Full-time',
      salary: '60k - 80k €',
      posted: '2 jours',
      description: 'Nous recherchons un développeur frontend expérimenté pour rejoindre notre équipe...',
      skills: ['React', 'TypeScript', 'Tailwind CSS']
    },
    {
      id: 2,
      title: 'Product Manager',
      company: 'StartupXYZ',
      location: 'Lyon, France',
      type: 'Full-time',
      salary: '55k - 70k €',
      posted: '3 jours',
      description: 'Rejoignez notre équipe produit dynamique et aidez-nous à façonner l\'avenir...',
      skills: ['Product Strategy', 'Agile', 'Analytics']
    },
    {
      id: 3,
      title: 'UX/UI Designer',
      company: 'DesignStudio',
      location: 'Remote',
      type: 'Contract',
      salary: '45k - 60k €',
      posted: '1 semaine',
      description: 'Nous cherchons un designer créatif pour améliorer l\'expérience utilisateur...',
      skills: ['Figma', 'Design System', 'User Research']
    }
  ];

  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <CustomSidebarTrigger />
          <h1 className="text-2xl font-bold text-gray-900">Job Search</h1>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Search Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Rechercher des opportunités
            </CardTitle>
            <CardDescription>
              Trouvez votre prochain emploi parmi des milliers d'offres
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Titre du poste, entreprise..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Localisation"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Select value={jobType} onValueChange={setJobType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type de contrat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous</SelectItem>
                    <SelectItem value="full-time">CDI</SelectItem>
                    <SelectItem value="part-time">Temps partiel</SelectItem>
                    <SelectItem value="contract">Freelance</SelectItem>
                    <SelectItem value="internship">Stage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button>
                <Search className="h-4 w-4 mr-2" />
                Rechercher
              </Button>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filtres avancés
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {filteredJobs.length} offres trouvées
            </h2>
            <Select defaultValue="recent">
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Plus récentes</SelectItem>
                <SelectItem value="salary">Salaire</SelectItem>
                <SelectItem value="company">Entreprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredJobs.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      {job.title}
                    </h3>
                    <div className="flex items-center gap-4 text-gray-600 mb-2">
                      <div className="flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        {job.company}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {job.posted}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-green-600 mb-1">
                      {job.salary}
                    </div>
                    <Badge variant={job.type === 'Full-time' ? 'default' : 'secondary'}>
                      {job.type}
                    </Badge>
                  </div>
                </div>

                <p className="text-gray-700 mb-4 line-clamp-2">
                  {job.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex gap-2 flex-wrap">
                    {job.skills.map((skill, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Sauvegarder
                    </Button>
                    <Button size="sm">
                      Postuler
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredJobs.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucune offre trouvée
              </h3>
              <p className="text-gray-600">
                Essayez de modifier vos critères de recherche
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default JobSearch;
