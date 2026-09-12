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

/**
 * 上传类请求统一放宽超时：全局 10s 对上传过紧 —— 线上链路实测上行约 40~100KB/s。
 * 改动前头像踩过一次（512×512 PNG 裁剪图实测 465KB，够跑 5~12s，浏览器常在 10s 放弃
 * 等待而服务端仍写完，表现为「提示超时但头像已改」，见 avatarFile.ts）；封面/正文图
 * 是同一个坑，只是原图直传时先撞上服务端 1MB 上限、没走到超时那一步。
 * 降采样后封面约 100~250KB（见 imageUpload.ts），正常 1~6s，60s 是给弱网的余量。
 */
export const UPLOAD_TIMEOUT_MS = 60000;

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
    timeout: UPLOAD_TIMEOUT_MS,
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
    timeout: UPLOAD_TIMEOUT_MS,
  });
};

// Upload Series (Column) Cover —— 专栏封面专属端点（与文章封面语义分离，文件目录 series/cover）
export const uploadSeriesCover = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<any, ResultImageInfo>(
    '/api/article-service/article/creator/series/cover',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: UPLOAD_TIMEOUT_MS,
    },
  );
};

// Upload Article Content Image
export const uploadContentImage = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<any, ResultString>('/api/article-service/article/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: UPLOAD_TIMEOUT_MS,
  });
};
