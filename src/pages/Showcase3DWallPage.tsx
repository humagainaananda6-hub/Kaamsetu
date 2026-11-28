import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Box,
  ImagePlus,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { apiFetch } from '../lib/api';
import {
  classifySwipeDelta,
  computeTileDepthStyle,
  computeWallStageTransform,
  getActiveTileIndex,
  getTileGridCoords,
  stepWallPosition,
  WALL_COLUMNS,
  type WallPosition,
} from '../lib/showcase-wall';
import { PublicNavbar } from '../components/ui/Navigation';
import { VerificationBadge } from '../components/ui/Badges';
import { ConfirmationModal } from '../components/ui/CommonUI';
import type { CertificateRecord } from './CertificateVerificationPage';

interface ShowcaseTile {
  id: string;
  title: string;
  subtitle: string;
  badgeText: string;
  verified: boolean;
  imageUrl?: string | null;
  gradient: string;
  certRecord?: CertificateRecord;
}

const TALENT_TILES: Omit<ShowcaseTile, 'id'>[] = [
  {
    title: 'Aarav Sharma',
    subtitle: 'Frontend Developer · Kathmandu',
    badgeText: 'KBN Verified Profile',
    verified: true,
    gradient: 'linear-gradient(135deg, #16C784, #3B82F6)',
  },
  {
    title: 'Sita Gurung',
    subtitle: 'Graphic Designer · Pokhara',
    badgeText: 'Verified Portfolio',
    verified: true,
    gradient: 'linear-gradient(135deg, #F472B6, #3B82F6)',
  },
  {
    title: 'Rojan Tamang',
    subtitle: 'Event Photographer · Lalitpur',
    badgeText: 'Local Gig Pro',
    verified: true,
    gradient: 'linear-gradient(135deg, #F59E0B, #EF4444)',
  },
  {
    title: 'Mina Rai',
    subtitle: 'Accounts & Tally Specialist · Biratnagar',
    badgeText: 'TU B.Com Verified',
    verified: true,
    gradient: 'linear-gradient(135deg, #16C784, #F59E0B)',
  },
  {
    title: 'Bikash KC',
    subtitle: 'CTEVT Electrical Technician · Butwal',
    badgeText: 'CTEVT Certified',
    verified: true,
    gradient: 'linear-gradient(135deg, #3B82F6, #16C784)',
  },
  {
    title: 'Pratima Joshi',
    subtitle: 'SEE & +2 Mathematics Tutor · Chitwan',
    badgeText: 'KBN Educator',
    verified: true,
    gradient: 'linear-gradient(135deg, #A78BFA, #F472B6)',
  },
  {
    title: 'Suman Magar',
    subtitle: 'Video Editor & Motion · Remote',
    badgeText: 'Freelance Ready',
    verified: false,
    gradient: 'linear-gradient(135deg, #EF4444, #F59E0B)',
  },
  {
    title: 'Kriti Shrestha',
    subtitle: 'Digital Marketer · Kathmandu',
    badgeText: 'Verified Profile',
    verified: true,
    gradient: 'linear-gradient(135deg, #3B82F6, #A78BFA)',
  },
];

