import React from 'react';
import { resolveImageUrl } from '../../api/index';

export default function ProductThumb({ product, className = 'w-9 h-9 rounded-md' }) {
  const src = resolveImageUrl(product?.imageUrl);
  if (src) {
    return (
      <img
        src={src}
        alt={product?.name || ''}
        className={`${className} object-cover flex-shrink-0`}
        onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling && (e.currentTarget.nextSibling.style.display = 'block'); }}
      />
    );
  }
  return <div className={`${className} flex-shrink-0`} style={{ background: product?.pattern || 'linear-gradient(135deg,#1a1a1a,#333)' }} />;
}
