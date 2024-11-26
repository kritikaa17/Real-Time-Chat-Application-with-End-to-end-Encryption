"use client";

import { FiPlus } from "react-icons/fi";
import { FaMicrophone } from "react-icons/fa6";
import { Send } from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { FC, useState } from "react";
import PlaceHolder from "@tiptap/extension-placeholder";
import axios from "axios";
import { Button } from "@/components/ui/button";
import MenuBar from "@/components/menu-bar";
import { Channel, User, Workspace } from "@/types/app";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";
import { DialogTitle } from "@radix-ui/react-dialog";
import ChatFileUpload from "@/components/chat-file-upload";
import VoiceMessageUpload from "@/components/chat-voice-upload";
import { useQueryClient } from "@tanstack/react-query";

type TextEditorProps = {
  apiUrl: string;
  type: "Channel" | "DirectMessage";
  channel?: Channel;
  workspaceData: Workspace;
  userData: User;
  recipientId?: string;
};

const TextEditor: FC<TextEditorProps> = ({
  apiUrl,
  type,
  channel,
  workspaceData,
  userData,
  recipientId,
}) => {
  const [content, setContent] = useState("");
  const [fileUploadModal, setFileUploadModal] = useState(false);
  const [voiceUploadModal, setVoiceUploadModal] = useState(false);
  const queryClient = useQueryClient();

  const toggleFileUploadModal = () =>
    setFileUploadModal((prevState) => !prevState);
  const toggleVoiceUploadModal = () =>
    setVoiceUploadModal((prevState) => !prevState);

  const editor = useEditor({
    extensions: [
      StarterKit,
      PlaceHolder.configure({
        placeholder: `Message ${type === "Channel" ? "#" + channel?.name : ""}`,
      }),
    ],
    autofocus: true,
    content,
    onUpdate({ editor }) {
      setContent(editor.getHTML());
    },
  });

  const handleSend = async () => {
    try {
      const originalContent = content;

      // Optimistically update the UI
      const optimisticMessage = {
        id: Date.now().toString(),
        content: originalContent,
        user_id: userData.id,
        user: userData,
        created_at: new Date().toISOString(),
        channel_id: channel?.id,
        workspace_id: workspaceData.id,
        temporary: true,
      };

      const queryKey = type === "Channel" 
        ? [`channel:${channel?.id}`, "messages"]
        : [`dm:${recipientId}`, "messages"];

      // Add optimistic update to cache - append to end for direct messages
      queryClient.setQueryData(queryKey, (oldData: any) => ({
        ...oldData,
        pages: [
          { 
            data: type === "Channel"
              ? [optimisticMessage, ...(oldData?.pages[0]?.data || [])]
              : [...(oldData?.pages[0]?.data || []), optimisticMessage]
          },
          ...(oldData?.pages.slice(1) || []),
        ],
      }));

      const endpoint = `${apiUrl}?${
        type === "Channel"
          ? `channelId=${channel?.id}&workspaceId=${workspaceData.id}`
          : `recipientId=${recipientId}&workspaceId=${workspaceData.id}`
      }`;

      const response = await axios.post(endpoint, {
        content: originalContent,
        type,
      });

      // Clear content regardless of response status
      setContent("");
      editor?.commands.setContent("");

      // Update cache with real message
      queryClient.invalidateQueries({
        queryKey: queryKey,
      });
    } catch (error) {
      console.error("Error sending message:", error);

      // Remove optimistic update on error
      queryClient.invalidateQueries({
        queryKey: type === "Channel" 
          ? [`channel:${channel?.id}`, "messages"]
          : [`dm:${recipientId}`, "messages"],
      });
    }
  };

  return (
    <div className="p-1 border dark:border-zinc-500 border-neutral-700 rounded-md relative overflow-hidden">
      <div className="sticky top-0 z-10">
        {editor && <MenuBar editor={editor} />}
      </div>
      <div className="h-[150px] pt-11 flex w-full grow-1">
        <EditorContent
          className="prose w-full h-[150px] dark:text-white leading-[1.15px] overflow-y-hidden whitespace-pre-wrap"
          editor={editor}
          onClick={() => editor?.commands.focus()}
        />
      </div>
      <div className="absolute top-3 z-10 right-3 flex items-center space-x-2">
        <div className="bg-black dark:bg-white cursor-pointer transition-all duration-500 hover:scale-110 text-white grid place-content-center rounded-full w-6 h-6">
          <FiPlus
            className="w-4 h-4 dark:text-black text-white"
            onClick={toggleFileUploadModal}
          />
        </div>
        <div className="bg-black dark:bg-white cursor-pointer transition-all duration-500 hover:scale-110 text-white grid place-content-center rounded-full w-6 h-6">
          <FaMicrophone
            className="w-4 h-4 dark:text-black text-white"
            onClick={toggleVoiceUploadModal}
          />
        </div>
      </div>
      <Button
        onClick={handleSend}
        disabled={content.length < 2}
        size="sm"
        className="absolute bottom-1 right-1"
      >
        <Send />
      </Button>

      <Dialog onOpenChange={toggleFileUploadModal} open={fileUploadModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>File Upload</DialogTitle>
            <DialogDescription>
              Upload a file to share with your team
            </DialogDescription>
          </DialogHeader>
          <ChatFileUpload
            userData={userData}
            workspaceData={workspaceData}
            channel={channel}
            recipientId={recipientId}
            toggleFileUploadModal={toggleFileUploadModal}
          />
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={toggleVoiceUploadModal} open={voiceUploadModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Voice Message</DialogTitle>
            <DialogDescription>
              Record and upload a voice message for your team
            </DialogDescription>
          </DialogHeader>
          <VoiceMessageUpload
            userData={userData}
            workspaceData={workspaceData}
            channel={channel}
            recipientId={recipientId}
            toggleVoiceUploadModal={toggleVoiceUploadModal}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TextEditor;