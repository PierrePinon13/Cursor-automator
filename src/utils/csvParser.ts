
export interface CSVParseResult {
  headers: string[];
  rows: string[][];
  errors: string[];
}

export function parseCSVText(csvText: string): CSVParseResult {
  const result: CSVParseResult = {
    headers: [],
    rows: [],
    errors: []
  };

  try {
    const lines = csvText.trim().split('\n');
    
    if (lines.length === 0) {
      result.errors.push('Le fichier CSV est vide');
      return result;
    }

    // Parse headers
    const headerLine = lines[0];
    result.headers = parseCSVLine(headerLine);
    
    if (result.headers.length === 0) {
      result.errors.push('Aucun en-tête trouvé dans le fichier CSV');
      return result;
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length === 0) continue; // Skip empty lines
      
      try {
        const cells = parseCSVLine(line);
        
        // Pad or trim cells to match header count
        while (cells.length < result.headers.length) {
          cells.push('');
        }
        if (cells.length > result.headers.length) {
          cells.splice(result.headers.length);
        }
        
        result.rows.push(cells);
      } catch (error) {
        result.errors.push(`Erreur ligne ${i + 1}: ${error instanceof Error ? error.message : 'Format invalide'}`);
      }
    }

    if (result.rows.length === 0) {
      result.errors.push('Aucune donnée trouvée dans le fichier CSV');
    }

  } catch (error) {
    result.errors.push(`Erreur de parsing: ${error instanceof Error ? error.message : 'Format invalide'}`);
  }

  return result;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  
  return result;
}