export const Showcase3DWallPage: React.FC = () => {
  const { user, navigate } = useApp();
  const prefersReduced = useReducedMotion();

  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [pos, setPos] = useState<WallPosition>({ col: 0, row: 0 });
  const [tiltDelta, setTiltDelta] = useState<{ dc: number; dr: number } | undefined>(undefined);
  const [inspectedTile, setInspectedTile] = useState<ShowcaseTile | null>(null);

  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const wheelLockRef = useRef(false);
  const tiltTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<{ certificates: CertificateRecord[] }>('/api/certificates')
      .then((res) => {
        if (active) setCertificates(res.certificates || []);
      })
      .catch(() => {
        // Keep demo talent tiles even when offline
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const tiles: ShowcaseTile[] = useMemo(() => {
    const items: ShowcaseTile[] = [];
    if (user?.profilePhotoUrl) {
      items.push({
        id: `user-${user.id}`,
        title: user.fullName,
        subtitle: `Your profile photo · ${user.role.replace('_', ' ')}`,
        badgeText: 'Signed-in Profile',
        verified: true,
        imageUrl: user.profilePhotoUrl,
        gradient: 'linear-gradient(135deg, #3B82F6, #16C784)',
      });
    }

    certificates.forEach((cert, idx) => {
      const palette = [
        'linear-gradient(135deg, #16C784, #3B82F6)',
        'linear-gradient(135deg, #3B82F6, #A78BFA)',
        'linear-gradient(135deg, #F472B6, #3B82F6)',
      ][idx % 3];
      items.push({
        id: cert.id,
        title: cert.certificateTitle,
        subtitle: `${cert.holderName} · ${cert.issuingAuthority}`,
        badgeText: cert.verificationStatus === 'verified' ? `Verified · ${cert.verificationCode}` : 'Pending review',
        verified: cert.verificationStatus === 'verified',
        imageUrl: cert.previewUrl,
        gradient: palette,
        certRecord: cert,
      });
    });

    TALENT_TILES.forEach((t, idx) => {
      items.push({
        id: `demo-${idx}`,
        ...t,
      });
    });

    return items;
  }, [user, certificates]);

  const moveWall = useCallback(
    (dc: number, dr: number) => {
      setPos((prev) => stepWallPosition(prev, dc, dr, tiles.length, WALL_COLUMNS));
      if (!prefersReduced && (dc !== 0 || dr !== 0)) {
        setTiltDelta({ dc, dr });
        if (tiltTimerRef.current) window.clearTimeout(tiltTimerRef.current);
        tiltTimerRef.current = window.setTimeout(() => {
          setTiltDelta(undefined);
        }, 380);
      }
    },
    [tiles.length, prefersReduced],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (inspectedTile) return;

      const map: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const delta = map[e.key];
      if (delta) {
        e.preventDefault();
        moveWall(delta[0], delta[1]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveWall, inspectedTile]);

  useEffect(() => {
    return () => {
      if (tiltTimerRef.current) window.clearTimeout(tiltTimerRef.current);
    };
  }, []);

  const activeIdx = getActiveTileIndex(pos, WALL_COLUMNS);
  const activeTile = tiles[activeIdx] || tiles[0];

  const handleTileSelect = (idx: number, tile: ShowcaseTile) => {
    const targetCol = idx % WALL_COLUMNS;
    const targetRow = Math.floor(idx / WALL_COLUMNS);
    const dc = targetCol - pos.col;
    const dr = targetRow - pos.row;
    if (dc === 0 && dr === 0) {
      setInspectedTile(tile);
      return;
    }
    moveWall(dc, dr);
  };

  return (
    <div className="min-h-screen text-[#0B1220] dark:text-[#F8FAFC] flex flex-col">
      <PublicNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-5 pb-24 lg:pb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#16C784]">
              <Box className="w-4 h-4" />
              <span>3D Spatial Talent &amp; Certificate Wall</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight kbn-hero-gradient">
              Talent Showcase
            </h1>
            <p className="text-sm text-[#51617a] dark:text-[#94A3B8] max-w-2xl leading-relaxed">
              Fly through verified Nepal profiles and certificate photos in 3D: use arrow keys, swipe, scroll, or the directional pad. Added certificate photos appear first.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/verify')}
              className="px-4 py-2.5 text-xs font-bold rounded-[14px] kbn-btn-primary inline-flex items-center gap-1.5"
            >
              <ImagePlus className="w-4 h-4" />
              <span>Add Certificate Photo</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(user ? (user.role === 'employer' ? '/employer' : '/seeker?tab=vault') : '/auth?mode=login')}
              className="px-4 py-2.5 text-xs font-semibold rounded-[14px] border border-[#d5deea] dark:border-[#263449] bg-white dark:bg-[#172338] hover:border-[#3B82F6] inline-flex items-center gap-1.5 transition-colors"
            >
              <UserCheck className="w-4 h-4 text-[#3B82F6]" />
              <span>{user ? 'My Profile Vault' : 'Sign In to Add Photo'}</span>
            </button>
          </div>
        </div>

        {/* Interactive 3D Viewport */}
        <section
          aria-label="3D portfolio and certificate wall"
          data-testid="kbn-showcase-3d-wall"
          data-active-index={activeIdx}
          tabIndex={0}
          onPointerDown={(e) => {
            swipeStartRef.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerUp={(e) => {
            if (!swipeStartRef.current) return;
            const dx = e.clientX - swipeStartRef.current.x;
            const dy = e.clientY - swipeStartRef.current.y;
            swipeStartRef.current = null;
            const swipe = classifySwipeDelta(dx, dy);
            if (swipe) moveWall(swipe.dc, swipe.dr);
          }}
          onWheel={(e) => {
            e.preventDefault();
            if (wheelLockRef.current) return;
            wheelLockRef.current = true;
            window.setTimeout(() => {
              wheelLockRef.current = false;
            }, 420);
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
              moveWall(e.deltaX > 0 ? 1 : -1, 0);
            } else {
              moveWall(0, e.deltaY > 0 ? 1 : -1);
            }
          }}
          className="relative h-[min(62vh,520px)] rounded-[26px] border border-[#d5deea] dark:border-[#263449] overflow-hidden touch-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16C784]"
          style={{
            perspective: '1100px',
            background:
              'radial-gradient(circle at 50% 40%, rgba(59,130,246,0.22), rgba(22,199,132,0.06) 45%, transparent 72%)',
          }}
        >
          {/* 3D Moving Wall Plane */}
          <div
            className="absolute left-1/2 top-1/2"
            style={{
              transformStyle: 'preserve-3d',
              transition: prefersReduced ? 'none' : 'transform 0.55s cubic-bezier(.2,.8,.2,1)',
              transform: computeWallStageTransform(pos, tiltDelta),
            }}
          >
            {tiles.map((tile, idx) => {
              const coords = getTileGridCoords(idx, WALL_COLUMNS);
              const depth = computeTileDepthStyle(idx, pos, WALL_COLUMNS);

              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => handleTileSelect(idx, tile)}
                  aria-label={`${tile.title} — ${tile.subtitle}`}
                  className="absolute text-left w-[220px] h-[280px] rounded-[22px] border border-[#d5deea] dark:border-[#263449] bg-white dark:bg-[#172338] overflow-hidden flex flex-col shadow-[0_30px_40px_-25px_rgba(0,0,0,0.65)] hover:border-[#16C784]"
                  style={{
                    left: `${coords.left}px`,
                    top: `${coords.top}px`,
                    opacity: depth.opacity,
                    transform: `translateZ(${depth.z}px) rotateY(${depth.rotateY}deg) rotateX(${depth.rotateX}deg) scale(${depth.scale})`,
                    transition: prefersReduced
                      ? 'none'
                      : 'transform 0.65s cubic-bezier(.2,.8,.2,1), opacity 0.65s ease',
                    borderColor: depth.isFocused ? '#16C784' : undefined,
                  }}
                >
                  <div
                    className="flex-1 w-full grid place-items-center text-[52px] font-extrabold text-[#03130d] bg-cover bg-center relative"
                    style={
                      tile.imageUrl
                        ? { backgroundImage: `url(${tile.imageUrl})` }
                        : { background: tile.gradient }
                    }
                  >
                    {!tile.imageUrl && <span>{tile.title.charAt(0)}</span>}
                    {tile.verified && (
                      <span className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-[#0B1220]/80 text-[#16C784] grid place-items-center">
                        <ShieldCheck className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                  <div className="p-3 bg-white dark:bg-[#172338] border-t border-[#d5deea] dark:border-[#263449] space-y-0.5">
                    <p className="text-sm font-bold truncate text-[#0B1220] dark:text-[#F8FAFC]">
                      {tile.title}
                    </p>
                    <p className="text-xs text-[#51617a] dark:text-[#94A3B8] truncate">{tile.subtitle}</p>
                    <p className="text-[11px] font-semibold text-[#16C784] truncate">{tile.badgeText}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 3D Directional Pad */}
          <div
            className="absolute right-3.5 bottom-3.5 grid grid-cols-3 gap-1.5 z-10"
            aria-label="3D wall navigation pad"
          >
            <button
              type="button"
              onClick={() => moveWall(0, -1)}
              aria-label="Move up"
              style={{ gridArea: '1 / 2' }}
              className="w-10 h-10 rounded-[12px] border border-[#d5deea] dark:border-[#263449] bg-white/95 dark:bg-[#172338]/95 grid place-items-center hover:border-[#16C784] transition-colors shadow-md"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => moveWall(-1, 0)}
              aria-label="Move left"
              style={{ gridArea: '2 / 1' }}
              className="w-10 h-10 rounded-[12px] border border-[#d5deea] dark:border-[#263449] bg-white/95 dark:bg-[#172338]/95 grid place-items-center hover:border-[#16C784] transition-colors shadow-md"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => moveWall(0, 1)}
              aria-label="Move down"
              style={{ gridArea: '2 / 2' }}
              className="w-10 h-10 rounded-[12px] border border-[#d5deea] dark:border-[#263449] bg-white/95 dark:bg-[#172338]/95 grid place-items-center hover:border-[#16C784] transition-colors shadow-md"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => moveWall(1, 0)}
              aria-label="Move right"
              style={{ gridArea: '2 / 3' }}
              className="w-10 h-10 rounded-[12px] border border-[#d5deea] dark:border-[#263449] bg-white/95 dark:bg-[#172338]/95 grid place-items-center hover:border-[#16C784] transition-colors shadow-md"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Active Tile Status Strip */}
        {activeTile && (
          <div className="kbn-card-surface rounded-[18px] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold truncate" data-testid="showcase-active-title">
                {activeTile.title} · <span className="font-normal text-[#51617a] dark:text-[#94A3B8]">{activeTile.subtitle}</span>
              </p>
              <p className="text-xs text-[#51617a] dark:text-[#94A3B8] font-mono-num">
                Tile {activeIdx + 1} of {tiles.length} · Click focused tile to inspect details
              </p>
            </div>
            <div className="flex items-center gap-2">
              {activeTile.verified ? (
                <VerificationBadge status="verified" labelOverride={activeTile.badgeText} />
              ) : (
                <VerificationBadge status="pending_review" labelOverride={activeTile.badgeText} />
              )}
              <button
                type="button"
                onClick={() => setInspectedTile(activeTile)}
                className="px-3 py-1.5 text-xs font-semibold rounded-[12px] border border-[#d5deea] dark:border-[#263449] bg-white dark:bg-[#111B2E] hover:border-[#16C784]"
              >
                Inspect Tile
              </button>
            </div>
          </div>
        )}
      </main>

      <ConfirmationModal
        open={!!inspectedTile}
        title={inspectedTile?.title || 'Showcase Details'}
        description={inspectedTile?.subtitle || ''}
        confirmLabel={inspectedTile?.certRecord ? 'Open Certificate Hub' : 'Browse Opportunities'}
        onConfirm={() => {
          const isCert = Boolean(inspectedTile?.certRecord);
          setInspectedTile(null);
          navigate(isCert ? '/verify' : '/jobs');
        }}
        onCancel={() => setInspectedTile(null)}
      >
        {inspectedTile && (
          <div className="space-y-3 text-xs">
            {inspectedTile.imageUrl ? (
              <div className="rounded-xl overflow-hidden border border-[#d5deea] dark:border-[#263449] bg-slate-900">
                <img
                  src={inspectedTile.imageUrl}
                  alt={inspectedTile.title}
                  className="w-full max-h-64 object-contain"
                />
              </div>
            ) : (
              <div
                className="h-32 rounded-xl grid place-items-center text-4xl font-extrabold text-[#03130d]"
                style={{ background: inspectedTile.gradient }}
              >
                {inspectedTile.title.charAt(0)}
              </div>
            )}
            {inspectedTile.certRecord && (
              <div className="rounded-xl bg-slate-50 dark:bg-[#111B2E] border border-[#d5deea] dark:border-[#263449] p-3 space-y-1">
                <p>
                  Verification Code:{' '}
                  <strong className="font-mono-num text-[#16C784]">
                    {inspectedTile.certRecord.verificationCode}
                  </strong>
                </p>
                <p className="truncate">
                  SHA-256: <span className="font-mono-num">{inspectedTile.certRecord.sha256Hash}</span>
                </p>
              </div>
            )}
          </div>
        )}
      </ConfirmationModal>
    </div>
  );
};
