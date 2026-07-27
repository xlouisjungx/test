import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Download, Copy, Archive, Eye, Pencil, Globe, PauseCircle, Search } from 'lucide-react'
import type { HouseListing, ListingStatus } from '../types'
import { ANALYSIS_STATUS_LABEL, LISTING_STATUS_META, REGIONS, SUPPLIER_ROLE_META } from '../data/constants'
import { auditRepo, eventsRepo, listingsRepo, visitsRepo } from '../repositories'
import { photoCompleteness } from '../services/photos'
import { buildExportPayload, validatePublicPayload } from '../services/privacy'
import { canPublish } from '../services/publication'
import { nowIso } from '../repositories/storage'
import { Btn, Card, DemoBadge, EmptyState, ErrorBox, StatusBadge, inputCls } from '../components/ui'

function download(filename: string, text: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function Listings() {
  const navigate = useNavigate()
  const [refresh, setRefresh] = useState(0)
  const [statusFilter, setStatusFilter] = useState<ListingStatus | 'all'>('all')
  const [regionFilter, setRegionFilter] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()
  const archiveConfirm = useRef<string | null>(null)

  const all = listingsRepo.all()
  const listings = all
    .filter((l) => (statusFilter === 'all' ? l.status !== 'archived' : l.status === statusFilter))
    .filter((l) => regionFilter === 'all' || l.basic.region === regionFilter)
    .filter((l) => !query || l.basic.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  const rerender = () => setRefresh(refresh + 1)

  const togglePublish = (l: HouseListing) => {
    setError(undefined)
    if (l.status === 'published') {
      listingsRepo.save({ ...l, status: 'paused' })
      auditRepo.log('supplier', 'listing_paused', { listingId: l.id })
      eventsRepo.log('listing_paused', { supplierRole: l.supplierRole, listingId: l.id })
    } else if (canPublish(l)) {
      listingsRepo.save({ ...l, status: 'published', publishedAt: nowIso() })
      auditRepo.log('supplier', 'listing_published', { listingId: l.id })
      eventsRepo.log('listing_published', { supplierRole: l.supplierRole, listingId: l.id })
    } else {
      setError(`'${l.basic.name || '(이름 없음)'}'은 공개 조건을 충족하지 않았습니다. 미리보기 페이지의 체크리스트를 확인하세요.`)
      return
    }
    rerender()
  }

  const archive = (l: HouseListing) => {
    // 실수 방지: 즉시 삭제 대신 2단계 확인 후 '보관' 처리
    if (archiveConfirm.current !== l.id) {
      archiveConfirm.current = l.id
      setMessage(`'${l.basic.name || '(이름 없음)'}'을 보관하려면 보관 버튼을 한 번 더 누르세요. (삭제되지 않고 보관 상태로 전환됩니다)`)
      return
    }
    archiveConfirm.current = null
    listingsRepo.archive(l.id, 'supplier')
    setMessage(`'${l.basic.name || '(이름 없음)'}'이 보관 처리되었습니다.`)
    rerender()
  }

  const duplicate = (l: HouseListing) => {
    const copy = listingsRepo.duplicate(l.id)
    if (copy) navigate(`/supplier/listings/${copy.id}/edit`)
  }

  const exportPublished = () => {
    const payload = buildExportPayload(listingsRepo.all())
    const errors = validatePublicPayload(payload)
    if (errors.length > 0) {
      setError(`내보내기 검증 실패: ${errors.join(' / ')}`)
      return
    }
    download(`teojabang-public-listings-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2))
    setMessage(`공개 중인 매물 ${payload.listings.length}건을 내보냈습니다. (민감정보 검사 통과)`)
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-bold leading-tight text-basalt-900">등록 빈집 관리</h1>
        <div className="flex flex-wrap gap-2">
          <Btn variant="secondary" onClick={exportPublished}>
            <Download className="h-4 w-4" aria-hidden /> 공개 매물 JSON 내보내기
          </Btn>
          <Btn onClick={() => navigate('/supplier/listings/new')}>
            <Plus className="h-4 w-4" aria-hidden /> 새 빈집 등록
          </Btn>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <label className="flex items-center gap-1.5 text-sm text-basalt-500">
          상태
          <select className={`${inputCls} !w-auto`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ListingStatus | 'all')}>
            <option value="all">전체(보관 제외)</option>
            {(Object.keys(LISTING_STATUS_META) as ListingStatus[]).map((s) => (
              <option key={s} value={s}>{LISTING_STATUS_META[s].label}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-basalt-500">
          지역
          <select className={`${inputCls} !w-auto`} value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
            <option value="all">전체</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-basalt-500" aria-hidden />
          <input className={`${inputCls} pl-8`} placeholder="빈집명 검색" aria-label="빈집명 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>

      {error && <div className="mb-4"><ErrorBox title="처리할 수 없습니다" detail={error} /></div>}
      {message && <p className="mb-4 rounded-lg bg-pine-50 p-2.5 text-sm text-pine-700">{message}</p>}

      {listings.length === 0 ? (
        <EmptyState
          message="조건에 맞는 빈집이 없습니다."
          action={<Btn onClick={() => navigate('/supplier/listings/new')}>새 빈집 등록</Btn>}
        />
      ) : (
        <div className="space-y-3">
          {listings.map((l) => {
            const c = photoCompleteness(l.photos, l.photoNA)
            const visitCount = visitsRepo.byListing(l.id).length
            const primary = l.photos.find((p) => p.isPrimary) ?? l.photos[0]
            return (
              <Card key={l.id} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {primary?.dataUrl ? (
                  <img src={primary.dataUrl} alt="" className="h-24 w-full rounded-lg object-cover sm:w-36" />
                ) : (
                  <div className="flex h-24 w-full items-center justify-center rounded-lg bg-sand-100 text-xs text-basalt-500 sm:w-36">대표사진 없음</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/supplier/listings/${l.id}/edit`} className="font-semibold text-basalt-900 hover:text-pine-700">
                      {l.basic.name || '(이름 없음)'}
                    </Link>
                    <StatusBadge status={l.status} />
                    {l.isDemo && <DemoBadge />}
                  </div>
                  <p className="mt-1 text-xs text-basalt-500">
                    {l.basic.region} · {SUPPLIER_ROLE_META[l.supplierRole].label} 등록 · 사진 {c.registered}/{c.requiredTotal}개 ·
                    분석 {ANALYSIS_STATUS_LABEL[l.analysisStatus]} · 수리비 {l.estimate?.reviewed ? '검토 완료' : l.estimate ? '검토 필요' : '미생성'} ·
                    방문 신청 {visitCount}건
                  </p>
                  <p className="mt-0.5 text-[11px] text-basalt-500">최근 수정 {new Date(l.updatedAt).toLocaleString('ko-KR')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <button type="button" title="수정" aria-label={`${l.basic.name} 수정`} className="rounded-lg p-2 text-basalt-500 hover:bg-sand-100" onClick={() => navigate(`/supplier/listings/${l.id}/edit`)}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" title="미리보기" aria-label={`${l.basic.name} 미리보기`} className="rounded-lg p-2 text-basalt-500 hover:bg-sand-100" onClick={() => navigate(`/supplier/listings/${l.id}/preview`)}>
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    title={l.status === 'published' ? '일시 비공개로 전환' : '공개하기'}
                    aria-label={l.status === 'published' ? '일시 비공개로 전환' : '공개하기'}
                    className="rounded-lg p-2 text-basalt-500 hover:bg-sand-100"
                    onClick={() => togglePublish(l)}
                  >
                    {l.status === 'published' ? <PauseCircle className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                  </button>
                  <button type="button" title="복제 등록" aria-label={`${l.basic.name} 복제`} className="rounded-lg p-2 text-basalt-500 hover:bg-sand-100" onClick={() => duplicate(l)}>
                    <Copy className="h-4 w-4" />
                  </button>
                  {l.status !== 'archived' && (
                    <button type="button" title="보관 처리(삭제 대신)" aria-label={`${l.basic.name} 보관`} className="rounded-lg p-2 text-citrus-600 hover:bg-citrus-100" onClick={() => archive(l)}>
                      <Archive className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
