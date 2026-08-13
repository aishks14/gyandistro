import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Ad, AdPlacement } from '../types';

/**
 * Asks the API for one live creative in this slot. If there is nothing to
 * show, the component renders nothing at all rather than leaving a hole.
 *
 * The label above every unit is deliberate: readers should always be able to
 * tell paid placement from editorial.
 */
export default function AdSlot({
  placement,
  label = 'Advertisement'
}: {
  placement: AdPlacement;
  label?: string;
}) {
  const [ad, setAd] = useState<Ad | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Ad | null>(`/ads/serve/${placement}`)
      .then((res) => {
        if (!cancelled) setAd(res.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setAd(null);
      });
    return () => {
      cancelled = true;
    };
  }, [placement]);

  if (!ad) return null;

  const registerClick = () => {
    void api.post(`/ads/${ad._id}/click`);
  };

  return (
    <div className="ad-slot" data-placement={placement}>
      <div className="ad-slot-label">{label}</div>
      <div className="ad-slot-body">
        {ad.kind === 'html' && ad.html ? (
          // House creatives and network snippets are authored by admins only.
          <div dangerouslySetInnerHTML={{ __html: ad.html }} />
        ) : ad.imageUrl ? (
          <a
            href={ad.targetUrl || '#'}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={registerClick}
          >
            <img src={ad.imageUrl} alt={ad.name} loading="lazy" />
          </a>
        ) : null}
      </div>
    </div>
  );
}
