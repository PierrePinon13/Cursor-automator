
export interface LocationData {
  label: string;
  geoId: number;
  country?: string;
}

export const locationData: LocationData[] = [
  // France
  { label: "France", geoId: 105015875, country: "France" },
  { label: "Paris", geoId: 102004600, country: "France" },
  { label: "Lyon", geoId: 104345153, country: "France" },
  { label: "Marseille", geoId: 104735038, country: "France" },
  { label: "Toulouse", geoId: 102883095, country: "France" },
  { label: "Nice", geoId: 102838957, country: "France" },
  { label: "Nantes", geoId: 104735039, country: "France" },
  { label: "Strasbourg", geoId: 102883096, country: "France" },
  { label: "Bordeaux", geoId: 104735040, country: "France" },
  { label: "Lille", geoId: 104735041, country: "France" },
  { label: "Rennes", geoId: 104735042, country: "France" },
  { label: "Reims", geoId: 104735043, country: "France" },
  { label: "Montpellier", geoId: 104735044, country: "France" },
  
  // Belgique
  { label: "Belgique", geoId: 100565514, country: "Belgique" },
  { label: "Bruxelles", geoId: 101620260, country: "Belgique" },
  { label: "Anvers", geoId: 101620261, country: "Belgique" },
  { label: "Gand", geoId: 101620262, country: "Belgique" },
  { label: "Liège", geoId: 101620263, country: "Belgique" },
  
  // Suisse
  { label: "Suisse", geoId: 106693272, country: "Suisse" },
  { label: "Zurich", geoId: 103035204, country: "Suisse" },
  { label: "Genève", geoId: 103035205, country: "Suisse" },
  { label: "Bâle", geoId: 103035206, country: "Suisse" },
  { label: "Lausanne", geoId: 103035207, country: "Suisse" },
  
  // Luxembourg
  { label: "Luxembourg", geoId: 104042105, country: "Luxembourg" },
  
  // Canada
  { label: "Canada", geoId: 101174742, country: "Canada" },
  { label: "Montréal", geoId: 102257491, country: "Canada" },
  { label: "Toronto", geoId: 102257492, country: "Canada" },
  { label: "Vancouver", geoId: 102257493, country: "Canada" },
  { label: "Ottawa", geoId: 102257494, country: "Canada" },
  { label: "Calgary", geoId: 102257495, country: "Canada" },
  { label: "Québec", geoId: 102257496, country: "Canada" },
  
  // Maroc
  { label: "Maroc", geoId: 104769905, country: "Maroc" },
  { label: "Casablanca", geoId: 104769906, country: "Maroc" },
  { label: "Rabat", geoId: 104769907, country: "Maroc" },
  { label: "Marrakech", geoId: 104769908, country: "Maroc" },
  
  // Côte d'Ivoire
  { label: "Côte d'Ivoire", geoId: 105109179, country: "Côte d'Ivoire" },
  { label: "Abidjan", geoId: 105109180, country: "Côte d'Ivoire" },
  
  // Sénégal
  { label: "Sénégal", geoId: 107542707, country: "Sénégal" },
  { label: "Dakar", geoId: 107542708, country: "Sénégal" },
  
  // Autres pays européens
  { label: "Allemagne", geoId: 101282230, country: "Allemagne" },
  { label: "Berlin", geoId: 102764624, country: "Allemagne" },
  { label: "Munich", geoId: 102764625, country: "Allemagne" },
  { label: "Hambourg", geoId: 102764626, country: "Allemagne" },
  
  { label: "Royaume-Uni", geoId: 102257491, country: "Royaume-Uni" },
  { label: "Londres", geoId: 102257492, country: "Royaume-Uni" },
  { label: "Manchester", geoId: 102257493, country: "Royaume-Uni" },
  
  { label: "Espagne", geoId: 105646813, country: "Espagne" },
  { label: "Madrid", geoId: 104583805, country: "Espagne" },
  { label: "Barcelone", geoId: 104583806, country: "Espagne" },
  
  { label: "Italie", geoId: 103350119, country: "Italie" },
  { label: "Rome", geoId: 102348103, country: "Italie" },
  { label: "Milan", geoId: 102348104, country: "Italie" },
  
  { label: "Pays-Bas", geoId: 102890719, country: "Pays-Bas" },
  { label: "Amsterdam", geoId: 102011674, country: "Pays-Bas" },
  { label: "Rotterdam", geoId: 102011675, country: "Pays-Bas" },
  
  // Remote
  { label: "Remote", geoId: 0, country: "Remote" },
  { label: "Télétravail", geoId: 0, country: "Remote" },
];

export const findLocationByLabel = (label: string): LocationData | undefined => {
  return locationData.find(loc => 
    loc.label.toLowerCase() === label.toLowerCase()
  );
};

export const searchLocations = (query: string): LocationData[] => {
  if (!query || query.length < 2) return [];
  
  const lowerQuery = query.toLowerCase();
  return locationData.filter(loc =>
    loc.label.toLowerCase().includes(lowerQuery) ||
    (loc.country && loc.country.toLowerCase().includes(lowerQuery))
  ).slice(0, 10); // Limiter à 10 résultats pour la performance
};
