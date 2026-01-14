import { Sensor, Crop, Alert, Photo, IrrigationEvent, SensorReading, DashboardStats } from '@/types';

export const sensors: Sensor[] = [
  {
    id: 'sensor-1',
    name: 'Humedad Suelo - Zona A',
    type: 'humidity_soil',
    value: 65,
    unit: '%',
    status: 'normal',
    lastUpdate: '2025-01-14T10:30:00Z',
  },
  {
    id: 'sensor-2',
    name: 'Humedad Suelo - Zona B',
    type: 'humidity_soil',
    value: 42,
    unit: '%',
    status: 'warning',
    lastUpdate: '2025-01-14T10:30:00Z',
  },
  {
    id: 'sensor-3',
    name: 'Temperatura Ambiente',
    type: 'temperature',
    value: 24.5,
    unit: '°C',
    status: 'normal',
    lastUpdate: '2025-01-14T10:30:00Z',
  },
  {
    id: 'sensor-4',
    name: 'Humedad Aire',
    type: 'humidity_air',
    value: 58,
    unit: '%',
    status: 'normal',
    lastUpdate: '2025-01-14T10:30:00Z',
  },
  {
    id: 'sensor-5',
    name: 'Luminosidad',
    type: 'light',
    value: 850,
    unit: 'lux',
    status: 'normal',
    lastUpdate: '2025-01-14T10:30:00Z',
  },
  {
    id: 'sensor-6',
    name: 'pH Suelo - Zona A',
    type: 'ph',
    value: 6.8,
    unit: 'pH',
    status: 'normal',
    lastUpdate: '2025-01-14T10:30:00Z',
  },
];

export const crops: Crop[] = [
  {
    id: 'crop-1',
    name: 'Tomates Cherry',
    variety: 'Sweet Million',
    plantedDate: '2024-11-15',
    expectedHarvestDate: '2025-02-15',
    currentStage: 'fruiting',
    healthScore: 92,
    location: 'Zona A - Fila 1',
    imageUrl: '/crops/tomato.jpg',
    sensors: ['sensor-1', 'sensor-3', 'sensor-6'],
  },
  {
    id: 'crop-2',
    name: 'Lechugas',
    variety: 'Butterhead',
    plantedDate: '2024-12-20',
    expectedHarvestDate: '2025-02-01',
    currentStage: 'vegetative',
    healthScore: 88,
    location: 'Zona A - Fila 2',
    imageUrl: '/crops/lettuce.jpg',
    sensors: ['sensor-1', 'sensor-4'],
  },
  {
    id: 'crop-3',
    name: 'Pimientos',
    variety: 'California Wonder',
    plantedDate: '2024-11-01',
    expectedHarvestDate: '2025-02-20',
    currentStage: 'flowering',
    healthScore: 75,
    location: 'Zona B - Fila 1',
    imageUrl: '/crops/pepper.jpg',
    sensors: ['sensor-2', 'sensor-3'],
  },
  {
    id: 'crop-4',
    name: 'Albahaca',
    variety: 'Genovese',
    plantedDate: '2024-12-01',
    expectedHarvestDate: '2025-01-30',
    currentStage: 'vegetative',
    healthScore: 95,
    location: 'Zona A - Fila 3',
    imageUrl: '/crops/basil.jpg',
    sensors: ['sensor-1', 'sensor-5'],
  },
  {
    id: 'crop-5',
    name: 'Zanahorias',
    variety: 'Nantes',
    plantedDate: '2024-10-15',
    expectedHarvestDate: '2025-01-25',
    currentStage: 'harvest',
    healthScore: 90,
    location: 'Zona B - Fila 2',
    imageUrl: '/crops/carrot.jpg',
    sensors: ['sensor-2', 'sensor-6'],
  },
  {
    id: 'crop-6',
    name: 'Espinacas',
    variety: 'Bloomsdale',
    plantedDate: '2024-12-10',
    expectedHarvestDate: '2025-02-10',
    currentStage: 'seedling',
    healthScore: 82,
    location: 'Zona A - Fila 4',
    imageUrl: '/crops/spinach.jpg',
    sensors: ['sensor-1', 'sensor-4'],
  },
];

