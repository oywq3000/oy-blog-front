import request from './request';


export interface SimpleUserProfile{
  name:string;
  avatar:string;
}

const baseUrl = '/api/user-service'

// 他人公开主页可展示的用户信息（user-service /profile/public/{userId}）
export interface UserPublicProfile {
  name: string;
  avatar: string;
  bio?: string;
  /** 加入时间（注册时间） */
  createdAt?: string;
  articleCount?: number;
  favoriteCount?: number;
  likeCount?: number;
}

export interface ResultUserPublicProfile {
  errCode: number;
  errMsg: string;
  isSuccess: boolean;
  data: UserPublicProfile;
}

// Public User Info by ID (Updated based on Swagger)
export const getUserPublicProfile = (userId: string) => {
  return request.get<any, ResultUserPublicProfile>(baseUrl+`/profile/public/${userId}`);
};


export interface SimpleUserProfileResult{
  errCode: number;
  errMsg: string;
  isSuccess: boolean;
  data: SimpleUserProfile;
}
export const getSimpleUserProfile = (userId: string)=>{
   return request.get<any, SimpleUserProfileResult>(baseUrl+`/profile/public/simple/${userId}`);
}
