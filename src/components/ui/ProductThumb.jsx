import React from 'react';
import { resolveImageUrl } from '../../api/index';

// `overrideUrl`: shows this specific image instead of the product's default
// — used for order line items where the customer selected a particular
// gallery photo on the storefront (OrderItem.selectedImage).
export default function ProductThumb({ product, overrideUrl = null, className = 'w-9 h-9 rounded-md' }) {
  const src = resolveImageUrl(overrideUrl || product?.images?.[0] || product?.imageUrl);
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