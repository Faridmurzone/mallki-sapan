'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type { Photo, PhotoComment } from '@/types';
import { formatDateTime, cn } from '@/lib/utils';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Check,
  Pencil,
  MessageSquare,
  Send,
  Loader2,
  Sparkles,
  Leaf,
  AlertTriangle,
} from 'lucide-react';

interface Props {
  photo: Photo;
  /** Para el contador "3 de 12" y para saber si hay hacia dónde navegar. */
  index: number;
  total: number;
  onClose: () => void;
  onNavigate: (direccion: 'prev' | 'next') => void;
  /** Avisa a la galería que recargue: cambió un título o se borró una foto. */
  onChanged: () => void;
  onDeleted: () => void;
}

export function PhotoModal({
  photo,
  index,
  total,
  onClose,
  onNavigate,
  onChanged,
  onDeleted,
}: Props) {
  // El título se edita en un buffer aparte: si tecleás mientras entra una foto
  // nueva, el refresco de la galería no te pisa lo que estás escribiendo.
  const [editandoTitulo, setEditandoTitulo] = useState(false);
  const [tituloBuffer, setTituloBuffer] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [comentarios, setComentarios] = useState<PhotoComment[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarComentarios = useCallback(async () => {
    try {
      setComentarios(await apiGet<PhotoComment[]>(`/api/photos/${photo.id}/comments`));
    } catch {
      /* que no se caiga el modal por los comentarios */
    }
  }, [photo.id]);

  // Al cambiar de foto se reinicia todo: si no, quedarías editando el título
  // de una foto con el texto de la anterior.
  useEffect(() => {
    setEditandoTitulo(false);
    setConfirmandoBorrado(false);
    setNuevoComentario('');
    setError(null);
    cargarComentarios();
  }, [photo.id, cargarComentarios]);

  // Escape cierra, flechas navegan. Si estás escribiendo, las flechas son para
  // mover el cursor y no para cambiar de foto.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const escribiendo =
        e.target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA'].includes(e.target.tagName);

      if (e.key === 'Escape') return escribiendo ? undefined : onClose();
      if (escribiendo) return;
      if (e.key === 'ArrowLeft') onNavigate('prev');
      if (e.key === 'ArrowRight') onNavigate('next');
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onNavigate]);

  async function guardarTitulo() {
    setGuardando(true);
    setError(null);
    try {
      await apiPatch(`/api/photos/${photo.id}`, { title: tituloBuffer.trim() || null });
      setEditandoTitulo(false);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el título');
    } finally {
      setGuardando(false);
    }
  }

  async function agregarComentario() {
    const body = nuevoComentario.trim();
    if (!body) return;

    setEnviando(true);
    setError(null);
    try {
      const creado = await apiPost<PhotoComment>(`/api/photos/${photo.id}/comments`, { body });
      setComentarios(prev => [...prev, creado]);
      setNuevoComentario('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo agregar el comentario');
    } finally {
      setEnviando(false);
    }
  }

  async function borrarComentario(id: string) {
    try {
      await apiDelete(`/api/photos/${photo.id}/comments/${id}`);
      setComentarios(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo borrar el comentario');
    }
  }

  async function borrarFoto() {
    setGuardando(true);
    try {
      await apiDelete(`/api/photos/${photo.id}`);
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo borrar la foto');
      setGuardando(false);
    }
  }

  const titulo = photo.title ?? photo.cropName ?? 'Sin título';
  const analisis = photo.aiAnalysis;

  // Qué mostrar cuando todavía no hay análisis. `done` sin análisis no debería
  // pasar, así que no tiene entrada: cae en null y no se muestra nada.
  const ESTADO_ANALISIS: Partial<Record<NonNullable<Photo['analysisStatus']>, string>> = {
    pending: 'En cola para analizar',
    processing: 'Analizando…',
    failed: 'No se pudo analizar',
    skipped: 'Sin analizar',
  };
  const estadoTexto = photo.analysisStatus ? ESTADO_ANALISIS[photo.analysisStatus] : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl lg:flex-row"
      >
        {/* Imagen */}
        <div className="relative flex min-h-[45vh] flex-1 items-center justify-center bg-black lg:min-h-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt={titulo}
            className="max-h-[92vh] w-full object-contain"
          />

          {total > 1 && (
            <>
              <button
                onClick={() => onNavigate('prev')}
                aria-label="Foto anterior"
                className="absolute left-3 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => onNavigate('next')}
                aria-label="Foto siguiente"
                className="absolute right-3 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
                {index + 1} de {total}
              </span>
            </>
          )}
        </div>

        {/* Panel lateral */}
        <div className="flex w-full flex-col lg:w-96">
          <div className="flex items-start justify-between gap-2 border-b border-gray-100 p-4">
            <div className="min-w-0 flex-1">
              {editandoTitulo ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={tituloBuffer}
                    onChange={e => setTituloBuffer(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') guardarTitulo();
                      if (e.key === 'Escape') setEditandoTitulo(false);
                    }}
                    maxLength={120}
                    placeholder="Ponele un título"
                    className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-green-500 focus:outline-none"
                  />
                  <button
                    onClick={guardarTitulo}
                    disabled={guardando}
                    aria-label="Guardar título"
                    className="rounded-lg bg-green-500 p-1.5 text-white hover:bg-green-600 disabled:opacity-50"
                  >
                    {guardando ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setTituloBuffer(photo.title ?? '');
                    setEditandoTitulo(true);
                  }}
                  className="group flex items-center gap-2 text-left"
                >
                  <span
                    className={cn(
                      'truncate font-semibold',
                      photo.title ? 'text-gray-900' : 'text-gray-400 italic'
                    )}
                  >
                    {titulo}
                  </span>
                  <Pencil className="h-3.5 w-3.5 flex-none text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              )}

              <p className="mt-1 text-xs text-gray-500">
                {formatDateTime(photo.capturedAt)}
                {photo.width ? ` · ${photo.width}×${photo.height}` : ''}
                {photo.cameraId ? ` · ${photo.cameraId}` : ''}
              </p>
            </div>

            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="flex-none rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {/* Análisis de IA */}
          {(analisis || estadoTexto) && (
            <div className="max-h-64 flex-none overflow-y-auto border-b border-gray-100 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Análisis de IA
              </div>

              {analisis ? (
                <div className="mt-3 space-y-3">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-gray-500">Salud</span>
                      <span className="font-semibold text-gray-900">
                        {analisis.healthScore}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          analisis.healthScore >= 90
                            ? 'bg-green-500'
                            : analisis.healthScore >= 75
                              ? 'bg-yellow-500'
                              : analisis.healthScore >= 50
                                ? 'bg-orange-500'
                                : 'bg-red-500'
                        )}
                        style={{ width: `${analisis.healthScore}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
                    <Leaf className="h-4 w-4 flex-none text-blue-500" />
                    <span className="text-sm text-blue-800">{analisis.growthStage}</span>
                  </div>

                  {analisis.issues.length > 0 && (
                    <ul className="space-y-1">
                      {analisis.issues.map((issue, i) => (
                        <li key={i} className="flex gap-2 text-sm text-amber-800">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-amber-500" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  )}

                  {analisis.recommendations.length > 0 && (
                    <ul className="space-y-1 border-t border-gray-100 pt-2">
                      {analisis.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-gray-600">
                          · {rec}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500">
                  {estadoTexto}
                  {photo.analysisError && (
                    <span className="mt-1 block text-xs text-gray-400">
                      {photo.analysisError}
                    </span>
                  )}
                </p>
              )}
            </div>
          )}

          {/* Comentarios */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-2 px-4 pt-4 text-sm font-medium text-gray-700">
              <MessageSquare className="h-4 w-4" />
              Comentarios ({comentarios.length})
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
              {comentarios.length === 0 && (
                <p className="py-6 text-center text-sm text-gray-400">
                  Todavía no hay comentarios.
                </p>
              )}

              {comentarios.map(c => (
                <div key={c.id} className="group rounded-lg bg-gray-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="whitespace-pre-wrap break-words text-sm text-gray-800">
                      {c.body}
                    </p>
                    <button
                      onClick={() => borrarComentario(c.id)}
                      aria-label="Borrar comentario"
                      className="flex-none rounded p-1 text-gray-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {c.author ? `${c.author} · ` : ''}
                    {formatDateTime(c.createdAt)}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 p-3">
              <div className="flex gap-2">
                <textarea
                  value={nuevoComentario}
                  onChange={e => setNuevoComentario(e.target.value)}
                  onKeyDown={e => {
                    // Enter envía; Shift+Enter hace salto de línea.
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      agregarComentario();
                    }
                  }}
                  rows={2}
                  maxLength={2000}
                  placeholder="Escribí una nota sobre esta foto…"
                  className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                />
                <button
                  onClick={agregarComentario}
                  disabled={enviando || !nuevoComentario.trim()}
                  aria-label="Agregar comentario"
                  className="flex-none self-end rounded-lg bg-green-500 p-2 text-white hover:bg-green-600 disabled:opacity-40"
                >
                  {enviando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Borrar la foto */}
          <div className="border-t border-gray-100 p-3">
            {confirmandoBorrado ? (
              <div className="flex items-center gap-2">
                <span className="flex-1 text-sm text-gray-700">
                  ¿Borrar esta foto? No se puede deshacer.
                </span>
                <button
                  onClick={() => setConfirmandoBorrado(false)}
                  className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={borrarFoto}
                  disabled={guardando}
                  className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
                >
                  {guardando ? 'Borrando…' : 'Borrar'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmandoBorrado(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Borrar foto
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
