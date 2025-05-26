
export const getTimeAgo = (dateString: string, timestamp?: number): string => {
  // Prioriser le timestamp Unix si disponible (plus précis)
  let postDate: Date;
  
  if (timestamp) {
    // timestamp est en millisecondes depuis epoch Unix
    postDate = new Date(timestamp);
  } else if (dateString) {
    postDate = new Date(dateString);
  } else {
    return 'Date inconnue';
  }
  
  // Vérifier si la date est valide
  if (isNaN(postDate.getTime())) {
    return 'Date invalide';
  }
  
  // Obtenir l'heure actuelle en heure de Paris
  const now = new Date();
  const parisNow = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Paris"}));
  
  // Calculer la différence en millisecondes
  const diffMs = parisNow.getTime() - postDate.getTime();
  
  // Si la différence est négative, le post est dans le futur (erreur de données)
  if (diffMs < 0) {
    return 'À l\'instant';
  }
  
  // Convertir en différentes unités
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  
  // Retourner le format approprié
  if (diffMinutes < 1) {
    return 'À l\'instant';
  } else if (diffMinutes < 60) {
    return `il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
  } else if (diffHours < 24) {
    return `il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
  } else if (diffDays < 7) {
    return `il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  } else if (diffWeeks < 4) {
    return `il y a ${diffWeeks} semaine${diffWeeks > 1 ? 's' : ''}`;
  } else {
    return `il y a ${diffMonths} mois`;
  }
};
