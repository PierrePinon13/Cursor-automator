
/**
 * Génère un délai aléatoire entre 2 et 8 secondes
 */
export const getRandomDelay = (): number => {
  return Math.floor(Math.random() * (8000 - 2000 + 1)) + 2000;
};

/**
 * Attend un délai aléatoire avant de continuer
 */
export const waitRandomDelay = (): Promise<void> => {
  const delay = getRandomDelay();
  console.log(`⏱️ Attente de ${delay}ms avant le prochain envoi LinkedIn`);
  
  return new Promise(resolve => {
    setTimeout(resolve, delay);
  });
};

/**
 * Formatage du délai pour l'affichage
 */
export const formatDelay = (milliseconds: number): string => {
  const seconds = Math.ceil(milliseconds / 1000);
  return `${seconds}s`;
};
