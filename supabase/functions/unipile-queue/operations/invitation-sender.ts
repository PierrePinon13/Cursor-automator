
export async function sendInvitation(unipileApiKey: string, accountId: string, payload: any) {
  const { providerId, message } = payload;

  if (!providerId || !message) {
    throw new Error('Missing providerId or message in payload');
  }

  console.log(`🤝 Sending invitation to ${providerId} on account ${accountId}`);
  console.log(`📝 Invitation message content: "${message}"`);
  console.log(`📊 Message length: ${message.length} characters`);

  // Structure selon l'API Unipile officielle - utilisation de JSON
  const requestBody = {
    provider_id: providerId,
    account_id: accountId,
    message: message
  };

  console.log(`📤 Request body being sent to Unipile:`, JSON.stringify(requestBody, null, 2));

  const response = await fetch(`https://api9.unipile.com:13946/api/v1/users/invite`, {
    method: 'POST',
    headers: {
      'X-API-KEY': unipileApiKey,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  console.log(`📡 Unipile response status: ${response.status}`);
  console.log(`📡 Unipile response headers:`, Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Send invitation failed: ${response.status} - ${errorText}`);
    console.error(`❌ Failed request details:`, {
      url: 'https://api9.unipile.com:13946/api/v1/users/invite',
      method: 'POST',
      body: JSON.stringify(requestBody, null, 2),
      status: response.status,
      error: errorText
    });
    throw new Error(`Send invitation failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log(`✅ Invitation sent successfully to ${providerId}`);
  console.log(`📋 Full Unipile response:`, JSON.stringify(result, null, 2));
  
  // Log specific fields that indicate success
  if (result.id) {
    console.log(`🎯 Invitation ID from Unipile: ${result.id}`);
  }
  if (result.status) {
    console.log(`📌 Invitation status from Unipile: ${result.status}`);
  }
  
  return result;
}
