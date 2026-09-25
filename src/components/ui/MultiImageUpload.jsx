import React, { useRef, useState } from 'react';
import { UploadCloud, X, Loader2, Star } from 'lucide-react';
import { uploadApi, resolveImageUrl } from '../../api/index';

/**
 * Controlled multi-image field. `value` is an array of backend-relative
 * URLs (e.g. ["/uploads/a.jpg", "/uploads/b.jpg"]). Calls onChange(urls)
 * whenever the set changes. The first image in the array is the product's
 * primary/thumbnail image — shown everywhere else in the app (product
 * cards, order rows, etc.) — so images can be reordered to change which
 * one is primary.
 */
export default function MultiImageUpload({ value, onChange, label = 'Product Images', max = 8 }) {
  const images = Array.isArray(value) ? value : [];
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []).slice(0, Math.max(0, max - images.length));
    if (!files.length) return;
    setError('');

    const invalid = files.find(f => !f.type.startsWith('image/'));
    if (invalid) { setError('Please choose image files only'); return; }
    const tooBig = files.find(f => f.size > 5 * 1024 * 1024);
    if (tooBig) { setError('Each image must be under 5MB'); return; }

    setUploading(true);
    try {
      // Upload sequentially rather than Promise.all — keeps failures
      // attributable to a specific file instead of losing the whole batch,
      // and avoids hammering the backend with a burst of concurrent uploads.
      const uploaded = [];
      for (const file of files) {
        const { data } = await uploadApi.file(file);
        uploaded.push(data.url);
      }
      onChange([...images, ...uploaded]);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed — try again');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeAt = (idx) => onChange(images.filter((_, i) => i !== idx));
  const makePrimary = (idx) => {
    if (idx === 0) return;
    const next = [...images];
    const [chosen] = next.splice(idx, 1);
    next.unshift(chosen);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-0">
      <label className="text-[11px] tracking-widest uppercase text-[var(--text-muted)] block mb-1.5">
        {label} {images.length > 0 && <span className="text-[var(--text-ghost)] normal-case">— first image is the main photo</span>}
      </label>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {images.map((url, idx) => {
          const src = resolveImageUrl(url);
          return (
            <div key={url + idx} className="relative aspect-square rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--input-bg)] group">
              {src && <img src={src} alt="" className="w-full h-full object-cover" />}
              {idx === 0 && (
                <div className="absolute top-1.5 left-1.5 bg-[var(--gold)] text-[var(--bg)] text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Star size={9} fill="currentColor" /> Main
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5">
                {idx !== 0 && (
                  <button
                    type="button"
                    onClick={() => makePrimary(idx)}
                    title="Make main photo"
                    className="w-7 h-7 rounded-full bg-white/90 hover:bg-white text-black flex items-center justify-center transition-all"
                  >
                    <Star size={13} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  title="Remove"
                  className="w-7 h-7 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center transition-all"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          );
        })}

        {images.length < max && (
          <div
            onClick={() => !uploading && inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            className="aspect-square rounded-lg border border-dashed border-[var(--border)] hover:border-[var(--gold-dim)] transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 bg-[var(--input-bg)] text-[var(--text-ghost)]"
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            {uploading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <UploadCloud size={20} />
                <span className="text-[10px] text-center px-2">Add {images.length ? 'more' : 'images'}</span>
              </>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-[12px] text-[var(--danger)] mt-2">{error}</p>}
      <p className="text-[11px] text-[var(--text-ghost)] mt-2">Up to {max} images, 5MB each. Click the star on any image to make it the main photo.</p>
    </div>
  );
}