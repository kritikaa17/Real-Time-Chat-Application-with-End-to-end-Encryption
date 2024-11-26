"use client";

import { FC, useState } from "react";
import { FaArrowDown, FaArrowUp, FaPlus } from "react-icons/fa6";
import { GoDotFill } from "react-icons/go";
import { GiNightSleep } from "react-icons/gi";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { useColorPreferences } from "@/providers/color-preferences";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Typography from "@/components/ui/typography";
import CreateChannelDialog from "@/components/create-channel-dialog";
import { Channel, User, Workspace } from "@/types/app";

// Determine status icon and color based on user status
const getUserStatusIcon = (is_away: boolean) => {
  if (is_away) {
    return {
      icon: <GiNightSleep className="text-yellow-500" />,
      color: "text-yellow-500",
      text: "Away",
    };
  }

  return {
    icon: <GoDotFill className="text-green-600" />,
    color: "text-green-600",
    text: "Active",
  };
};

const InfoSection: FC<{
  userData: User;
  currentWorkspaceData: Workspace;
  userWorkspaceChannels: Channel[];
  currentChannelId: string | undefined;
}> = ({
  userData,
  currentWorkspaceData,
  userWorkspaceChannels,
  currentChannelId,
}) => {
  const { color } = useColorPreferences();

  const [isChannelCollapsed, setIsChannelCollapsed] = useState(true);
  const [isDirectMessageCollapsed, setIsDirectMessageCollapsed] =
    useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter();

  // Dynamic background color based on color preference
  let backgroundColor = "bg-primary-light";
  if (color === "green") {
    backgroundColor = "bg-green-900";
  } else if (color === "blue") {
    backgroundColor = "bg-blue-900";
  } else if (color === "red") {
    backgroundColor = "bg-red-900";
  } else if (color === "teal") {
    backgroundColor = "bg-teal-900";
  } else if (color === "orange") {
    backgroundColor = "bg-orange-900";
  }

  // Dynamic secondary background color
  let secondayBg = "bg-primary-dark";
  if (color === "green") {
    secondayBg = "bg-green-700";
  } else if (color === "blue") {
    secondayBg = "bg-blue-700";
  } else if (color === "red") {
    secondayBg = "bg-red-700";
  } else if (color === "teal") {
    secondayBg = "bg-teal-700";
  } else if (color === "orange") {
    secondayBg = "bg-orange-700";
  }

  // Navigation functions
  const navigateToChannel = (channelId: string) => {
    const url = `/workspace/${currentWorkspaceData.id}/channels/${channelId}`;
    router.push(url);
  };

  const navigateToDirectMessage = (memberId: string) => {
    const url = `/workspace/${currentWorkspaceData.id}/direct-message/${memberId}`;
    router.push(url);
  };

  return (
    <div
      className={cn(
        "fixed text-white left-20 rounded-l-xl md:w-52 lg:w-[350px] h-[calc(100%-63px)] z-20 flex flex-col items-center",
        backgroundColor
      )}
    >
      <div className="w-full flex flex-col gap-2 p-3">
        {/* Channels Section */}
        <div>
          <Collapsible
            open={isChannelCollapsed}
            onOpenChange={() =>
              setIsChannelCollapsed((prevState) => !prevState)
            }
            className="flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <CollapsibleTrigger className="flex items-center gap-2">
                {isChannelCollapsed ? <FaArrowDown /> : <FaArrowUp />}
                <Typography variant="p" text="Channels" className="font-bold" />
              </CollapsibleTrigger>

              <div
                className={cn(
                  "cursor-pointer p-2 rounded-full",
                  `hover:${secondayBg}`
                )}
              >
                <FaPlus onClick={() => setDialogOpen(true)} />
              </div>
            </div>
            <CollapsibleContent>
              {userWorkspaceChannels.map((channel) => {
                const activeChannel = currentChannelId === channel.id;
                return (
                  <Typography
                    key={channel.id}
                    variant="p"
                    text={`# ${channel.name}`}
                    className={cn(
                      "px-2 py-1 rounded-sm cursor-pointer",
                      `hover:${secondayBg}`,
                      activeChannel && secondayBg
                    )}
                    onClick={() => navigateToChannel(channel.id)}
                  />
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Direct Messages Section */}
        <div>
          <Collapsible
            open={isDirectMessageCollapsed}
            onOpenChange={() =>
              setIsDirectMessageCollapsed((prevState) => !prevState)
            }
            className="flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <CollapsibleTrigger className="flex items-center gap-2">
                {isDirectMessageCollapsed ? <FaArrowDown /> : <FaArrowUp />}
                <Typography
                  variant="p"
                  text="Direct messages"
                  className="font-bold"
                />
              </CollapsibleTrigger>
              <div
                className={cn(
                  "cursor-pointer p-2 rounded-full",
                  `hover:${secondayBg}`
                )}
              >
                <FaPlus />
              </div>
            </div>
            <CollapsibleContent>
              <TooltipProvider>
                {currentWorkspaceData?.members?.map((member) => {
                  const statusInfo = getUserStatusIcon(member.is_away);

                  return (
                    <Tooltip key={member.id}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "flex items-center gap-2 px-2 py-1 rounded-sm cursor-pointer group",
                            `hover:${secondayBg}`
                          )}
                          onClick={() => navigateToDirectMessage(member.id)}
                        >
                          <Typography
                            variant="p"
                            text={member.name || member.email}
                          />
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            {statusInfo.icon}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="flex items-center gap-2">
                          {statusInfo.icon}
                          <p className={statusInfo.color}>{statusInfo.text}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </TooltipProvider>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      <CreateChannelDialog
        setDialogOpen={setDialogOpen}
        dialogOpen={dialogOpen}
        workspaceId={currentWorkspaceData.id}
        userId={userData.id}
      />
    </div>
  );
};

export default InfoSection;
