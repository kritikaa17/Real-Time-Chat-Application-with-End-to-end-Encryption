import { NextApiRequest } from "next";
import { SocketIoApiResponse } from "@/types/app";
import { getUserDataPages } from "@/actions/get-user-data";
import supabaseServerClientPages from "@/supabase/supabaseSeverPages";
import { EncryptionService } from "@/lib/encryption";

export default async function handler(
  req: NextApiRequest,
  res: SocketIoApiResponse
) {
  if (!["DELETE", "PATCH"].includes(req.method!)) {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const userData = await getUserDataPages(req, res);

    if (!userData) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { messageId, channelId, workspaceId } = req.query as Record<
      string,
      string
    >;

    if (!messageId || !channelId || !workspaceId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const { content } = req.body;

    const supabase = supabaseServerClientPages(req, res);

    // Fetch the original message
    const { data: messageData, error } = await supabase
      .from("messages")
      .select("*, user: user_id (*)")
      .eq("id", messageId)
      .single();

    if (error || !messageData) {
      return res.status(404).json({ error: "Message not found" });
    }

    const isMessageOwner = messageData.user_id === userData.id;

    if (req.method === "PATCH") {
      if (!isMessageOwner) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Encrypt the updated content
      const aesKey = EncryptionService.generateAESKey();
      const iv = EncryptionService.generateIV();
      const encryptedContent = EncryptionService.encryptMessage(
        content,
        aesKey,
        iv
      );

      // Ensure HMAC_KEY is defined in environment variables
      const hmacKeyEnv = process.env.HMAC_KEY;
      if (!hmacKeyEnv) {
        throw new Error("HMAC_KEY environment variable is not defined");
      }
      const hmacKey = Buffer.from(hmacKeyEnv, "base64");

      const hmac = EncryptionService.generateHMAC(encryptedContent, hmacKey);

      // Update the message
      const { error: updateError } = await supabase
        .from("messages")
        .update({
          content: content, // Store raw content in the content column
          encryptedMessage: encryptedContent, // Store encrypted message in the encryptedMessage field
          updated_at: new Date().toISOString(),
          hmac, // Store HMAC for integrity
        })
        .eq("id", messageId)
        .single();

      if (updateError) {
        console.error("Error updating message:", updateError);
        return res.status(500).json({ error: "Error updating message" });
      }

      return res
        .status(200)
        .json({ message: "Message updated successfully", data: messageData });
    }

    if (req.method === "DELETE") {
      if (!isMessageOwner) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Mark the message as deleted instead of removing it from the database
      const { error: updateError } = await supabase
        .from("messages")
        .update({
          content: "This message has been deleted", // Optional message placeholder
          file_url: null, // Clear any associated files
          is_deleted: true, // Mark as deleted
          updated_at: new Date().toISOString(), // Update timestamp
        })
        .eq("id", messageId)
        .single();

      if (updateError) {
        console.error("Error marking message as deleted:", updateError);
        return res.status(500).json({ error: "Error deleting message" });
      }

      return res.status(200).json({ message: "Message deleted successfully" });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
