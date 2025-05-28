
export async function sendMessage(unipileApiKey: string, accountId: string, payload: any) {
  const { providerId, message } = payload;

  if (!providerId || !message) {
    throw new Error('Missing providerId or message in payload');
  }

  console.log(`💬 Sending message to ${providerId} on account ${accountId}`);
  console.log(`📝 Message content: "${message}"`);

  const response = await fetch(`https://api9.unipile.com:13946/api/v1/chats`, {
    method: 'POST',
    headers: {
      'X-API-KEY': unipileApiKey,
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      account_id: accountId,
      attendees_ids: providerId,
      text: message
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Send message failed: ${response.status} - ${errorText}`);
    throw new Error(`Send message failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log(`✅ Message sent successfully:`, result);
  return result;
}
