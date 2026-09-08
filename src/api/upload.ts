import request from './request';

export interface ResultString {
  errCode: number;
  errMsg: string;
  isSuccess: boolean;
  data: string;
}

export interface ResultImageInfo {
  errCode: number;
  errMsg: string;
  isSuccess: boolean;
  data: ImageInfo;
}
export interface ImageInfo{
  key: string,
  url: string,
  contentType: string,
  size: number
}

// Upload User Avatar
// 契约与 uploadCover 一致：data 为文件信息对象 {key,url,contentType,size}
// （后端曾把 URL 错放进 errMsg，已在 user-service 修复对齐，勿再按 errMsg 取值）
export const uploadAvatar = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<any, ResultImageInfo>('/api/user-service/profile/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Upload Article Cover
export const uploadCover = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<any, ResultImageInfo>('/api/article-service/article/cover', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Upload Article Content Image
export const uploadContentImage = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<any, ResultString>('/api/article-service/article/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
