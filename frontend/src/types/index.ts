export interface Sensor {
  id: string;
  name: string;
  type: 'humidity_soil' | 'humidity_air' | 'temperature' | 'light' | 'ph';
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  lastUpdate: string;
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

export interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string;
  cropId: string;
  cropName: string;
  capturedAt: string;
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