export const alerts: Alert[] = [
  {
    id: 'alert-1',
    type: 'irrigation',
    severity: 'medium',
    title: 'Humedad baja en Zona B',
    message: 'La humedad del suelo en la Zona B ha descendido al 42%. Se recomienda activar el riego.',
    cropId: 'crop-3',
    cropName: 'Pimientos',
    timestamp: '2025-01-14T10:15:00Z',
    isRead: false,
    aiRecommendation: 'Programar riego de 15 minutos en las próximas 2 horas. Considerar aumentar la frecuencia de riego dado el pronóstico de temperaturas altas.',
  },
  {
    id: 'alert-2',
    type: 'pest',
    severity: 'high',
    title: 'Posible presencia de áfidos',
    message: 'El análisis de imagen detectó posibles áfidos en las hojas de los tomates cherry.',
    cropId: 'crop-1',
    cropName: 'Tomates Cherry',
    timestamp: '2025-01-14T08:30:00Z',
    isRead: false,
    aiRecommendation: 'Inspeccionar manualmente las plantas. Si se confirma, aplicar jabón potásico o aceite de neem. Considerar introducir mariquitas como control biológico.',
  },
  {
    id: 'alert-3',
    type: 'growth',
    severity: 'low',
    title: 'Crecimiento lento detectado',
    message: 'Las espinacas muestran un crecimiento más lento de lo esperado para esta etapa.',
    cropId: 'crop-6',
    cropName: 'Espinacas',
    timestamp: '2025-01-13T16:00:00Z',
    isRead: true,
    aiRecommendation: 'Verificar niveles de nitrógeno en el suelo. Considerar aplicar fertilizante orgánico rico en nitrógeno.',
  },
  {
    id: 'alert-4',
    type: 'environmental',
    severity: 'low',
    title: 'Temperatura óptima superada',
    message: 'La temperatura alcanzó 28°C a las 14:00. Las lechugas prefieren temperaturas más frescas.',
    cropId: 'crop-2',
    cropName: 'Lechugas',
    timestamp: '2025-01-13T14:00:00Z',
    isRead: true,
    aiRecommendation: 'Considerar instalar malla sombra sobre las lechugas durante las horas pico de sol.',
  },
  {
    id: 'alert-5',
    type: 'nutrition',
    severity: 'medium',
    title: 'Deficiencia de nutrientes detectada',
    message: 'Las hojas de los pimientos muestran signos de clorosis, posible deficiencia de hierro.',
    cropId: 'crop-3',
    cropName: 'Pimientos',
    timestamp: '2025-01-12T11:00:00Z',
    isRead: true,
    aiRecommendation: 'Aplicar quelato de hierro al suelo o como fertilizante foliar. Verificar pH del suelo - puede estar demasiado alto impidiendo absorción.',
  },
];

export const photos: Photo[] = [
  {
    id: 'photo-1',
    url: '/photos/tomato-1.jpg',
    thumbnailUrl: '/photos/thumb-tomato-1.jpg',
    cropId: 'crop-1',
    cropName: 'Tomates Cherry',
    capturedAt: '2025-01-14T08:00:00Z',
    aiAnalysis: {
      healthScore: 85,
      growthStage: 'Fructificación temprana',
      issues: ['Posibles áfidos en hojas inferiores', 'Leve amarillamiento en hojas basales'],
      recommendations: ['Inspeccionar presencia de áfidos', 'Podar hojas basales amarillas', 'Mantener riego constante'],
    },
  },
  {
    id: 'photo-2',
    url: '/photos/lettuce-1.jpg',
    thumbnailUrl: '/photos/thumb-lettuce-1.jpg',
    cropId: 'crop-2',
    cropName: 'Lechugas',
    capturedAt: '2025-01-14T08:05:00Z',
    aiAnalysis: {
      healthScore: 92,
      growthStage: 'Desarrollo de cabeza',
      issues: [],
      recommendations: ['Continuar con régimen actual', 'Cosechar en 2-3 semanas'],
    },
  },
  {
    id: 'photo-3',
    url: '/photos/pepper-1.jpg',
    thumbnailUrl: '/photos/thumb-pepper-1.jpg',
    cropId: 'crop-3',
    cropName: 'Pimientos',
    capturedAt: '2025-01-14T08:10:00Z',
    aiAnalysis: {
      healthScore: 72,
      growthStage: 'Floración',
      issues: ['Clorosis intervenal en hojas medias', 'Estrés hídrico leve'],
      recommendations: ['Aumentar frecuencia de riego', 'Aplicar quelato de hierro', 'Monitorear progreso en 48h'],
    },
  },
  {
    id: 'photo-4',
    url: '/photos/basil-1.jpg',
    thumbnailUrl: '/photos/thumb-basil-1.jpg',
    cropId: 'crop-4',
    cropName: 'Albahaca',
    capturedAt: '2025-01-13T08:00:00Z',
    aiAnalysis: {
      healthScore: 96,
      growthStage: 'Crecimiento vegetativo óptimo',
      issues: [],
      recommendations: ['Podar puntas para promover ramificación', 'Lista para primera cosecha parcial'],
    },
  },
  {
    id: 'photo-5',
    url: '/photos/carrot-1.jpg',
    thumbnailUrl: '/photos/thumb-carrot-1.jpg',
    cropId: 'crop-5',
    cropName: 'Zanahorias',
    capturedAt: '2025-01-13T08:05:00Z',
    aiAnalysis: {
      healthScore: 90,
      growthStage: 'Madurez - listas para cosecha',
      issues: [],
      recommendations: ['Cosechar en los próximos 7-10 días', 'El follaje indica raíces de buen tamaño'],
    },
  },
  {
    id: 'photo-6',
    url: '/photos/spinach-1.jpg',
    thumbnailUrl: '/photos/thumb-spinach-1.jpg',
    cropId: 'crop-6',
    cropName: 'Espinacas',
    capturedAt: '2025-01-13T08:10:00Z',
    aiAnalysis: {
      healthScore: 78,
      growthStage: 'Plántula tardía',
      issues: ['Crecimiento más lento de lo esperado'],
      recommendations: ['Verificar nutrientes del suelo', 'Considerar fertilización con nitrógeno'],
    },
  },
];

