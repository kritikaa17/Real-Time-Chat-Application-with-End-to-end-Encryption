import { FC, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, StopCircle } from "lucide-react";
import { v4 as uuid } from "uuid";
import { toast } from "sonner";
import { Channel, User, Workspace } from "@/types/app";
import { supabaseBrowserClient } from "@/supabase/supabaseClient";
import { EncryptionService } from '@/lib/encryption';

type VoiceMessageUploadProps = {
  userData: User;
  workspaceData: Workspace;
  channel?: Channel;
  recipientId?: string;
  toggleVoiceUploadModal: () => void;
};

const VoiceMessageUpload: FC<VoiceMessageUploadProps> = ({
  userData,
  workspaceData,
  channel,
  recipientId,
  toggleVoiceUploadModal,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorderRef.current = new MediaRecorder(stream);

      recorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunks.current.push(event.data);
      };

      recorderRef.current.onstop = handleUpload;
      recorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone", error);
      toast.error("Could not access microphone");
    }
  };

  const handleStopRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleUpload = async () => {
    setIsUploading(true);

    try {
      const audioBlob = new Blob(audioChunks.current, { type: "audio/mpeg" });
      const uniqueId = uuid();
      const fileName = `voice/${uniqueId}.mpeg`;

      // Generate HMAC for voice file
      const hmacKey = Buffer.from(process.env.NEXT_PUBLIC_HMAC_KEY || '', 'hex');
      const fileHMAC = await EncryptionService.generateFileHMAC(
        new File([audioBlob], fileName),
        hmacKey
      );

      const supabase = supabaseBrowserClient;
      const { data, error } = await supabase.storage
        .from("chat-files")
        .upload(fileName, audioBlob, { cacheControl: "3600", upsert: false });

      if (error) {
        throw new Error("Failed to upload voice message");
      }

      let messageInsertError;

      if (recipientId) {
        const { error: dmError } = await supabase.from("direct_messages").insert({
          file_url: data.path,
          file_hmac: fileHMAC,
          user: userData.id,
          user_one: userData.id,
          user_two: recipientId,
        });

        messageInsertError = dmError;
      } else {
        const { error: cmError } = await supabase.from("messages").insert({
          file_url: data.path,
          file_hmac: fileHMAC,
          user_id: userData.id,
          channel_id: channel?.id,
          workspace_id: workspaceData.id,
        });

        messageInsertError = cmError;
      }

      if (messageInsertError) {
        throw new Error("Failed to save voice message");
      }

      toast.success("Voice message sent successfully");
      toggleVoiceUploadModal();
      audioChunks.current = [];
    } catch (error) {
      console.error("Error in voice message upload:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload voice message");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6 flex flex-col items-center space-y-4">
        <div className="flex flex-col items-center space-y-2">
          {isRecording ? (
            <StopCircle
              className="w-16 h-16 text-red-500 cursor-pointer"
              onClick={handleStopRecording}
            />
          ) : (
            <Mic
              className="w-16 h-16 text-green-500 cursor-pointer"
              onClick={handleStartRecording}
            />
          )}
          <span className="text-sm font-medium">
            {isRecording ? "Recording... Tap to Stop" : "Tap to Start Recording"}
          </span>
        </div>
        {isUploading && <p className="text-gray-500">Uploading...</p>}
      </CardContent>
    </Card>
  );
};

export default VoiceMessageUpload;