import { getUserData } from "@/actions/get-user-data";
import { supabaseServerClient } from "@/supabase/supabaseServer";
import { NextResponse } from "next/server";
import { EncryptionService } from "@/lib/encryption";

const MESSAGES_CACHE: { [key: string]: any } = {};

function getPagination(page: number, size: number) {
  const limit = size ? +size : 10;
  const from = page ? page * limit : 0;
  const to = page ? from + limit - 1 : limit - 1;
  return { from, to };
}

export async function GET(req: Request) {
  try {
    const supabase = await supabaseServerClient();
    const userData = await getUserData();
    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get("channelId");
    const page = Number(searchParams.get("page"));
    const size = Number(searchParams.get("size"));

    if (!userData) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (!channelId) {
      return new Response("Bad Request", { status: 400 });
    }

    const cacheKey = `${channelId}-${page}-${size}`;
    
    // Check cache first
    if (MESSAGES_CACHE[cacheKey]) {
      const cachedData = MESSAGES_CACHE[cacheKey];
      const cacheAge = Date.now() - cachedData.timestamp;
      
      // Return cached data if it's less than 3 seconds old
      if (cacheAge < 3000) {
        return NextResponse.json({ data: cachedData.data });
      }
    }

    const { from, to } = getPagination(page, size);

    // Fetch messages with user data and channel data
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select(`
        *,
        user: user_id (*),
        channel: channel_id (*)
      `)
      .eq("channel_id", channelId)
      .range(from, to)
      .order("created_at", { ascending: false });

    if (messagesError) {
      console.error("GET MESSAGES ERROR: ", messagesError);
      return new Response("Bad Request", { status: 400 });
    }

    // Process messages in parallel
    const processedData = await Promise.all(messages.map(async (message: any) => {
      try {
        if (!message.encryptedMessage || !message.iv) {
          return message;
        }

        // Verify HMAC if present
        if (message.hmac && process.env.HMAC_KEY) {
          const hmacKey = Buffer.from(process.env.HMAC_KEY, 'base64');
          const isValid = EncryptionService.verifyHMAC(
            message.encryptedMessage,
            message.hmac,
            hmacKey
          );

          if (!isValid) {
            return {
              ...message,
              content: '[Message integrity check failed]'
            };
          }
        }

        // Decrypt message
        if (message.encryptedAESKey && message.channel?.privateKey) {
          const aesKey = EncryptionService.decryptAESKeyWithRSA(
            message.encryptedAESKey,
            message.channel.privateKey
          );

          const decryptedContent = EncryptionService.decryptMessage(
            message.encryptedMessage,
            aesKey,
            Buffer.from(message.iv, 'base64')
          );

          return {
            ...message,
            content: decryptedContent || message.content
          };
        }

        return message;
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);
        return {
          ...message,
          content: message.content || '[Encryption Error]'
        };
      }
    }));

    // Update cache
    MESSAGES_CACHE[cacheKey] = {
      data: processedData,
      timestamp: Date.now()
    };

    return NextResponse.json({ data: processedData });
  } catch (error) {
    console.error("SERVER ERROR: ", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
