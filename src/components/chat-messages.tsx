import { useChatFetcher } from "@/hooks/use-chat-fetcher";
import { format } from "date-fns";

import { Channel, User, Workspace } from "@/types/app";
import { ElementRef, FC, useRef, useMemo, useCallback } from "react";
import DotAnimatedLoader from "@/components/dot-animated-loader";
import ChatItem from "@/components/chat-item";
import { useChatSocketConnection } from "@/hooks/use-chat-socket-connection";
import IntroBanner from "@/components/intro-banner";
import { Button } from "@/components/ui/button";
import { useChatScrollHandler } from "@/hooks/use-chat-scroll-handler";
import { EncryptionService } from '@/lib/encryption';

const DATE_FORMAT = "d MMM yyy, HH:mm";

type ChatMessagesProps = {
  userData: User;
  name: string;
  chatId: string;
  apiUrl: string;
  socketUrl: string;
  socketQuery: Record<string, string>;
  paramKey: "channelId" | "recipientId";
  paramValue: string;
  type: "Channel" | "DirectMessage";
  workspaceData: Workspace;
  channelData?: Channel;
};

const ChatMessages: FC<ChatMessagesProps> = ({
  apiUrl,
  chatId,
  name,
  paramKey,
  paramValue,
  socketQuery,
  socketUrl,
  type,
  userData,
  workspaceData,
  channelData,
}) => {
  const chatRef = useRef<ElementRef<"div">>(null);
  const bottomRef = useRef<ElementRef<"div">>(null);

  // Memoized private key decryption with error handling
  const privateKey = useMemo(() => {
    if (!userData.encrypted_private_key || !userData.iv) return null;
    
    try {
      const userAESKey = Buffer.from(userData.aes_key || '', 'base64');
      return EncryptionService.decryptPrivateKey(
        userData.encrypted_private_key, 
        userData.iv, 
        userAESKey
      );
    } catch (error) {
      console.error('Private key decryption failed:', error);
      return null;
    }
  }, [userData]);

  const queryKey = type === "Channel" 
    ? `channel:${chatId}` 
    : `direct_message:${chatId}`;

  const { 
    data, 
    status, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useChatFetcher({
    apiUrl,
    queryKey,
    pageSize: 20, // Matching the fetcher's page size
    paramKey,
    paramValue,
    privateKey: privateKey || '',
  });

  useChatSocketConnection({
    queryKey,
    addKey: type === "Channel"
      ? `${queryKey}:channel-messages`
      : `direct_messages:post`,
    updateKey: type === "Channel"
      ? `${queryKey}:channel-messages:update`
      : `direct_messages:update`,
    paramValue,
  });

  // Optimized scroll handler
  useChatScrollHandler({
    chatRef,
    bottomRef,
    count: data?.pages?.[0].data?.length ?? 0,
  });

  // Memoized render messages to prevent unnecessary re-renders
  const renderMessages = useCallback(() => {
    if (!data) {
      return null; // or a loading state if needed
    }
  
    return data.pages.map((page) =>
      page.data.map((message) => (
        <ChatItem
          key={message.id}
          currentUser={userData}
          user={message.user}
          content={message.decryptedContent || message.content || 'Decryption failed'}
          fileUrl={message.file_url}
          deleted={message.is_deleted}
          id={message.id}
          timestamp={format(new Date(message.created_at), DATE_FORMAT)}
          isUpdated={message.updated_at !== message.created_at}
          socketUrl={socketUrl}
          socketQuery={socketQuery}
          channelData={channelData}
        />
      ))
    );
  }, [data, userData, socketUrl, socketQuery, channelData]);
  if (status === "pending") {
    return <DotAnimatedLoader />;
  }

  if (status === "error") {
    return <div>Error Occurred</div>;
  }

  return (
    <div ref={chatRef} className="flex-1 flex flex-col py-4 overflow-y-auto">
      {!hasNextPage && (
        <IntroBanner
          type={type}
          name={name}
          creationDate={workspaceData.created_at!}
        />
      )}
      {hasNextPage && (
        <div className="flex justify-center">
          {isFetchingNextPage ? (
            <DotAnimatedLoader />
          ) : (
            <Button 
              variant="link" 
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              Load Previous Messages
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-col-reverse mt-auto">{renderMessages()}</div>
      <div ref={bottomRef} />
    </div>
  );
};

export default ChatMessages;