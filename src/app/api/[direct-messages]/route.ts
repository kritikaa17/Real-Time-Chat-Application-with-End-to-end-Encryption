import { NextResponse } from "next/server";
import { getUserData } from "@/actions/get-user-data";
import { supabaseServerClient } from "@/supabase/supabaseServer";
import { EncryptionService } from "@/lib/encryption";

const DIRECT_MESSAGES_CACHE: { [key: string]: any } = {};

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

    if (!userData) return new Response("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const userId = userData.id;
    const recipientId = searchParams.get("recipientId");
    const page = Number(searchParams.get("page"));
    const size = Number(searchParams.get("size"));

    if (!recipientId) return new Response("Bad Request", { status: 400 });

    const cacheKey = `${userId}-${recipientId}-${page}-${size}`;

    if (DIRECT_MESSAGES_CACHE[cacheKey]) {
      const cachedData = DIRECT_MESSAGES_CACHE[cacheKey];
      const cacheAge = Date.now() - cachedData.timestamp;

      if (cacheAge < 3000) {
        return NextResponse.json({ data: cachedData.data });
      }
    }

    const { from, to } = getPagination(page, size);

    const { data: messages, error } = await supabase
      .from("direct_messages")
      .select("*, user_one:users!direct_messages_user_one_fkey(*), user_two:users!direct_messages_user_two_fkey(*), user:users!direct_messages_user_fkey(*)")
      .or(
        `and(user_one.eq.${userId},user_two.eq.${recipientId}),and(user_one.eq.${recipientId},user_two.eq.${userId})`
      )
      .range(from, to)
      .order("created_at", { ascending: false }); // Changed to descending order

    if (error) {
      console.error("Error fetching direct messages", error);
      return new Response("Internal Server Error", { status: 500 });
    }

    // Process messages in parallel
    const processedData = await Promise.all(messages.map(async (message: any) => {
      try {
        if (!message.encryptedMessage || !message.iv) {
          return message;
        }

        if (message.hmac && process.env.HMAC_KEY) {
          const hmacKey = Buffer.from(process.env.HMAC_KEY, "base64");
          const isValid = EncryptionService.verifyHMAC(
            message.encryptedMessage,
            message.hmac,
            hmacKey
          );

          if (!isValid) {
            return {
              ...message,
              content: "[Message integrity check failed]",
            };
          }
        }

        if (message.encryptedAESKey && message.user?.privateKey) {
          const aesKey = EncryptionService.decryptAESKeyWithRSA(
            message.encryptedAESKey,
            message.user.privateKey
          );

          const decryptedContent = EncryptionService.decryptMessage(
            message.encryptedMessage,
            aesKey,
            Buffer.from(message.iv, "base64")
          );

          return {
            ...message,
            content: decryptedContent || message.content,
          };
        }

        return message;
      } catch (error) {
        console.error(`Error processing direct message ${message.id}:`, error);
        return {
          ...message,
          content: message.content || "[Encryption Error]",
        };
      }
    }));

    // Reverse the processed data to show newest messages at the bottom
    const sortedData = processedData.reverse();

    DIRECT_MESSAGES_CACHE[cacheKey] = {
      data: sortedData,
      timestamp: Date.now(),
    };

    return NextResponse.json({ data: sortedData });
  } catch (error) {
    console.error("Error fetching direct messages", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
