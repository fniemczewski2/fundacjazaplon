import React from 'react';

export default function Loader({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center w-full py-12">
      <div
        className="animate-spin rounded-full border-4 border-brand border-t-transparent"
        style={{ width: size, height: size }}
        role="status"
        aria-label="Wczytywanie…"
      />
    </div>
  );
}
