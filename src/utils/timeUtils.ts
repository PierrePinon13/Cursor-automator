
export const getTimeAgo = (dateString: string): string => {
  if (!dateString) return 'Date inconnue';
  
  // Créer la date du post en considérant qu'elle est en heure de Paris
  const postDate = new Date(dateString);
  
  // Obtenir l'heure actuelle en heure de Paris
  const now = new Date();
  const parisTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Paris"}));
  
  // Si la date du post ne contient pas d'info de timezone, on assume qu'elle est en heure de Paris
  let postDateParis;
  if (dateString.includes('T') && (dateString.includes('+') || dateString.includes('Z'))) {
    // La date a déjà une timezone, on la convertit en heure de Paris
    postDateParis = new Date(postDate.toLocaleString("en-US", {timeZone: "Europe/Paris"}));
  } else {
    // La date n'a pas de timezone, on assume qu'elle est déjà en heure de Paris
    postDateParis = postDate;
  }
  
  // Calculer la différence en millisecondes
  const diffMs = parisTime.getTime() - postDateParis.getTime();
  
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
