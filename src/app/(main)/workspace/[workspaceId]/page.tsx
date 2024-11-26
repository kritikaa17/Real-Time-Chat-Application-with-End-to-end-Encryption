import { getUserData } from "@/actions/get-user-data";
import {
  getCurrentWorkspaceData,
  getUserWorkspaceData,
} from "@/actions/workspaces";
import Sidebar from "@/components/sidebar";
import { redirect } from "next/navigation";
import { Workspace as UserWorkspace } from "@/types/app";
import InfoSection from "@/components/info-section";
import Typography from "@/components/ui/typography";
import { getUserWorkspaceChannels } from "@/actions/get-user-workspace-channels";
import NoDataScreen from "@/components/no-data-component";

const Workspace = async ({ params }: { params: { workspaceId: string } }) => {
  const { workspaceId } = await params;

  const userData = await getUserData();

  if (!userData) return redirect("/auth");

  const [userWorkspaceData] = await getUserWorkspaceData(userData.workspaces!);

  const [currentWorkspaceData] = await getCurrentWorkspaceData(workspaceId);

  const userWorkspaceChannels = await getUserWorkspaceChannels(
    currentWorkspaceData.id,
    userData.id
  );


  return (
    <>
      <div className="hidden md:block">
        <Sidebar
          currentWorkspaceData={currentWorkspaceData}
          userData={userData}
          userWorkspacesData={userWorkspaceData as UserWorkspace[]}
        />
        <InfoSection
          currentWorkspaceData={currentWorkspaceData}
          userData={userData}
          userWorkspaceChannels={userWorkspaceChannels}
          currentChannelId=""
        />
        <NoDataScreen
          userId={userData.id}
          workspaceId={currentWorkspaceData.id}
          workspaceName={currentWorkspaceData.name}
        />

        <div className="md:hidden block min-h-screen"> Mobile</div>
      </div>
    </>
  );
};

export default Workspace;
