import { MEDIA_BASE_URL } from '../constants';

export const buildImageUrl = (path) => {
  if (!path) return '';
  return path.startsWith('http') ? path : `${MEDIA_BASE_URL}${path}`;
};

export const downloadImage = (imageUrl, filename) => {
  const link = document.createElement('a');
  link.href = buildImageUrl(imageUrl);
  link.download = filename || 'image.jpg';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
