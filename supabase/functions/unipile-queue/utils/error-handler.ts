
export function isClientError(error: Error): boolean {
  return error.message.includes('401') || 
         error.message.includes('403') || 
         error.message.includes('404') ||
         error.message.includes('400');
}

export function isRetryableError(error: Error): boolean {
  const isProviderError = error.message.includes('provider_error') || 
                         error.message.includes('operational problems') ||
                         error.message.includes('500');
  
  const isRateLimit = error.message.includes('429');
  
  return isProviderError || isRateLimit;
}

export function getErrorResponse(error: Error) {
  let errorType = 'unknown';
  let userMessage = 'Une erreur inattendue s\'est produite.';
  
  if (error.message.includes('provider_error') || error.message.includes('operational problems')) {
    errorType = 'provider_unavailable';
    userMessage = 'LinkedIn est temporairement indisponible. Veuillez réessayer dans quelques minutes.';
  } else if (error.message.includes('401') || error.message.includes('403')) {
    errorType = 'authentication';
    userMessage = 'Erreur d\'authentification avec LinkedIn. Veuillez reconnecter votre compte.';
  } else if (error.message.includes('429')) {
    errorType = 'rate_limit';
    userMessage = 'Trop de demandes. Veuillez patienter avant de réessayer.';
  } else if (error.message.includes('404')) {
    errorType = 'not_found';
    userMessage = 'Profil LinkedIn non trouvé ou inaccessible.';
  }

  return {
    success: false,
    error: error.message,
    error_type: errorType,
    user_message: userMessage
  };
}
