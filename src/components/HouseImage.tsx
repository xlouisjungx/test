import { housePhotoUrl } from '../data/housePhotos'

/** 실제 등록 사진(public/photos)을 우선 표시하고, 없으면 로컬 SVG 일러스트로 대체 */

interface Palette {
  sky: string
  ground: string
  wall: string
  roof: string
  accent: string
}

const PALETTES: Record<string, Palette> = {
  'aewol-stonewall': { sky: '#ddebd0', ground: '#ead9b4', wall: '#f8f3e6', roof: '#d97b26', accent: '#e8862e' },
  'hallim-warehouse': { sky: '#e5ecda', ground: '#d9cfa9', wall: '#f0e9d5', roof: '#75855f', accent: '#5c6f52' },
  'seongsan-wind': { sky: '#d6e8ea', ground: '#e8dfc6', wall: '#f8f4e9', roof: '#48697b', accent: '#7fa8b8' },
}

const DEFAULT_PALETTE: Palette = { sky: '#e4ecdc', ground: '#e6dcbd', wall: '#f5f0e2', roof: '#8a7a5c', accent: '#b0a077' }

interface HouseImageProps {
  houseId: string
  label?: string
  className?: string
  showDemoBadge?: boolean
  /** 갤러리에서 몇 번째 사진을 보여줄지 (실사진 범위를 넘으면 일러스트로 대체) */
  photoIndex?: number
}

export function HouseImage({ houseId, label, className, showDemoBadge = true, photoIndex = 0 }: HouseImageProps) {
  const photo = housePhotoUrl(houseId, photoIndex)
  if (photo) {
    return (
      <div className={`relative overflow-hidden ${className ?? ''}`}>
        <img
          src={photo}
          alt={label ? `${label} 사진` : '빈집 사진'}
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
        />
        {label && (
          <span className="absolute bottom-2 left-2 rounded-full bg-basalt/70 px-2.5 py-1 text-xs font-medium text-cream">
            {label}
          </span>
        )}
      </div>
    )
  }

  const p = PALETTES[houseId] ?? DEFAULT_PALETTE
  return (
    <svg
      viewBox="0 0 400 260"
      role="img"
      aria-label={label ? `${label} 일러스트 (시연용)` : '빈집 일러스트 (시연용)'}
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      {/* 하늘·땅 */}
      <rect width="400" height="180" fill={p.sky} />
      <rect y="180" width="400" height="80" fill={p.ground} />
      <circle cx="340" cy="48" r="22" fill="#f4c96b" opacity="0.9" />

      {/* 집 본체 */}
      <polygon points="120,110 200,60 280,110" fill={p.roof} />
      <rect x="132" y="110" width="136" height="80" fill={p.wall} stroke="#c9bfa4" strokeWidth="2" />
      <rect x="182" y="140" width="36" height="50" rx="2" fill={p.roof} opacity="0.85" />
      <rect x="146" y="126" width="26" height="24" rx="2" fill={p.sky} stroke="#c9bfa4" strokeWidth="2" />
      <rect x="228" y="126" width="26" height="24" rx="2" fill={p.sky} stroke="#c9bfa4" strokeWidth="2" />

      {houseId === 'aewol-stonewall' && (
        <g>
          {/* 돌담 */}
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <circle key={i} cx={30 + i * 18} cy={196} r={9} fill="#6f6d64" opacity="0.75" />
          ))}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <circle key={i} cx={39 + i * 18} cy={182} r={8} fill="#84816f" opacity="0.75" />
          ))}
          {/* 귤나무 */}
          <circle cx="330" cy="168" r="26" fill="#5d7f4e" />
          <rect x="326" y="188" width="8" height="18" fill="#7a5c3a" />
          {[[318, 160], [336, 152], [344, 172], [324, 176]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={5} fill={p.accent} />
          ))}
        </g>
      )}

      {houseId === 'hallim-warehouse' && (
        <g>
          {/* 대형 창고 */}
          <polygon points="290,132 340,104 390,132" fill="#8a9779" />
          <rect x="296" y="132" width="88" height="58" fill="#e3dcc4" stroke="#b9b092" strokeWidth="2" />
          <rect x="318" y="148" width="44" height="42" fill="#9aa587" opacity="0.6" />
          {/* 밭고랑 */}
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1="16" y1={205 + i * 12} x2="120" y2={205 + i * 12} stroke="#b9a878" strokeWidth="4" strokeLinecap="round" />
          ))}
        </g>
      )}

      {houseId === 'seongsan-wind' && (
        <g>
          {/* 바다와 바람 */}
          <path d="M0 176 Q 30 168 60 176 T 120 176" stroke="#7fa8b8" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M14 154 Q 44 146 74 154" stroke="#9dc0cc" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M300 88 q 24 -12 46 0 q 16 8 30 -2" stroke="#ffffff" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.9" />
          <path d="M290 116 q 20 -10 40 0" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
          {/* 작은 텃밭 */}
          <rect x="300" y="196" width="70" height="26" rx="4" fill="#8aa06a" opacity="0.5" />
        </g>
      )}

      {label && (
        <g>
          <rect x="12" y="222" rx="12" width={label.length * 13 + 26} height="26" fill="#35342f" opacity="0.72" />
          <text x="25" y="240" fontSize="13" fill="#faf6ec" fontFamily="inherit">
            {label}
          </text>
        </g>
      )}
      {showDemoBadge && (
        <g>
          <rect x="292" y="12" rx="10" width="96" height="22" fill="#ffffff" opacity="0.78" />
          <text x="302" y="27" fontSize="11" fill="#6f6d64" fontFamily="inherit">
            시연용 일러스트
          </text>
        </g>
      )}
    </svg>
  )
}
