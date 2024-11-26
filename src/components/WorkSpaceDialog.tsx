import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FiEdit3 } from "react-icons/fi";
import { format } from "date-fns";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import { supabaseBrowserClient } from "@/supabase/supabaseClient";
import { Channel, User, Workspace } from "@/types/app";
import Typography from "./ui/typography";

interface WorkspaceDialogProps {
  workspace: Workspace;
  currentUser: User;
  onUpdate?: (workspace: Workspace) => void;
}

const WorkspaceDialog = ({
  workspace,
  currentUser,
  onUpdate,
}: WorkspaceDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState(workspace.name);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(workspace.image_url);
  const isSuperAdmin = currentUser.id === workspace.super_admin;

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const uniqueId = uuid();
    const supabase = supabaseBrowserClient;

    try {
      const fileName = `workspaces/img-${uniqueId}.${file.name
        .split(".")
        .pop()}`;
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      const { data: storageData, error: storageError } = await supabase.storage
        .from("chat-files")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (storageError) throw storageError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("chat-files").getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("workspaces")
        .update({ image_url: publicUrl })
        .eq("id", workspace.id);

      if (updateError) throw updateError;

      if (onUpdate) {
        onUpdate({
          ...workspace,
          image_url: publicUrl,
        });
      }

      toast.success("Workspace image updated successfully");
    } catch (error) {
      console.error("Error in workspace image upload:", error);
      toast.error("Failed to upload workspace image");
      setPreviewUrl(workspace.image_url);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateWorkspace = async () => {
    if (!workspaceName.trim()) {
      toast.error("Workspace name cannot be empty");
      return;
    }

    try {
      const supabase = supabaseBrowserClient;
      const { error } = await supabase
        .from("workspaces")
        .update({ name: workspaceName.trim() })
        .eq("id", workspace.id);

      if (error) throw error;

      if (onUpdate) {
        onUpdate({
          ...workspace,
          name: workspaceName.trim(),
        });
      }
      toast.success("Workspace updated successfully");
      setIsOpen(false);
    } catch (error) {
      console.error("Error updating workspace:", error);
      toast.error("Failed to update workspace");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start">
          <FiEdit3 className="mr-2 h-4 w-4" />
          <Typography
            variant="p"
            text={`Update ${workspace.name}`}
            className="text-xs"
          />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Group Settings</DialogTitle>
          <DialogDescription>View and manage group details</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="channels">Channels</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle> Group Information</CardTitle>
                <CardDescription>
                  Created on {format(new Date(workspace.created_at), "PPP")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workspace-image">Group Image</Label>
                  <div className="flex items-center space-x-4">
                    <div className="relative group cursor-pointer">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={previewUrl || undefined} />

                        <AvatarFallback>
                          {workspace.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      {isSuperAdmin && (
                        <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                          <label
                            htmlFor="workspace-image-upload"
                            className="cursor-pointer text-white text-xs"
                          >
                            {isUploading ? "Uploading..." : "Change"}
                          </label>
                          <Input
                            id="workspace-image-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            disabled={isUploading}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workspace-name">Group Name</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="workspace-name"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      disabled={!isSuperAdmin}
                    />
                    {isSuperAdmin && (
                      <Button
                        onClick={handleUpdateWorkspace}
                        disabled={
                          !workspaceName.trim() ||
                          workspaceName === workspace.name
                        }
                      >
                        Update
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Invite Code</Label>
                  <div className="flex items-center space-x-2">
                    <Input value={workspace.invite_code} readOnly />
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(workspace.invite_code);
                        toast.success("Invite code copied to clipboard");
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>Group Members</CardTitle>
                <CardDescription>
                  {workspace.members?.length || 0} members in this group
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    {workspace.members?.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-4">
                          <Avatar>
                            <AvatarImage src={member.avatar_url || ""} />
                            <AvatarFallback>
                              {member.name?.slice(0, 2) ||
                                member.email?.slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {member.name || member.email}
                            </p>
                            <p className="text-sm text-gray-500">
                              {member.email}
                            </p>
                          </div>
                        </div>
                        {workspace.super_admin === member.id && (
                          <span className="text-sm text-blue-600 font-medium">
                            Super Admin
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="channels">
            <Card>
              <CardHeader>
                <CardTitle>Group Channels</CardTitle>
                <CardDescription>
                  {workspace.channels?.length || 0} channels in this group
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    {workspace.channels?.map((channel: Channel) => (
                      <div
                        key={channel.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100"
                      >
                        <div>
                          <p className="font-medium">{channel.name}</p>
                          {/* <p className="text-sm text-gray-500">
                            Created {format(new Date(channel.created_at), 'PPP')}
                          </p> */}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default WorkspaceDialog;
