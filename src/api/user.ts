import request from './request';


export interface SimpleUserProfile{
  name:string;
  avatar:string;
}

const baseUrl = '/api/user-service'

// Public User Info by ID (Updated based on Swagger)
export const getUserPublicProfile = (userId: string) => {
  return request.get<any, any>(baseUrl+`/profile/public/${userId}`);
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
