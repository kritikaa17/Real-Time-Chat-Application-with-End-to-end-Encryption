import { redirect } from "next/navigation";

import { getUserData } from "@/actions/get-user-data";
import ChatGroup from "@/components/chat-group";
import {
  getCurrentWorkspaceData,
  getUserWorkspaceData,
} from "@/actions/workspaces";
import { getUserWorkspaceChannels } from "@/actions/get-user-workspace-channels";
import { Workspace } from "@/types/app";

const DirectMessage = async ({
  params,
}: {
  params: { workspaceId: string; chatId: string };
}) => {
  // Await params to get the values properly
  const { chatId, workspaceId } = await params;

  const userData = await getUserData();

  if (!userData) return redirect("/auth");

  const [userWorkspacesData] = await getUserWorkspaceData(userData.workspaces!);

  const [currentWorkspaceData] = await getCurrentWorkspaceData(workspaceId);

  const userWorkspaceChannels = await getUserWorkspaceChannels(
    workspaceId,
    userData.id
  );

  const currentChannelData = userWorkspaceChannels.find(
    (channel) => channel.id === chatId
  );

  return (
    <div className="hidden md:block">
      <ChatGroup
        userData={userData}
        type="DirectMessage"
        currentChannelData={currentChannelData}
        currentWorkspaceData={currentWorkspaceData}
        userWorkspaceData={userWorkspacesData as Workspace[]}
        slug={workspaceId}
        userWorkspaceChannels={userWorkspaceChannels}
        chatId={chatId}
        socketUrl="/api/web-socket/direct-messages"
        socketQuery={{
          channelId: currentChannelData?.id!,
          workspaceId: currentWorkspaceData.id,
          recipientId: chatId,
        }}
        apiUrl="/api/direct-messages"
        headerTitle={"DIRECT MESSAGE"}
        paramKey="recipientId"
        paramValue={chatId}
      />
    </div>
  );
};

export default DirectMessage;
