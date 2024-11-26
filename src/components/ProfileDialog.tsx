import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Typography from "@/components/ui/typography";
import { User, Workspace, Channel } from "@/types/app";
import { useState } from "react";
import { supabaseBrowserClient } from "@/supabase/supabaseClient";
import { toast } from "sonner";
import AvatarUpload from "@/components/AvatarUpload";

type ProfileDialogProps = {
  userData: User;
  workspaces: Workspace[];
  channels?: Channel[];
};

const ProfileDialog = ({ userData, workspaces, channels }: ProfileDialogProps) => {
  const [username, setUsername] = useState(userData.name || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateProfile = async () => {
    if (!username.trim()) return;
    
    setIsUpdating(true);
    const supabase = supabaseBrowserClient;

    try {
      const { error } = await supabase
        .from("users")
        .update({ name: username })
        .eq("id", userData.id);

      if (error) throw error;

      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Typography
          variant="p"
          text="Profile"
          className="hover:text-white hover:bg-blue-700 px-2 py-1 rounded cursor-pointer"
        />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="flex flex-col items-center gap-4">
            <AvatarUpload 
              userData={userData}
              className="w-24 h-24"
            />
            
            <div className="w-full space-y-2">
              <Typography text="Username" variant="p" className="text-sm font-medium" />
              <div className="flex gap-2">
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Enter username"
                />
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} variant="outline">
                    Edit
                  </Button>
                ) : (
                  <Button 
                    onClick={handleUpdateProfile} 
                    disabled={isUpdating}
                  >
                    Save
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Typography text="Email" variant="p" className="text-sm font-medium" />
            <Input value={userData.email} disabled />
          </div>

          <div className="space-y-2">
            <Typography text="Workspaces" variant="p" className="text-sm font-medium" />
            <div className="border rounded-md p-2 space-y-1">
              {workspaces.map((workspace) => (
                <div key={workspace.id} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <Typography text={workspace.name} variant="p" className="text-sm" />
                </div>
              ))}
            </div>
          </div>

          {channels && channels.length > 0 && (
            <div className="space-y-2">
              <Typography text="Channels" variant="p" className="text-sm font-medium" />
              <div className="border rounded-md p-2 space-y-1">
                {channels.map((channel) => (
                  <div key={channel.id} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <Typography text={channel.name} variant="p" className="text-sm" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileDialog;