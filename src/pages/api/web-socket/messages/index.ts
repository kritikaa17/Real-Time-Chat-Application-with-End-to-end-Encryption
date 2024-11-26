import { NextApiRequest } from "next";
import { SocketIoApiResponse } from "@/types/app";
import { getUserDataPages } from "@/actions/get-user-data";
import supabaseServerClientPages from "@/supabase/supabaseSeverPages";
import { EncryptionService } from "@/lib/encryption";

export default async function handler(
  req: NextApiRequest,
  res: SocketIoApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }


  try {
    const userData = await getUserDataPages(req, res);

    if (!userData) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { channelId, workspaceId } = req.query;
    if (!channelId || !workspaceId) {
      return res.status(400).json({ message: "Bad request: Missing parameters" });
    }

    const { content, fileUrl } = req.body;
    if (!content && !fileUrl) {
      return res.status(400).json({ message: "Bad request: No content or fileUrl" });
    }

    const supabase = supabaseServerClientPages(req, res);

    // Fetch channel data and validate member
    const { data: channelData, error: channelError } = await supabase
      .from("channels")
      .select("*")
      .eq("id", channelId)
      .contains("members", [userData.id]);

    if (channelError) {
      console.error("Error fetching channel data:", channelError);
      return res.status(500).json({ message: "Error fetching channel data" });
    }

    if (!channelData?.length) {
      return res.status(403).json({ message: "Channel not found or user is not a member" });
    }

    // **Encryption Logic**: Encrypt the message content
    const aesKey = EncryptionService.generateAESKey();
    const iv = EncryptionService.generateIV();
    const encryptedMessage = EncryptionService.encryptMessage(content, aesKey, iv);

    // **RSA Encryption**: Encrypt the AES key with recipient's public RSA key
    const recipientPublicKey = channelData[0].publicKey;
    if (!recipientPublicKey) {
      return res.status(400).json({ message: "Recipient's public key is missing" });
    }

    const encryptedAESKey = await EncryptionService.encryptAESKeyWithRSA(recipientPublicKey, aesKey);

    // **HMAC Logic**: Generate HMAC for message integrity
    const hmacKeyEnv = process.env.HMAC_KEY;
    if (!hmacKeyEnv) {
      console.error("HMAC_KEY environment variable is not defined");
      return res.status(500).json({ message: "HMAC_KEY environment variable not defined" });
    }
    const hmacKey = Buffer.from(hmacKeyEnv, "base64");
    const hmac = EncryptionService.generateHMAC(encryptedMessage, hmacKey);

    // Insert message into the database
    const { data: messageData, error: creatingMessageError } = await supabase
      .from("messages")
      .insert({
        user_id: userData.id,
        workspace_id: workspaceId,
        channel_id: channelId,
        content: content, // Store the raw message content in the content column (unencrypted)
        encryptedMessage: encryptedMessage, // Store the encrypted message in the encryptedMessage column
        file_url: fileUrl,
        encryptedAESKey: encryptedAESKey, // Store the encrypted AES key
        iv: iv.toString("base64"), // Store the IV in base64 format
        hmac, // Store the HMAC for integrity check
      })
      .select("*, user: user_id(*)")
      .order("created_at", { ascending: true })
      .single();

    if (creatingMessageError) {
      console.error("Error creating message:", creatingMessageError);
      return res.status(500).json({ message: "Error creating message" });
    }

    // Emit event to the channel's messages
    try {
      res?.socket?.server?.io?.emit(`channel:${channelId}:channel-messages`, messageData);
    } catch (socketError) {
      console.error("Error emitting WebSocket event:", socketError);
      return res.status(500).json({ message: "Error emitting WebSocket event" });
    }

    return res.status(201).json({ message: "Message created", data: messageData });
  } catch (error) {
    console.error("General error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
