import { useInfiniteQuery } from "@tanstack/react-query";
import axios from "axios";
import { Messages, User } from "@/types/app";
import { EncryptionService } from '@/lib/encryption';

interface DecryptedMessage extends Messages {
  user: User;
  decryptedContent?: string;
}

export const useChatFetcher = ({
  queryKey,
  apiUrl,
  paramKey,
  paramValue,
  pageSize = 20, // Increased page size
  privateKey,
}: {
  queryKey: string;
  apiUrl: string;
  paramKey: string;
  paramValue: string;
  pageSize?: number;
  privateKey?: string;
}) => {
  return useInfiniteQuery({
    queryKey: [queryKey, paramValue],
    queryFn: async ({ pageParam = 0 }) => {
      const url = `${apiUrl}?${paramKey}=${paramValue}&page=${pageParam}&size=${pageSize}`;
      const response = await axios.get(url, {
        timeout: 5000, // 5-second timeout
      });

      // Perform decryption in parallel with a limited concurrency
      const processedMessages = await Promise.all(
        response.data.data.map(async (message: DecryptedMessage) => {
          // Quick early return for unencrypted or non-encrypted messages
          if (!message.encryptedMessage || !message.encryptedAESKey || !message.iv || !privateKey) {
            return { 
              ...message, 
              decryptedContent: message.content 
            };
          }

          try {
            // Decrypt the AES key using the private RSA key
            const decryptedAESKey = EncryptionService.decryptAESKeyWithRSA(
              message.encryptedAESKey,
              privateKey
            );

            // Decrypt the message content using the AES key
            const decryptedContent = EncryptionService.decryptMessage(
              message.encryptedMessage,
              decryptedAESKey,
              Buffer.from(message.iv, 'base64')
            );

            // Verify message integrity if HMAC is present
            if (message.hmac) {
              const hmacKey = Buffer.from(process.env.NEXT_PUBLIC_HMAC_KEY || '', 'hex');
              const isValid = EncryptionService.verifyHMAC(
                decryptedContent || '',
                message.hmac,
                hmacKey
              );

              return { 
                ...message, 
                decryptedContent: isValid ? decryptedContent : message.content 
              };
            }

            return { 
              ...message, 
              decryptedContent: decryptedContent 
            };
          } catch (error) {
            console.log('Message decryption failed:', error);
            return { 
              ...message, 
              decryptedContent: message.content || 'Decryption failed' 
            };
          }
        })
      );

      return {
        data: processedMessages,
        nextPage: response.data.data.length === pageSize ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    staleTime: 1000 * 30, // Reduced stale time
    gcTime: 1000 * 60 * 5,
    refetchInterval: 2000, // Faster refetch
    retry: 1, // Limit retry attempts
    retryDelay: 1000, // 1 second between retries
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
    }),
  });
};