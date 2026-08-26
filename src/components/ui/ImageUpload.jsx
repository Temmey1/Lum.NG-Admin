import React, { useRef, useState } from 'react';
import { UploadCloud, X, Loader2 } from 'lucide-react';
import { uploadApi, resolveImageUrl } from '../../api/index';

/**
 * Controlled image-upload field. `value` is a backend-relative URL (e.g.
 * "/uploads/xyz.jpg") or null. Calls onChange(url) once the upload
 * completes. Shows the actual uploaded image as a live preview — this is
 * the "default uploads should be images as view" behavior: as soon as a
 * file is picked, it's uploaded and shown, not just referenced by name.
 */
export default function ImageUpload({ value, onChange, label = 'Product Image', height = 'h-44' }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const preview = resolveImageUrl(value);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return; }
    setError('');
    setUploading(true);
    try {
      const { data } = await uploadApi.file(file);
      onChange(data.url);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed — try again');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-0">
      <label className="text-[11px] tracking-widest uppercase text-[var(--text-muted)] block mb-1.5">{label}</label>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
        className={`relative ${height} rounded-lg border border-dashed border-[var(--border)] hover:border-[var(--gold-dim)] transition-all cursor-pointer overflow-hidden bg-[var(--input-bg)] flex items-center justify-center group`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {preview ? (
          <>
            <img src={preview} alt="Product preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
              <span className="text-white text-[12px] uppercase tracking-wider flex items-center gap-1.5"><UploadCloud size={14}/> Replace</span>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all"
              title="Remove image"
            >
              <X size={14}/>
            </button>
          </>
        ) : uploading ? (
          <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
            <Loader2 size={22} className="animate-spin" />
            <span className="text-[12px]">Uploading…</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-[var(--text-ghost)]">
            <UploadCloud size={22} />
            <span className="text-[12px] text-center px-4">Click or drag an image here<br/>PNG, JPG, WebP — up to 5MB</span>
          </div>
        )}
      </div>
      {error && <p className="text-[12px] text-[var(--danger)] mt-1.5">{error}</p>}
    </div>
  );
}
