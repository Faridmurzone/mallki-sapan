'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { photos } from '@/lib/mock-data';
import { formatDateTime, getHealthColor, cn } from '@/lib/utils';
import {
  Camera,
  Leaf,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  X,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from 'lucide-react';

export default function GaleriaPage() {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  const activePhoto = selectedPhoto ? photos.find(p => p.id === selectedPhoto) : null;
  const lightboxPhotoData = lightboxPhoto ? photos.find(p => p.id === lightboxPhoto) : null;

  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (!lightboxPhoto) return;
    const currentIndex = photos.findIndex(p => p.id === lightboxPhoto);
    let newIndex: number;
    if (direction === 'prev') {
      newIndex = currentIndex === 0 ? photos.length - 1 : currentIndex - 1;
    } else {
      newIndex = currentIndex === photos.length - 1 ? 0 : currentIndex + 1;
    }
    setLightboxPhoto(photos[newIndex].id);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Galería</h1>
          <p className="text-gray-500">Fotos de tus cultivos con análisis de IA</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-white font-medium hover:bg-purple-600 transition-colors">
          <Camera className="h-4 w-4" />
          Capturar Foto
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    onClick={() => setSelectedPhoto(photo.id)}
                    className={cn(
                      'relative group cursor-pointer rounded-xl overflow-hidden aspect-square bg-gradient-to-br from-green-100 to-green-200 border-2 transition-all',
                      selectedPhoto === photo.id
                        ? 'border-green-500 ring-2 ring-green-500/20'
                        : 'border-transparent hover:border-green-300'
                    )}
                  >
                    {/* Placeholder for actual image */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Leaf className="h-12 w-12 text-green-400" />
                    </div>

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
                      <p className="text-white text-sm font-medium truncate">{photo.cropName}</p>
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
                    <p className="text-purple-100 text-sm">{activePhoto.cropName}</p>
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

      {/* Lightbox */}
      {lightboxPhotoData && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              navigateLightbox('prev');
            }}
            className="absolute left-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl max-h-[80vh] rounded-2xl overflow-hidden bg-gradient-to-br from-green-200 to-green-300 aspect-video flex items-center justify-center"
          >
            <Leaf className="h-32 w-32 text-green-500" />
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              navigateLightbox('next');
            }}
            className="absolute right-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Photo info */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm rounded-xl px-6 py-3 text-white">
            <p className="font-medium">{lightboxPhotoData.cropName}</p>
            <p className="text-sm text-white/70">
              {formatDateTime(lightboxPhotoData.capturedAt)}
              {lightboxPhotoData.aiAnalysis && ` • Salud: ${lightboxPhotoData.aiAnalysis.healthScore}%`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
