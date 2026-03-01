'use client';

import { useEffect, useState } from 'react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export function SrMap({ address }: { address: string }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !address) return;

    let cancelled = false;

    async function geocode() {
      try {
        const encoded = encodeURIComponent(address);
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${MAPBOX_TOKEN}&limit=1`,
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const feature = data.features?.[0];
        if (!feature || cancelled) return;

        const [lng, lat] = feature.center as [number, number];
        const url =
          `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/` +
          `pin-s+1D3171(${lng},${lat})/${lng},${lat},14,0/` +
          `600x200@2x?access_token=${MAPBOX_TOKEN}`;
        setImgUrl(url);
      } catch (err) {
        console.warn('[SrMap] Geocoding failed:', err);
      }
    }

    geocode();
    return () => { cancelled = true; };
  }, [address]);

  if (!MAPBOX_TOKEN || !address || !imgUrl) return null;

  return (
    <img
      src={imgUrl}
      alt={`Map of ${address}`}
      className="block h-40 w-full object-cover"
    />
  );
}
