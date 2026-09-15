/**
 * 把上传返回的图片 URL 列表组装成 markdown 图片片段(每张一行)。
 * 供编辑器上传成功后 insertValue 使用;空列表返回空串。
 */
export function buildImageInsertMarkdown(urls: string[]): string {
  return urls.map((url) => `![](${url})`).join('\n');
}