import { Workspace as UserWorkspace } from "@/types/app";
import {
  getCurrentWorkspaceData,
  getUserWorkspaceData,
} from "@/actions/workspaces";
import { getUserData } from "@/actions/get-user-data";
import { redirect } from "next/navigation";
import { getUserWorkspaceChannels } from "@/actions/get-user-workspace-channels";
import ChatGroup from "@/components/chat-group";

const ChannelId = async ({
  params,
}: {
  params: {
    workspaceId: string;
    channelId: string;
  };
}) => {

  const { workspaceId, channelId } = await params;

  const userData = await getUserData();

  if (!userData) return redirect("/auth");

  const [userWorkspaceData] = await getUserWorkspaceData(userData.workspaces!);

  const [currentWorkspaceData] = await getCurrentWorkspaceData(workspaceId);


  const userWorkspaceChannels = await getUserWorkspaceChannels(
    currentWorkspaceData.id,
    userData.id
  );

  const currentChannelData = userWorkspaceChannels.find(
    (channel) => channel.id === channelId
  );

  if (!currentChannelData) return redirect("/");

  return (
    <div className="hidden md:block">
      <ChatGroup
        type="Channel"
        userData={userData}
        currentChannelData={currentChannelData}
        currentWorkspaceData={currentWorkspaceData}
        slug={workspaceId}
        chatId={channelId}
        userWorkspaceChannels={userWorkspaceChannels}
        socketUrl="/api/web-socket/messages"
        socketQuery={{
          channelId: currentChannelData.id,
          workspaceId: currentChannelData.id,
        }}
        apiUrl="/api/messages"
        headerTitle={currentChannelData.name}
        paramKey="channelId"
        paramValue={channelId}
        userWorkspaceData={userWorkspaceData as UserWorkspace[]}
      />
    </div>
  );
};

export default ChannelId;
