import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp } from 'lucide-react';

const VARIABLE_LABELS: Record<string, string> = {
  firstName: 'Prénom',
  lastName: 'Nom',
  jobTitle: 'Titre de poste',
  companyName: 'Entreprise',
  personaTitle: 'Titre du contact',
  personaCompany: 'Entreprise du contact',
};

function extractVariables(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g) || [];
  const variables = matches.map(m => m.replace(/[{}]/g, ''));
  // Uniques, jobTitle toujours dernier
  const uniq = Array.from(new Set(variables.filter(v => v !== 'jobTitle')));
  uniq.push('jobTitle');
  return uniq;
}

export const ProspectingStepVariables = ({ template, selectedPersonas, variableReplacements, onChange }: {
  template: string;
  selectedPersonas: any[];
  variableReplacements: any;
  onChange: (replacements: any) => void;
}) => {
  const variables = useMemo(() => extractVariables(template), [template]);
  const [openVar, setOpenVar] = useState('jobTitle');

  // Pour chaque variable, extraire les valeurs distinctes trouvées dans les personas
  const valuesByVariable = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    variables.forEach(variable => {
      map[variable] = new Set();
      selectedPersonas.forEach(persona => {
        let value = '';
        switch (variable) {
          case 'firstName':
            value = persona.name?.split(' ')[0] || persona.name || '';
            break;
          case 'lastName':
            value = persona.name?.split(' ').slice(1).join(' ') || '';
            break;
          case 'jobTitle':
            value = persona.jobTitle || '';
            break;
          case 'companyName':
            value = persona.jobCompany || '';
            break;
          case 'personaTitle':
            value = persona.title || '';
            break;
          case 'personaCompany':
            value = persona.company || '';
            break;
          default:
            value = '';
        }
        if (value) map[variable].add(value);
      });
    });
    return map;
  }, [variables, selectedPersonas]);

  const handleValueChange = (variable: string, original: string, replacement: string) => {
    onChange({
      ...variableReplacements,
      [variable]: {
        ...(variableReplacements?.[variable] || {}),
        [original]: replacement
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Variables à corriger
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          Modifiez les valeurs qui seront injectées dans les messages. Les corrections s’appliqueront à tous les messages générés.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {variables.map((variable, idx) => {
          const values = Array.from(valuesByVariable[variable] || []);
          if (values.length === 0) return null;
          const isJobTitle = variable === 'jobTitle';
          return (
            <div key={variable} className="border rounded-lg p-3 bg-gray-50">
              <button
                type="button"
                className="flex items-center gap-2 w-full text-left font-medium text-blue-900 mb-2 focus:outline-none"
                onClick={() => setOpenVar(openVar === variable ? '' : variable)}
                aria-expanded={openVar === variable}
              >
                {isJobTitle ? <span className="text-blue-700">{VARIABLE_LABELS[variable] || variable}</span> : (VARIABLE_LABELS[variable] || variable)}
                {openVar === variable ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
              </button>
              {openVar === variable && (
                <div className="space-y-2">
                  {values.map((val) => (
                    <div key={val} className="flex items-center gap-2">
                      <span
                        className={`text-gray-700 ${variable === 'jobTitle' ? 'overflow-x-auto whitespace-nowrap max-w-full block' : 'break-words whitespace-pre-line'}`}
                        style={variable === 'jobTitle' ? { maxWidth: '100%', overflowX: 'auto', whiteSpace: 'nowrap', display: 'block' } : {}}
                      >
                        {val}
                      </span>
                      <span className="mx-2 text-gray-400">→</span>
                      <Input
                        className="flex-1"
                        value={variableReplacements?.[variable]?.[val] ?? ''}
                        onChange={e => handleValueChange(variable, val, e.target.value)}
                        placeholder={`Remplacer par...`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}; 