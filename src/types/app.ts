import { NextApiResponse } from "next";
import { Server as NetServer, Socket } from "net";
import { Server as SocketIOServer } from "socket.io";

export type User = {
  aes_key: string | null
  avatar_url: string
  channels: string[] | null
  created_at: string | null
  email: string
  encrypted_private_key: string | null
  id: string
  is_away: boolean
  iv: string | null
  name: string | null
  phone: string | null
  public_key: string | null
  type: string | null
  workspaces: string[] | null
};
export type Workspace = {
  channels: Channel[] | null;
  created_at: string;
  id: string;
  image_url: string | null;
  invite_code: string;
  members: User[] | null;
  name: string;
  regulators: string[] | null;
  slug: string;
  super_admin: string;
};
export type Channel = {
  id: string;
  members: string[] | null;
  name: string;
  publicKey: string | null;
  regulators: string[] | null;
  user_id: string;
  workspace_id: string;
  created_at?: string;
};
export type Messages = {
  channel_id: string;
  content: string | null;
  created_at: string;
  encryptedAESKey: string | null;
  encryptedMessage: string | null;
  file_hmac: string | null;
  file_url: string | null;
  hmac: string | null;
  id: string;
  is_deleted: boolean;
  iv: string | null;
  updated_at: string;
  user_id: string;
  workspace_id: string;
};
export type DirectMessages = {
  content: string | null;
  created_at: string;
  encryptedAESKey: string | null;
  encryptedMessage: string | null;
  file_hmac: string | null;
  file_url: string | null;
  hmac: string | null;
  id: number;
  is_deleted: boolean;
  iv: string | null;
  updated_at: string;
  user: string;
  user_one: string;
  user_two: string;
};

export type MessageWithUser = Messages & { user: User };

export interface UserEncryptionKeys {
  publicKey: string;
  encryptedPrivateKey: string;
  iv: string;
}

export type SocketIoApiResponse = NextApiResponse & {
  socket: Socket & {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};
