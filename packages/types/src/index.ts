export interface User {
  id: string;
  email: string;
  createdAt: Date;
}

export interface ShortURL {
  id: string;
  originalUrl: string;
  shortCode: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string | null;
  clicks: number;
}

export interface Analytics {
  id: string;
  urlId: string;
  clickedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  referer: string | null;
}

export interface CreateShortUrlRequest {
  originalUrl: string;
  customCode?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
