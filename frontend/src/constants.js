export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
export const MEDIA_BASE_URL = import.meta.env.VITE_MEDIA_BASE_URL || 'http://localhost:8000';

export const MODEL_STATUS = { ONLINE: 'ONLINE', OFFLINE: 'OFFLINE', UNKNOWN: 'UNKNOWN' };
export const OUTPUT_TYPE = { TEXT: 'TEXT', IMAGE: 'IMAGE' };
export const USER_ROLES = { ADMIN: 'ADMIN', USER: 'USER' };

export const HF_TOKEN_PREFIX = 'hf_';
export const ITEMS_PER_PAGE = 10;
export const NOTIFY_DURATION_MS = 4000;
