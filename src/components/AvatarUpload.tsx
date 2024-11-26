import { FC, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User } from "@/types/app";
import { supabaseBrowserClient } from "@/supabase/supabaseClient";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  file: z
    .instanceof(FileList)
    .refine((files) => files?.length === 1, "Image is required")
    .refine(
      (files) => {
        const file = files?.[0];
        return file?.type.startsWith("image/");
      },
      "File must be an image"
    ),
});

type AvatarUploadProps = {
  userData: User;
  className?: string;
};

const AvatarUpload: FC<AvatarUploadProps> = ({ userData, className }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(userData.avatar_url);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      file: undefined,
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create a preview URL for immediate visual feedback
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      
      // Automatically trigger upload when file is selected
      handleUpload(file);
    }
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    const uniqueId = uuid();
    const supabase = supabaseBrowserClient;

    try {
      const fileName = `avatars/img-${uniqueId}.${file.name.split('.').pop()}`;

      // First, upload the file to storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from("chat-files")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (storageError) throw storageError;

      // Get the public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from("chat-files")
        .getPublicUrl(fileName);

      // Update user profile with new avatar URL
      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("id", userData.id);

      if (updateError) throw updateError;

      toast.success("Avatar updated successfully");
      form.reset();
    } catch (error) {
      console.error("Error in avatar upload process:", error);
      toast.error("Failed to upload avatar");
      // Revert preview on error
      setPreviewUrl(userData.avatar_url);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Avatar className={cn("relative group cursor-pointer", className)}>
        <AvatarImage src={previewUrl} />
        <AvatarFallback>
          {userData.name ? userData.name.slice(0, 2) : userData.email?.slice(0, 2)}
        </AvatarFallback>
        <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
          <label htmlFor="avatar-upload" className="cursor-pointer text-white text-xs">
            {isUploading ? "Uploading..." : "Change"}
          </label>
        </div>
      </Avatar>

      <Input
        id="avatar-upload"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default AvatarUpload;