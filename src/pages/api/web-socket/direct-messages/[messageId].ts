import { NextApiRequest } from 'next';
import { SocketIoApiResponse } from '@/types/app';
import { getUserDataPages } from '@/actions/get-user-data';
import supabaseServerClientPages from '@/supabase/supabaseSeverPages';
import { SupabaseClient } from '@supabase/supabase-js';
import { EncryptionService } from '@/lib/encryption';

export default async function handler(
  req: NextApiRequest,
  res: SocketIoApiResponse
) {
  if (!['DELETE', 'PATCH'].includes(req.method!)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userData = await getUserDataPages(req, res);

    if (!userData) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { messageId } = req.query;
    const { content } = req.body;

    if (!messageId) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const supabase = supabaseServerClientPages(req, res);

    // Fetch the original message from the database
    const { data: messageData, error } = await supabase
      .from('direct_messages')
      .select(
        `
        *,
        user_one:users!direct_messages_user_one_fkey(*),
        user_two:users!direct_messages_user_two_fkey(*)
        `
      )
      .eq('id', messageId)
      .single();

    if (error || !messageData) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const isMessageOwner =
      userData.id === messageData.user_one.id ||
      userData.id === messageData.user_two.id;
    const isAdmin = userData.type === 'admin';
    const isRegulator = userData.type === 'regulator';

    const canEditMessage =
      isMessageOwner || isAdmin || isRegulator || !messageData.is_deleted;

    if (!canEditMessage) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.method === 'PATCH') {
      if (!isMessageOwner) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Encrypt the updated content
      const aesKey = EncryptionService.generateAESKey();
      const iv = EncryptionService.generateIV();
      const encryptedContent = EncryptionService.encryptMessage(content, aesKey, iv);

      // Ensure HMAC_KEY is defined in environment variables
      const hmacKeyEnv = process.env.HMAC_KEY;
      if (!hmacKeyEnv) {
        throw new Error('HMAC_KEY environment variable is not defined');
      }
      const hmacKey = Buffer.from(hmacKeyEnv, 'base64');
      const hmac = EncryptionService.generateHMAC(encryptedContent, hmacKey);

      // Get the recipient’s public key for RSA encryption (e.g., user_one or user_two)
      const recipientPublicKey = userData.id === messageData.user_one.id
        ? messageData.user_two.public_key
        : messageData.user_one.public_key;

      if (!recipientPublicKey) {
        return res.status(400).json({ error: "Recipient's public key is missing" });
      }

      // RSA Encrypt the AES key
      const encryptedAESKey = await EncryptionService.encryptAESKeyWithRSA(
        recipientPublicKey,
        aesKey
      );

      // Update the message with encrypted content and AES key
      await supabase
        .from('direct_messages')
        .update({
          content, // Store raw content (optional, depending on use case)
          encryptedMessage: encryptedContent, // Store encrypted message
          encryptedAESKey, // Store the encrypted AES key
          iv: iv.toString('base64'), // Store the IV in base64 format
          hmac, // Store the HMAC for integrity
          updated_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .single();

      return res.status(200).json({ message: 'Message updated successfully', data: messageData });
    } else if (req.method === 'DELETE') {
      if (!isMessageOwner) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Delete the message, marking it as deleted in the database
      await supabase
        .from('direct_messages')
        .update({
          content: 'This message has been deleted',
          file_url: null,
          is_deleted: true,
        })
        .eq('id', messageId)
        .single();

      return res.status(200).json({ message: 'Message deleted successfully' });
    }

    // Fetch updated message after modification
    const { data: updatedMessage, error: messageError } = await supabase
      .from('direct_messages')
      .select(
        `
        *,
        user_one:users!direct_messages_user_one_fkey(*),
        user_two:users!direct_messages_user_two_fkey(*),
        user:users!direct_messages_user_fkey(*)
        `
      )
      .eq('id', messageId)
      .single();

    if (messageError || !updatedMessage) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res?.socket?.server?.io?.emit('direct-message:update', updatedMessage);
    return res.status(200).json({ message: updatedMessage });

  } catch (error) {
    console.log('DIRECT MESSAGE ERROR: ', error);
    return res.status(500).json({ error: 'Error sending message' });
  }
}
