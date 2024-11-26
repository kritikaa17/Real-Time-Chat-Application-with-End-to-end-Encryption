import { SocketIoApiResponse } from '@/types/app';
import { NextApiRequest } from 'next';
import { getUserDataPages } from '@/actions/get-user-data';
import supabaseServerClientPages from '@/supabase/supabaseSeverPages';
import { EncryptionService } from '@/lib/encryption';

export default async function handler(
  req: NextApiRequest,
  res: SocketIoApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userData = await getUserDataPages(req, res);

    if (!userData) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { recipientId } = req.query;

    if (!recipientId) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const { content, fileUrl } = req.body;

    if (!content && !fileUrl) {
      return res.status(400).json({ error: 'Invalid request: No content or fileUrl' });
    }

    const supabase = supabaseServerClientPages(req, res);

    const { data: recipientData, error: recipientError } = await supabase
      .from('users')
      .select('public_key')
      .eq('id', recipientId)
      .single();

    if (recipientError) {
      console.log('Error fetching recipient data:', recipientError);
      return res.status(500).json({ error: 'Error fetching recipient data' });
    }

    if (!recipientData?.public_key) {
      return res.status(400).json({ error: "Recipient's public key is missing" });
    }

    const aesKey = EncryptionService.generateAESKey();
    const iv = EncryptionService.generateIV();
    const encryptedMessage = EncryptionService.encryptMessage(content, aesKey, iv);
    const encryptedAESKey = await EncryptionService.encryptAESKeyWithRSA(recipientData.public_key, aesKey);

    const hmacKeyEnv = process.env.HMAC_KEY;
    if (!hmacKeyEnv) {
      console.error('HMAC_KEY environment variable is not defined');
      return res.status(500).json({ error: 'HMAC_KEY environment variable not defined' });
    }
    const hmacKey = Buffer.from(hmacKeyEnv, 'base64');
    const hmac = EncryptionService.generateHMAC(encryptedMessage, hmacKey);

    const { data, error: sendingMessageError } = await supabase
      .from('direct_messages')
      .insert({
        content,
        file_url: fileUrl,
        user: userData.id,
        user_one: userData.id,
        user_two: recipientId,
        encryptedMessage,
        encryptedAESKey,
        iv: iv.toString('base64'),
        hmac,
      })
      .select('*, user (*), user_one (*), user_two (*)')
      .single();

    if (sendingMessageError) {
      console.log('DIRECT MESSAGE ERROR: ', sendingMessageError);
      return res.status(500).json({ error: 'Error sending message' });
    }

    res?.socket?.server?.io?.emit('direct-message:post', data);

    return res.status(201).json({ message: 'Message sent', data });
  } catch (error) {
    console.log('DIRECT MESSAGE ERROR: ', error);
    return res.status(500).json({ error: 'Error sending message' });
  }
}