import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crop, Maximize2, X, Check } from 'lucide-react';

interface Props {
  imageSrc: string;
  onCrop: (blob: Blob) => void;
  onCancel: () => void;
}

type DragMode = 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br' | null;

export default function ImageCropper({ imageSrc, onCrop, onCancel }: Props) {
  const [mode, setMode] = useState<'manual' | 'auto'>('auto');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [box, setBox] = useState({ x: 60, y: 40, size: 180 });
  const [imageLoaded, setImageLoaded] = useState(false);

  // Simpan state drag di ref supaya tidak stale di pointer events
  const dragRef = useRef<{
    mode: DragMode;
    startX: number; startY: number;
    origBox: { x: number; y: number; size: number };
  }>({ mode: null, startX: 0, startY: 0, origBox: { x: 0, y: 0, size: 0 } });

  const MIN_SIZE = 60;

  // Posisikan crop box di tengah saat gambar load
  useEffect(() => {
    if (!imageLoaded || !containerRef.current) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const size = Math.round(Math.min(cw, ch) * 0.65);
    setBox({ x: Math.round((cw - size) / 2), y: Math.round((ch - size) / 2), size });
  }, [imageLoaded, mode]);

  /* ─── Pointer handlers ─── */
  const startDrag = (e: React.PointerEvent, dragMode: DragMode) => {
    if (mode !== 'manual') return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      mode: dragMode,
      startX: e.clientX,
      startY: e.clientY,
      origBox: { ...box },
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const { mode: dm, startX, startY, origBox } = dragRef.current;
    if (!dm || !containerRef.current) return;

    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    setBox(prev => {
      let { x, y, size } = origBox;

      if (dm === 'move') {
        x = Math.max(0, Math.min(origBox.x + dx, cw - size));
        y = Math.max(0, Math.min(origBox.y + dy, ch - size));
        return { x, y, size };
      }

      // Resize — ubah ukuran kotak dari sudut yang di-drag
      // Gunakan delta rata-rata supaya tetap persegi
      const delta = Math.round((dx + dy) / 2);

      if (dm === 'resize-br') {
        size = Math.max(MIN_SIZE, Math.min(origBox.size + delta, cw - origBox.x, ch - origBox.y));
        return { x: origBox.x, y: origBox.y, size };
      }
      if (dm === 'resize-tl') {
        const newSize = Math.max(MIN_SIZE, origBox.size - delta);
        const maxSize = Math.min(origBox.x + origBox.size, origBox.y + origBox.size);
        size = Math.min(newSize, maxSize);
        x = origBox.x + origBox.size - size;
        y = origBox.y + origBox.size - size;
        return { x, y, size };
      }
      if (dm === 'resize-tr') {
        const d2 = Math.round((dx - dy) / 2);
        size = Math.max(MIN_SIZE, Math.min(origBox.size + d2, cw - origBox.x, origBox.y + origBox.size));
        y = origBox.y + origBox.size - size;
        return { x: origBox.x, y, size };
      }
      if (dm === 'resize-bl') {
        const d2 = Math.round((-dx + dy) / 2);
        size = Math.max(MIN_SIZE, Math.min(origBox.size + d2, origBox.x + origBox.size, ch - origBox.y));
        x = origBox.x + origBox.size - size;
        return { x, y: origBox.y, size };
      }
      return prev;
    });
  };

  const onPointerUp = () => { dragRef.current.mode = null; };

  /* ─── Konfirmasi crop ─── */
  const handleConfirm = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const container = containerRef.current;
    if (!canvas || !img || !container) return;

    const OUTPUT = 512;
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext('2d')!;

    if (mode === 'manual') {
      const imgRect = img.getBoundingClientRect();
      const contRect = container.getBoundingClientRect();
      const imgLeft = imgRect.left - contRect.left;
      const imgTop  = imgRect.top  - contRect.top;
      const scaleX  = img.naturalWidth  / imgRect.width;
      const scaleY  = img.naturalHeight / imgRect.height;

      const srcX    = (box.x - imgLeft) * scaleX;
      const srcY    = (box.y - imgTop)  * scaleY;
      const srcW    = box.size * scaleX;
      const srcH    = box.size * scaleY;

      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, OUTPUT, OUTPUT);
    } else {
      // Auto: letterbox-fit ke persegi dengan background gelap
      ctx.fillStyle = '#0a0010';
      ctx.fillRect(0, 0, OUTPUT, OUTPUT);
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      if (nw >= nh) {
        const drawH = Math.round(OUTPUT * (nh / nw));
        ctx.drawImage(img, 0, Math.round((OUTPUT - drawH) / 2), OUTPUT, drawH);
      } else {
        const drawW = Math.round(OUTPUT * (nw / nh));
        ctx.drawImage(img, Math.round((OUTPUT - drawW) / 2), 0, drawW, OUTPUT);
      }
    }

    canvas.toBlob(blob => { if (blob) onCrop(blob); }, 'image/jpeg', 0.92);
  };

  /* ─── Handle sudut resize ─── */
  const Corner = ({ dragMode, cls }: { dragMode: DragMode; cls: string }) => (
    <div
      className={`absolute w-4 h-4 bg-white rounded-sm shadow-[0_0_6px_rgba(168,85,247,1)] border-2 border-purple-500 z-10 ${cls}`}
      style={{ cursor: dragMode === 'resize-tl' ? 'nw-resize' : dragMode === 'resize-tr' ? 'ne-resize' : dragMode === 'resize-bl' ? 'sw-resize' : 'se-resize' }}
      onPointerDown={e => startDrag(e, dragMode)}
    />
  );

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#12001f] border border-purple-500/30 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(147,51,234,0.3)]">

        {/* Header */}
        <div className="p-4 border-b border-purple-500/20 flex items-center justify-between">
          <h3 className="text-white font-bold">Crop Gambar</h3>
          <div className="flex gap-2">
            {([['auto', Maximize2, 'Auto'] as const, ['manual', Crop, 'Manual'] as const]).map(([m, Icon, label]) => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  mode === m
                    ? 'bg-purple-500/30 text-purple-300 shadow-[0_0_8px_rgba(147,51,234,0.4)]'
                    : 'text-purple-300/50 hover:text-purple-300'
                }`}>
                <Icon size={13} />{label}
              </button>
            ))}
          </div>
        </div>

        {/* Area gambar */}
        <div
          ref={containerRef}
          className="relative bg-[#050008] select-none overflow-hidden"
          style={{ height: 300 }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {/* Gambar asli */}
          <img
            ref={imgRef}
            src={imageSrc}
            alt="preview"
            onLoad={() => setImageLoaded(true)}
            className="absolute inset-0 m-auto max-w-full max-h-full object-contain pointer-events-none"
            style={{ top: 0, left: 0, right: 0, bottom: 0 }}
            draggable={false}
          />

          {/* ── Mode Manual ── */}
          {mode === 'manual' && imageLoaded && (
            <>
              {/* Overlay gelap (4 strip di luar crop box) */}
              <div className="absolute bg-black/60 pointer-events-none"
                style={{ top: 0, left: 0, right: 0, height: box.y }} />
              <div className="absolute bg-black/60 pointer-events-none"
                style={{ top: box.y + box.size, left: 0, right: 0, bottom: 0 }} />
              <div className="absolute bg-black/60 pointer-events-none"
                style={{ top: box.y, left: 0, width: box.x, height: box.size }} />
              <div className="absolute bg-black/60 pointer-events-none"
                style={{ top: box.y, left: box.x + box.size, right: 0, height: box.size }} />

              {/* Crop box — bisa digeser */}
              <div
                className="absolute border-2 border-purple-400 cursor-move touch-none"
                style={{
                  left: box.x, top: box.y,
                  width: box.size, height: box.size,
                  boxShadow: '0 0 0 1px rgba(168,85,247,0.3)',
                }}
                onPointerDown={e => startDrag(e, 'move')}
              >
                {/* Grid rule-of-thirds */}
                <div className="absolute inset-0 pointer-events-none"
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr' }}>
                  {[...Array(9)].map((_, i) => <div key={i} className="border border-white/10" />)}
                </div>
              </div>

              {/* Sudut resize — di luar crop box supaya pointer events tidak bentrok */}
              <Corner dragMode="resize-tl" cls={`-translate-x-1/2 -translate-y-1/2`}
                {...{ style: { left: box.x, top: box.y, position: 'absolute' } } as any}
              />
              {/* Karena JSX tidak bisa style di sini, pakai div langsung */}
              <div className="absolute w-4 h-4 bg-white rounded-sm shadow-[0_0_6px_rgba(168,85,247,1)] border-2 border-purple-500 cursor-nw-resize touch-none"
                style={{ left: box.x - 8, top: box.y - 8 }}
                onPointerDown={e => startDrag(e, 'resize-tl')} />
              <div className="absolute w-4 h-4 bg-white rounded-sm shadow-[0_0_6px_rgba(168,85,247,1)] border-2 border-purple-500 cursor-ne-resize touch-none"
                style={{ left: box.x + box.size - 8, top: box.y - 8 }}
                onPointerDown={e => startDrag(e, 'resize-tr')} />
              <div className="absolute w-4 h-4 bg-white rounded-sm shadow-[0_0_6px_rgba(168,85,247,1)] border-2 border-purple-500 cursor-sw-resize touch-none"
                style={{ left: box.x - 8, top: box.y + box.size - 8 }}
                onPointerDown={e => startDrag(e, 'resize-bl')} />
              <div className="absolute w-4 h-4 bg-white rounded-sm shadow-[0_0_6px_rgba(168,85,247,1)] border-2 border-purple-500 cursor-se-resize touch-none"
                style={{ left: box.x + box.size - 8, top: box.y + box.size - 8 }}
                onPointerDown={e => startDrag(e, 'resize-br')} />
            </>
          )}

          {/* ── Mode Auto ── */}
          {mode === 'auto' && imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-dashed border-purple-400/50 flex items-center justify-center"
                style={{ width: '65%', height: '65%' }}>
                <span className="text-purple-300/50 text-xs bg-black/50 px-2 py-1 rounded">Hasil Persegi</span>
              </div>
            </div>
          )}
        </div>

        {/* Keterangan */}
        <p className="text-center text-purple-300/40 text-xs py-2 px-4">
          {mode === 'auto'
            ? '✦ Gambar difit otomatis menjadi persegi (tidak dipotong)'
            : '✦ Geser kotak untuk pindah · Seret sudut putih untuk resize'}
        </p>

        {/* Tombol */}
        <div className="p-4 flex gap-3 border-t border-purple-500/10">
          <button onClick={onCancel}
            className="flex-1 py-2.5 border border-purple-500/30 rounded-xl text-purple-300/70 hover:text-purple-300 transition-colors flex items-center justify-center gap-2">
            <X size={16} /> Batal
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleConfirm}
            className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(147,51,234,0.4)]"
          >
            <Check size={16} /> Konfirmasi
          </motion.button>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
