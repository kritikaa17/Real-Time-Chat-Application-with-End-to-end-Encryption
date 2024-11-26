'use server';

import { supabaseServerClient } from '@/supabase/supabaseServer';
import { getUserData } from './get-user-data';

export const createChannel = async ({
  name,
  workspaceId,
  userId,
}: {
  workspaceId: string;
  name: string;
  userId: string;
}) => {
  const supabase = await supabaseServerClient();

  const userData = await getUserData();

  if (!userData) {
    return { error: 'No user data' };
  }

  // Fetch the user's public key from the users table (field name is `public_key`)
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("public_key")  // field name in users table is `public_key`
    .eq("id", userId)
    .single();

  if (userError) {
    console.error('Error fetching user public key:', userError);
    return { error: 'Error fetching user public key' };
  }

  const userPublicKey = user?.public_key;  // Access the `public_key` field

  if (!userPublicKey) {
    return { error: 'User public key not found' };
  }

  // Insert the channel with the user's public key
  const { data: channelRecord, error: insertError } = await supabase
    .from('channels')
    .insert({
      name,
      user_id: userId,
      workspace_id: workspaceId,
      publicKey: userPublicKey,  // Store the user's public key in the channel record (field in `channels` is `publicKey`)
      members: [userId],  // Initializing the members array with the user
      regulators: [],  // Assuming regulators array is empty initially
    })
    .select('*'); // Select the inserted channel data

  if (insertError) {
    console.error('Insert Error:', insertError);
    return { error: 'Insert Error' };
  }

  // Assuming the channel was inserted successfully, continue updating other aspects

  // Update channel members array
  const [, updateChannelMembersError] = await updateChannelMembers(
    channelRecord[0].id,
    userId
  );

  if (updateChannelMembersError) {
    return { error: 'Update members channel error' };
  }

  // Add channel to user's channels array
  const [, addChannelToUserError] = await addChannelToUser(
    userData.id,
    channelRecord[0].id
  );

  if (addChannelToUserError) {
    return { error: 'Add channel to user error' };
  }

  // Add channel to workspace's channels array
  const [, updateWorkspaceChannelError] = await updateWorkspaceChannel(
    channelRecord[0].id,
    workspaceId
  );

  if (updateWorkspaceChannelError) {
    return { error: 'Update workspace channel error' };
  }

  return { success: true, channel: channelRecord[0] }; // Return the created channel
};

export const addChannelToUser = async (userId: string, channelId: string) => {
  const supabase = await supabaseServerClient();

  const { data: addChannelData, error: addChannelError } = await supabase.rpc(
    'update_user_channels',
    {
      user_id: userId,
      channel_id: channelId,
    }
  );

  return [addChannelData, addChannelError];
};

export const updateChannelMembers = async (
  channelId: string,
  userId: string
) => {
  const supabase = await supabaseServerClient();

  const { data: updateChannelData, error: updateChannelError } =
    await supabase.rpc('update_channel_members', {
      new_member: userId,
      channel_id: channelId,
    });

  return [updateChannelData, updateChannelError];
};

const updateWorkspaceChannel = async (
  channelId: string,
  workspaceId: string
) => {
  const supabase = await supabaseServerClient();

  const { data: updateWorkspaceData, error: updateWorkspaceError } =
    await supabase.rpc('add_channel_to_workspace', {
      channel_id: channelId,
      workspace_id: workspaceId,
    });

  return [updateWorkspaceData, updateWorkspaceError];
};

export const updateChannelRegulators = async (
  userId: string,
  channelId: string
) => {
  const supabase = await supabaseServerClient();

  const { data: updateChannelData, error: updateChannelError } =
    await supabase.rpc('update_channel_regulators', {
      new_regulator: userId,
      channel_id: channelId,
    });

  return [updateChannelData, updateChannelError];
};
