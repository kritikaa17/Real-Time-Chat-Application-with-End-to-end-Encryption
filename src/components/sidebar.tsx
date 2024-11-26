"use client";
import { User, Workspace } from "@/types/app";
import { FC } from "react";
import { FiPlus } from "react-icons/fi";
import SidebarNav from "@/components/sidebar-nav";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useColorPreferences } from "@/providers/color-preferences";
import { GoDot } from "react-icons/go";
import { GoDotFill } from "react-icons/go";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Typography from "@/components/ui/typography";
import { GiNightSleep } from "react-icons/gi";

import PreferencesDialog from "@/components/preferences-dialog";
import ProfileDialog from "@/components/ProfileDialog";

import { TooltipContent } from "@radix-ui/react-tooltip";
import WorkspaceDialog from "@/components/WorkSpaceDialog";

import { signOut } from "@/actions/signout"; // Import the new signOut action
import { useRouter } from "next/navigation"; // Import useRouter

type SidebarProps = {
  userWorkspacesData: Workspace[];
  currentWorkspaceData: Workspace;
  userData: User;
};

const Sidebar: FC<SidebarProps> = ({
  userWorkspacesData,
  currentWorkspaceData,
  userData,
}) => {
  const router = useRouter(); // Initialize router
  const { color } = useColorPreferences();
  let backgroundColor = "bg-primary-dark";
  if (color === "green") {
    backgroundColor = "bg-green-700";
  } else if (color === "blue") {
    backgroundColor = "bg-blue-700";
  } else if (color === "red") {
    backgroundColor = "bg-red-700";
  } else if (color === "teal") {
    backgroundColor = "bg-teal-700";
  } else if (color === "orange") {
    backgroundColor = "bg-orange-700";
  }

  const handleWorkspaceUpdate = (updatedWorkspace: Workspace) => {
    // Handle workspace update logic here
    console.log("Workspace updated:", updatedWorkspace);
  };

  const handleWorkspaceDelete = (workspaceId: string) => {
    // Handle workspace deletion logic here
    console.log("Workspace deleted:", workspaceId);
  };

  // New method to handle sign out
  const handleSignOut = async () => {
    const result = await signOut(userData.id);
    
    if (result.success) {
      // Redirect to authentication page
      router.push('/auth');
    } else {
      // Handle error (you might want to add error handling mechanism)
      console.error('Sign out failed:', result.error);
    }
  };

  return (
    <aside
      className={`
        fixed
        top-0
        left-0
        pt-[68px]
        pb-8
        z-30
        flex
        flex-col
        justify-between
        items-center
        h-screen
        w-20
      `}
    >
      <SidebarNav
        currentWorkspaceData={currentWorkspaceData}
        userWorkspacesData={userWorkspacesData}
      />
      <div className="flex flex-col space-y-3">
        <div
          className={`
          bg-[rgba(255,255,255,0.3)] cursor-pointer transition-all duration-300
          hover:scale-110 text-white grid place-content-center rounded-full w-10 h-10
          `}
        >
          <FiPlus size={28} />
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Popover>
                  <PopoverTrigger>
                    <div className="h-10 w-10 relative cursor-pointer">
                      <div className="h-full w-full rounded-lg overflow-hidden">
                        <Image
                          className="object-cover w-full h-full"
                          src={userData.avatar_url}
                          alt={userData.name || "user"}
                          width={300}
                          height={300}
                        />
                        <div
                          className={cn(
                            "absolute z-10 rounded-full -right-[20%] -bottom-1",
                            backgroundColor
                          )}
                        >
                          {userData.is_away ? (
                            <GoDot className="text-white text-xl" />
                          ) : (
                            <GoDotFill className="text-green-600" size={17} />
                          )}
                        </div>
                      </div>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent side="right">
                    <div>
                      <div className="flex space-x-3">
                        <Avatar>
                          <AvatarImage src={userData.avatar_url} />
                          <AvatarFallback>
                            {userData.name && userData.name.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <Typography
                            text={userData.name || userData.email}
                            variant="p"
                            className="font-bold"
                          />
                          <div className="flex items-center space-x-1">
                            {userData.is_away ? (
                              <GiNightSleep size="12" />
                            ) : (
                              <GoDotFill className="text-green-600" size="17" />
                            )}
                            <span className="text-xs">
                              {userData.is_away ? "Away" : "Active"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <hr className="bg-gray-400 mt-4" />
                      <div className="flex flex-col space-y-1 ">
                        <ProfileDialog
                          userData={userData}
                          workspaces={userWorkspacesData}
                          channels={currentWorkspaceData.channels || []}
                        />
                        <PreferencesDialog />
                        <WorkspaceDialog
                          workspace={currentWorkspaceData}
                          currentUser={userData}
                          onUpdate={handleWorkspaceUpdate}
                        />
                        <hr className="bg-gray-400" />

                        {/* Updated Sign Out with onClick handler */}
                        <Typography
                          variant="p"
                          text={`Sign Out of ${currentWorkspaceData.name} `}
                          className="hover:text-white hover:bg-blue-700 px-2 py-1 rounded cursor-pointer"
                          onClick={handleSignOut}
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </TooltipTrigger>
            <TooltipContent
              className="text-white bg-black border-black"
              side="right"
            >
              <Typography text={userData.name || userData.email} variant="p" />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </aside>
  );
};

export default Sidebar;