export const irrigationHistory: IrrigationEvent[] = [
  {
    id: 'irr-1',
    timestamp: '2025-01-14T06:00:00Z',
    duration: 20,
    waterVolume: 45,
    trigger: 'scheduled',
    zones: ['Zona A'],
  },
  {
    id: 'irr-2',
    timestamp: '2025-01-14T07:30:00Z',
    duration: 15,
    waterVolume: 30,
    trigger: 'ai_decision',
    zones: ['Zona B'],
  },
  {
    id: 'irr-3',
    timestamp: '2025-01-13T18:00:00Z',
    duration: 25,
    waterVolume: 55,
    trigger: 'scheduled',
    zones: ['Zona A', 'Zona B'],
  },
  {
    id: 'irr-4',
    timestamp: '2025-01-13T06:00:00Z',
    duration: 20,
    waterVolume: 45,
    trigger: 'scheduled',
    zones: ['Zona A'],
  },
  {
    id: 'irr-5',
    timestamp: '2025-01-12T18:00:00Z',
    duration: 25,
    waterVolume: 55,
    trigger: 'scheduled',
    zones: ['Zona A', 'Zona B'],
  },
];

// Generate sensor history data for charts
export function generateSensorHistory(hours: number = 24): Record<string, SensorReading[]> {
  const now = new Date();
  const data: Record<string, SensorReading[]> = {
    soilHumidity: [],
    temperature: [],
    airHumidity: [],
    light: [],
  };

  for (let i = hours; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000).toISOString();

    data.soilHumidity.push({
      timestamp,
      value: 55 + Math.sin(i / 4) * 15 + Math.random() * 5,
    });

    data.temperature.push({
      timestamp,
      value: 20 + Math.sin((i - 6) / 4) * 8 + Math.random() * 2,
    });

    data.airHumidity.push({
      timestamp,
      value: 50 + Math.cos(i / 6) * 15 + Math.random() * 5,
    });

    data.light.push({
      timestamp,
      value: i >= 6 && i <= 20
        ? 400 + Math.sin((i - 6) / 4.5) * 500 + Math.random() * 100
        : Math.random() * 50,
    });
  }

  return data;
}

export const dashboardStats: DashboardStats = {
  totalCrops: crops.length,
  healthyPercentage: Math.round(crops.reduce((acc, c) => acc + c.healthScore, 0) / crops.length),
  activeAlerts: alerts.filter(a => !a.isRead).length,
  waterUsageToday: irrigationHistory
    .filter(e => e.timestamp.startsWith('2025-01-14'))
    .reduce((acc, e) => acc + e.waterVolume, 0),
  avgSoilHumidity: 53.5,
  currentTemperature: 24.5,
};
