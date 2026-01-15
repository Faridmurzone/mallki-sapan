import type {
  Sensor,
  Crop,
  Alert,
  Photo,
  IrrigationEvent,
  SensorReading,
  DashboardStats,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || `Error ${res.status}`);
  }

  return res.json();
}

// =====================================
// DASHBOARD
// =====================================

export async function getDashboardStats(): Promise<DashboardStats> {
  return fetchAPI<DashboardStats>('/dashboard/stats');
}

export async function getSensorHistory(hours = 24): Promise<Record<string, SensorReading[]>> {
  return fetchAPI<Record<string, SensorReading[]>>(`/dashboard/sensor-history?hours=${hours}`);
}

export async function getRecentActivity(): Promise<{
  alerts: Alert[];
  irrigation: IrrigationEvent[];
  photos: Photo[];
}> {
  return fetchAPI('/dashboard/recent-activity');
}

// =====================================
// SENSORES
// =====================================

export async function getSensors(): Promise<Sensor[]> {
  return fetchAPI<Sensor[]>('/sensors');
}

export async function getSensor(id: string): Promise<Sensor> {
  return fetchAPI<Sensor>(`/sensors/${id}`);
}

export async function getSensorReadings(id: string, hours = 24): Promise<SensorReading[]> {
  return fetchAPI<SensorReading[]>(`/sensors/${id}/readings?hours=${hours}`);
}

export async function createSensorReading(sensorId: string, value: number): Promise<void> {
  await fetchAPI(`/sensors/${sensorId}/readings`, {
    method: 'POST',
    body: JSON.stringify({ value }),
  });
}

// =====================================
// CULTIVOS
// =====================================

export async function getCrops(): Promise<Crop[]> {
  return fetchAPI<Crop[]>('/crops');
}

export async function getCrop(id: string): Promise<Crop & { sensors: Sensor[]; alerts: Alert[] }> {
  return fetchAPI(`/crops/${id}`);
}

export async function createCrop(data: Omit<Crop, 'id'>): Promise<Crop> {
  return fetchAPI<Crop>('/crops', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCrop(id: string, data: Partial<Crop>): Promise<Crop> {
  return fetchAPI<Crop>(`/crops/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCrop(id: string): Promise<void> {
  await fetchAPI(`/crops/${id}`, { method: 'DELETE' });
}

// =====================================
// ALERTAS
// =====================================

interface AlertFilters {
  severity?: string;
  type?: string;
  unreadOnly?: boolean;
}

export async function getAlerts(filters?: AlertFilters): Promise<Alert[]> {
  const params = new URLSearchParams();
  if (filters?.severity) params.set('severity', filters.severity);
  if (filters?.type) params.set('type', filters.type);
  if (filters?.unreadOnly) params.set('unreadOnly', 'true');

  const query = params.toString();
  return fetchAPI<Alert[]>(`/alerts${query ? `?${query}` : ''}`);
}

export async function getAlert(id: string): Promise<Alert> {
  return fetchAPI<Alert>(`/alerts/${id}`);
}

export async function markAlertAsRead(id: string): Promise<void> {
  await fetchAPI(`/alerts/${id}/read`, { method: 'PATCH' });
}

export async function markAllAlertsAsRead(): Promise<void> {
  await fetchAPI('/alerts/read-all', { method: 'PATCH' });
}

export async function deleteAlert(id: string): Promise<void> {
  await fetchAPI(`/alerts/${id}`, { method: 'DELETE' });
}

// =====================================
// FOTOS
// =====================================

export async function getPhotos(cropId?: string): Promise<Photo[]> {
  const query = cropId ? `?cropId=${cropId}` : '';
  return fetchAPI<Photo[]>(`/photos${query}`);
}

export async function getPhoto(id: string): Promise<Photo> {
  return fetchAPI<Photo>(`/photos/${id}`);
}

export async function deletePhoto(id: string): Promise<void> {
  await fetchAPI(`/photos/${id}`, { method: 'DELETE' });
}

// =====================================
// RIEGO
// =====================================

export interface IrrigationZone {
  id: string;
  name: string;
  isActive: boolean;
}

export async function getIrrigationZones(): Promise<IrrigationZone[]> {
  return fetchAPI<IrrigationZone[]>('/irrigation/zones');
}

export async function getIrrigationEvents(days = 7): Promise<IrrigationEvent[]> {
  return fetchAPI<IrrigationEvent[]>(`/irrigation/events?days=${days}`);
}

export async function startIrrigation(zoneIds: string[], duration: number): Promise<IrrigationEvent> {
  return fetchAPI<IrrigationEvent>('/irrigation/start', {
    method: 'POST',
    body: JSON.stringify({ zoneIds, duration }),
  });
}

export async function stopIrrigation(eventId: string): Promise<void> {
  await fetchAPI('/irrigation/stop', {
    method: 'POST',
    body: JSON.stringify({ eventId }),
  });
}

export async function getIrrigationStats(): Promise<{
  todayUsage: number;
  weekUsage: number;
  avgDailyUsage: number;
  eventsByTrigger: Record<string, number>;
}> {
  return fetchAPI('/irrigation/stats');
}
