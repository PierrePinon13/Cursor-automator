
export interface LocationData {
  label: string;
  geoId: number;
  country?: string;
}

export const locationData: LocationData[] = [
  // Pays européens
  { label: "France", geoId: 105015875, country: "France" },
  { label: "Germany", geoId: 101282230, country: "Germany" },
  { label: "Allemagne", geoId: 101282230, country: "Germany" },
  { label: "Italy", geoId: 103350119, country: "Italy" },
  { label: "Italie", geoId: 103350119, country: "Italy" },
  { label: "Spain", geoId: 105646813, country: "Spain" },
  { label: "Espagne", geoId: 105646813, country: "Spain" },
  { label: "Netherlands", geoId: 104004101, country: "Netherlands" },
  { label: "Pays-Bas", geoId: 104004101, country: "Netherlands" },
  { label: "Belgium", geoId: 101720260, country: "Belgium" },
  { label: "Belgique", geoId: 101720260, country: "Belgium" },
  { label: "Switzerland", geoId: 106693272, country: "Switzerland" },
  { label: "Suisse", geoId: 106693272, country: "Switzerland" },
  { label: "Austria", geoId: 103883143, country: "Austria" },
  { label: "Autriche", geoId: 103883143, country: "Austria" },
  { label: "Sweden", geoId: 105117694, country: "Sweden" },
  { label: "Suède", geoId: 105117694, country: "Sweden" },
  { label: "Denmark", geoId: 104514075, country: "Denmark" },
  { label: "Danemark", geoId: 104514075, country: "Denmark" },
  { label: "Finland", geoId: 106693313, country: "Finland" },
  { label: "Finlande", geoId: 106693313, country: "Finland" },
  { label: "Norway", geoId: 106693282, country: "Norway" },
  { label: "Norvège", geoId: 106693282, country: "Norway" },
  { label: "Ireland", geoId: 104738515, country: "Ireland" },
  { label: "Irlande", geoId: 104738515, country: "Ireland" },
  { label: "Portugal", geoId: 104003783, country: "Portugal" },
  { label: "Poland", geoId: 105072130, country: "Poland" },
  { label: "Pologne", geoId: 105072130, country: "Poland" },
  { label: "Czech Republic", geoId: 104066751, country: "Czech Republic" },
  { label: "République tchèque", geoId: 104066751, country: "Czech Republic" },
  { label: "Hungary", geoId: 104565230, country: "Hungary" },
  { label: "Hongrie", geoId: 104565230, country: "Hungary" },
  { label: "Greece", geoId: 104004196, country: "Greece" },
  { label: "Grèce", geoId: 104004196, country: "Greece" },
  { label: "Romania", geoId: 106693307, country: "Romania" },
  { label: "Roumanie", geoId: 106693307, country: "Romania" },
  { label: "Bulgaria", geoId: 106693305, country: "Bulgaria" },
  { label: "Bulgarie", geoId: 106693305, country: "Bulgaria" },
  { label: "Croatia", geoId: 106693285, country: "Croatia" },
  { label: "Croatie", geoId: 106693285, country: "Croatia" },
  { label: "Slovakia", geoId: 106693300, country: "Slovakia" },
  { label: "Slovaquie", geoId: 106693300, country: "Slovakia" },
  { label: "Slovenia", geoId: 106693301, country: "Slovenia" },
  { label: "Slovénie", geoId: 106693301, country: "Slovenia" },
  { label: "Lithuania", geoId: 106693295, country: "Lithuania" },
  { label: "Lituanie", geoId: 106693295, country: "Lithuania" },
  { label: "Latvia", geoId: 106693294, country: "Latvia" },
  { label: "Lettonie", geoId: 106693294, country: "Latvia" },
  { label: "Estonia", geoId: 106693292, country: "Estonia" },
  { label: "Estonie", geoId: 106693292, country: "Estonia" },

  // Villes françaises
  { label: "Paris", geoId: 102004600, country: "France" },
  { label: "Lyon", geoId: 104345153, country: "France" },
  { label: "Marseille", geoId: 104735038, country: "France" },
  { label: "Toulouse", geoId: 105159091, country: "France" },
  { label: "Lille", geoId: 106101353, country: "France" },
  { label: "Bordeaux", geoId: 104735041, country: "France" },
  { label: "Nantes", geoId: 106052653, country: "France" },
  { label: "Nice", geoId: 104735044, country: "France" },
  { label: "Strasbourg", geoId: 104735047, country: "France" },
  { label: "Montpellier", geoId: 105015876, country: "France" },
  { label: "Rennes", geoId: 104735050, country: "France" },
  { label: "Grenoble", geoId: 104735053, country: "France" },
  { label: "Tours", geoId: 104735056, country: "France" },
  { label: "Clermont-Ferrand", geoId: 104735059, country: "France" },
  { label: "Orléans", geoId: 104735062, country: "France" },
  { label: "Rouen", geoId: 104735065, country: "France" },
  { label: "Le Havre", geoId: 104735068, country: "France" },
  { label: "Reims", geoId: 104735071, country: "France" },
  { label: "Dijon", geoId: 104735074, country: "France" },
  { label: "Limoges", geoId: 104735077, country: "France" },
  { label: "Besançon", geoId: 104735080, country: "France" },
  { label: "Nancy", geoId: 104735083, country: "France" },
  { label: "Metz", geoId: 104735086, country: "France" },

  // Régions françaises
  { label: "Île-de-France", geoId: 101620260, country: "France" },
  { label: "Auvergne-Rhône-Alpes", geoId: 104735153, country: "France" },
  { label: "Provence-Alpes-Côte d'Azur", geoId: 104735044, country: "France" },
  { label: "Occitanie", geoId: 105015876, country: "France" },
  { label: "Nouvelle-Aquitaine", geoId: 104735041, country: "France" },
  { label: "Grand Est", geoId: 104735047, country: "France" },
  { label: "Hauts-de-France", geoId: 106101353, country: "France" },
  { label: "Bretagne", geoId: 104735050, country: "France" },
  { label: "Normandie", geoId: 104735065, country: "France" },
  { label: "Pays de la Loire", geoId: 106052653, country: "France" },
  { label: "Centre-Val de Loire", geoId: 104735062, country: "France" },
  { label: "Bourgogne-Franche-Comté", geoId: 104735074, country: "France" },
  { label: "Corse", geoId: 104735083, country: "France" },

  // Autres villes importantes
  { label: "Bruxelles", geoId: 101620260, country: "Belgium" },
  { label: "Genève", geoId: 104195475, country: "Switzerland" },
  { label: "Lausanne", geoId: 104195478, country: "Switzerland" },
  { label: "Luxembourg", geoId: 101620278, country: "Luxembourg" },
  { label: "Londres", geoId: 102257491, country: "United Kingdom" },
  { label: "Montréal", geoId: 92000000, country: "Canada" },

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
