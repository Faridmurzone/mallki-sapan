'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { apiGet } from '@/lib/api';
import { PhotoModal } from '@/components/gallery/photo-modal';
import type { Photo } from '@/types';
import { formatDateTime, getHealthColor, cn } from '@/lib/utils';
import {
  Camera,
  Leaf,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  ZoomIn,
  Image as ImageIcon,
} from 'lucide-react';

export default function GaleriaPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setPhotos(await apiGet<Photo[]>('/api/photos'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las fotos');
    } finally {
      setCargando(false);
    }
  }, []);

  // La cámara sube una foto por minuto: refrescamos con esa cadencia para que
  // la galería se mantenga al día sin recargar la página.
  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 60_000);
    return () => clearInterval(id);
  }, [cargar]);

  const activePhoto = selectedPhoto ? photos.find(p => p.id === selectedPhoto) : null;
  const lightboxIndex = lightboxPhoto ? photos.findIndex(p => p.id === lightboxPhoto) : -1;
  const lightboxPhotoData = lightboxIndex >= 0 ? photos[lightboxIndex] : null;

  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (lightboxIndex < 0 || photos.length === 0) return;
    const next =
      direction === 'prev'
        ? (lightboxIndex - 1 + photos.length) % photos.length
        : (lightboxIndex + 1) % photos.length;
    setLightboxPhoto(photos[next].id);
  };

  // Tras borrar: cerramos el modal y recargamos, porque la lista cambió de
  // largo y el índice que teníamos ya no apunta a lo mismo.
  const alBorrar = () => {
    setLightboxPhoto(null);
    setSelectedPhoto(null);
    cargar();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Galería</h1>
          <p className="text-gray-500">Fotos que suben las cámaras, con análisis de IA</p>
        </div>
        <button
          onClick={cargar}
          className="flex items-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-white font-medium hover:bg-purple-600 transition-colors"
        >
          <Camera className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Photo grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Todas las Fotos ({photos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cargando && (
                <p className="py-8 text-center text-gray-500">Cargando fotos…</p>
              )}

              {error && !cargando && (
                <p className="py-8 text-center text-red-600">{error}</p>
              )}

              {!cargando && !error && photos.length === 0 && (
                <div className="py-12 text-center">
                  <ImageIcon className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                  <p className="text-gray-500">Todavía no llegó ninguna foto.</p>
                  <p className="mt-1 text-sm text-gray-400">
                    Las cámaras suben una imagen cada pocos minutos.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    onClick={() => {
                      setSelectedPhoto(photo.id);
                      setLightboxPhoto(photo.id);
                    }}
                    className={cn(
                      'relative group cursor-pointer rounded-xl overflow-hidden aspect-square bg-gradient-to-br from-green-100 to-green-200 border-2 transition-all',
                      selectedPhoto === photo.id
                        ? 'border-green-500 ring-2 ring-green-500/20'
                        : 'border-transparent hover:border-green-300'
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.cropName ?? 'Foto de la huerta'}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                    />

                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxPhoto(photo.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-white/90 p-2"
                      >
                        <ZoomIn className="h-5 w-5 text-gray-700" />
                      </button>
                    </div>

                    {/* Health indicator */}
                    {photo.aiAnalysis && (
                      <div className={cn(
                        'absolute top-2 right-2 rounded-full px-2 py-0.5 text-xs font-medium',
                        photo.aiAnalysis.healthScore >= 90 ? 'bg-green-500 text-white' :
                        photo.aiAnalysis.healthScore >= 75 ? 'bg-yellow-500 text-white' :
                        'bg-orange-500 text-white'
                      )}>
                        {photo.aiAnalysis.healthScore}%
                      </div>
                    )}

                    {/* Crop name */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <p className="text-white text-sm font-medium truncate">{photo.title ?? photo.cropName ?? 'Sin título'}</p>
                      <p className="text-white/70 text-xs">
                        {new Date(photo.capturedAt).toLocaleDateString('es-AR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Photo analysis */}
        <div>
          {activePhoto && activePhoto.aiAnalysis ? (
            <Card>
              <CardHeader className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-t-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-white">Análisis IA</CardTitle>
                    <p className="text-purple-100 text-sm">{activePhoto.cropName ?? 'Sin cultivo asignado'}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {/* Health score */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Puntuación de salud</span>
                    <span className={cn('text-lg font-bold', getHealthColor(activePhoto.aiAnalysis.healthScore))}>
                      {activePhoto.aiAnalysis.healthScore}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        activePhoto.aiAnalysis.healthScore >= 90 ? 'bg-green-500' :
                        activePhoto.aiAnalysis.healthScore >= 75 ? 'bg-yellow-500' :
                        activePhoto.aiAnalysis.healthScore >= 50 ? 'bg-orange-500' : 'bg-red-500'
                      )}
                      style={{ width: `${activePhoto.aiAnalysis.healthScore}%` }}
                    />
                  </div>
                </div>

                {/* Growth stage */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50">
                  <Leaf className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-xs text-blue-600">Etapa de crecimiento</p>
                    <p className="text-sm font-medium text-blue-800">
                      {activePhoto.aiAnalysis.growthStage}
                    </p>
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Capturada</p>
                    <p className="text-sm font-medium text-gray-700">
                      {formatDateTime(activePhoto.capturedAt)}
                    </p>
                  </div>
                </div>

                {/* Issues */}
                {activePhoto.aiAnalysis.issues.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      Problemas detectados
                    </h4>
                    <ul className="space-y-2">
                      {activePhoto.aiAnalysis.issues.map((issue, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 p-2 rounded-lg bg-orange-50 text-sm text-orange-800"
                        >
                          <span className="text-orange-500 mt-0.5">•</span>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <p className="text-sm text-green-700">No se detectaron problemas</p>
                  </div>
                )}

                {/* Recommendations */}
                {activePhoto.aiAnalysis.recommendations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      Recomendaciones
                    </h4>
                    <ul className="space-y-2">
                      {activePhoto.aiAnalysis.recommendations.map((rec, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 p-2 rounded-lg bg-purple-50 text-sm text-purple-800"
                        >
                          <span className="text-purple-500 mt-0.5">→</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="h-96 flex items-center justify-center">
              <CardContent className="text-center">
                <Camera className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Selecciona una foto para ver el análisis de IA</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {lightboxPhotoData && (
        <PhotoModal
          photo={lightboxPhotoData}
          index={lightboxIndex}
          total={photos.length}
          onClose={() => setLightboxPhoto(null)}
          onNavigate={navigateLightbox}
          onChanged={cargar}
          onDeleted={alBorrar}
        />
      )}

    </div>
  );
}
