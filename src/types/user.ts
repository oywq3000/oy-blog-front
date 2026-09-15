export interface UserInfo {
  id: string;
  username: string;
  email: string;
  status: number;
  bio?: string;
  avatarUrl: string;
  blogRole: string;
  emailVerified: boolean;
  ipAddress: string;
  lastLogin: string;
  createdAt: string;
  /** 技能列表（按摆放顺序），无技能时为 undefined */
  skills?: string[];
}
