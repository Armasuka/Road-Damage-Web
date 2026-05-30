// Bounding box for detected objects
export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// AI detection result
export interface Detection {
  class: string;
  confidence: number;
  image_index: number;
  bbox: BBox;
}

// Report status values
export type ReportStatus = 'pending' | 'reviewed' | 'diteruskan';

// Main report interface matching database schema and API responses
export interface Report {
  id: number;
  kodeUnik: string;
  email: string;
  createdAt: Date | string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  deskripsi: string | null;
  rdsScore: number;
  status: ReportStatus;
  address: string | null;
  detections: Detection[];
}

// Statistics for dashboard/landing page
export interface Stats {
  total: number;
  avgRds: number;
}

// Public tracking result (limited fields)
export interface TrackResult {
  kodeUnik: string;
  status: ReportStatus;
  rdsScore: number;
  createdAt: Date | string;
  address: string | null;
  detectionsCount: number;
}