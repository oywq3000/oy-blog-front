import request from './request';

export interface LoginDto {
  username: string;
  password: string;
  ipAddress: string;
}

export interface RegisterDto {
  username?: string;
  password?: string;
  confirmPassword?: string;
  email?: string;
  ipAddress?: string;
}

export interface UpdatePasswordDto {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateProfileDto {
  username?: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
}

export interface SaTokenInfo {
  accessToken: string;
  tokenType: number;
  expiresIn: number;
  refreshToken: number;
  refreshTokenExpiresIn: number;
  userId: string;
}

export interface ResultSaTokenInfo {
  errCode: number;
  errMsg: string;
  isSuccess: boolean;
  data: SaTokenInfo;
}

export interface ResultObject {
  errCode: number;
  errMsg: string;
  isSuccess: boolean;
  data: any;
}

const baseUrl = "/api/user-service"
export const login = (data: LoginDto) => {
  return request.post<any, ResultSaTokenInfo>(baseUrl+'/auth/login', data);
};

export const register = (data: RegisterDto) => {
  return request.post<any, ResultObject>(baseUrl+'/auth/register', data);
};

export const updatePassword = (data: UpdatePasswordDto) => {
  return request.post<any, ResultObject>(baseUrl+'/auth/password/update', data);
};

export interface UserDto {
  id: string;
  username: string;
  email: string;
  status: number;
  avatarUrl: string;
  bio?: string;
  emailVerified: boolean;
  ipAddress: string;
  lastLogin: string;
}

export interface ResultUserDto {
  errCode: number;
  errMsg: string;
  isSuccess: boolean;
  data: UserDto;
}

export const getUserInfo = () => {
  return request.get<any, ResultUserDto>(baseUrl+'/profile/info');
};

export const updateUserInfo = (data: UpdateProfileDto) => {
  return request.post<any, ResultObject>(baseUrl+'/profile/update', data);
};

export const logout = () => {
  return request.post<any, ResultObject>(baseUrl+'/auth/logout');
};

export interface ResultBoolean {
  errCode: number;
  errMsg: string;
  isSuccess: boolean;
  data: boolean;
}

// 1.5 Check email verification status
export const getEmailVerificationStatus = () => {
  return request.get<any, ResultBoolean>(baseUrl+'/email/verification/status');
};

// 1.6 Request email verification (send email)
export const requestEmailVerification = () => {
  return request.post<any, ResultObject>(baseUrl+'/email/verification/request');
};

// 1.7 Confirm email verification
export const confirmEmailVerification = (token: string) => {
  return request.post<any, ResultObject>(baseUrl+`/email/verification/confirm?token=${token}`);
};

// Get Username by ID
export const getUsernameById = (userId: string) => {
  return request.get<any, { data: string }>(baseUrl+`/profile/public/username/${userId}`);
};
