export type SensorType =
  | 'humidity_soil'
  | 'humidity_air'
  | 'temperature'
  | 'light'
  | 'ph'
  | 'water_level'
  | 'ec';

export interface Sensor {
  id: string;
  name: string;
  type: SensorType;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  lastUpdate: string;
}

export interface Calibration {
  id: string;
  key: 'ph' | 'ec';
  params: Record<string, number>;
  note?: string;
  updatedAt: string;
}

export interface Crop {
  id: string;
  name: string;
  variety: string;
  plantedDate: string;
  expectedHarvestDate: string;
  currentStage: 'germination' | 'seedling' | 'vegetative' | 'flowering' | 'fruiting' | 'harvest';
  healthScore: number;
  location: string;
  imageUrl: string;
  sensors: string[];
}

export interface Alert {
  id: string;
  type: 'pest' | 'disease' | 'irrigation' | 'nutrition' | 'environmental' | 'growth';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  cropId?: string;
  cropName?: string;
  timestamp: string;
  isRead: boolean;
  aiRecommendation?: string;
}

export interface PhotoComment {
  id: string;
  photoId: string;
  body: string;
  author: string | null;
  createdAt: string;
}

export interface Camera {
  id: string;
  name: string | null;
  cropId: string | null;
  cropName: string | null;
  isActive: boolean;
  captureIntervalSec: number;
  lastSeenAt: string | null;
  photoCount?: number;
}

export interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  // Null en las fotos que sube una cámara sin cultivo asociado.
  cropId: string | null;
  cropName: string | null;
  capturedAt: string;
  // Sólo en fotos ingestadas por cámara.
  source?: 'manual' | 'camera';
  cameraId?: string | null;
  width?: number | null;
  height?: number | null;
  sizeBytes?: number | null;
  analysisStatus?: 'pending' | 'processing' | 'done' | 'failed' | 'skipped';
  // Editable desde la web.
  title?: string | null;
  comments?: PhotoComment[];
  aiAnalysis?: {
    healthScore: number;
    growthStage: string;
    issues: string[];
    recommendations: string[];
  };
}

export interface IrrigationEvent {
  id: string;
  timestamp: string;
  duration: number; // minutes
  waterVolume: number; // liters
  trigger: 'scheduled' | 'ai_decision' | 'manual';
  zones: string[];
}

export interface SensorReading {
  timestamp: string;
  value: number;
}

export interface DashboardStats {
  totalCrops: number;
  healthyPercentage: number;
  activeAlerts: number;
  waterUsageToday: number;
  avgSoilHumidity: number;
  currentTemperature: number;
}
