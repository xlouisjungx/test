import { Archive, Copy, Download, Eye, Globe, PauseCircle, Pencil, Plus, Search, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { HouseImage } from '../../components/HouseImage'
import { ListingStatusChip, inputCls } from '../../components/supplier/ui'
import {
  duplicateListing,
  getListings,
  saveListing,
  setListingStatus,
} from '../../repositories/listingsRepository'
import { loadSupplierProfile } from '../../repositories/supplierSessionRepository'
import { getSupplierVisits } from '../../repositories/supplierVisitsRepository'
import { canPublish, photoCompleteness } from '../../services/publication'
import { buildPublicExport, containsSensitiveInfo, validatePublicExport } from '../../services/privacy'
import { REGIONS } from '../../types'
import type { HouseListing, ListingStatus } from '../../types/supplier'
import { LISTING_STATUSES, LISTING_STATUS_META } from '../../types/supplier'
import { trackEvent } from '../../utils/analytics'

export default function SupplierListings() {
  const [, setTick] = useState(0)
  const refresh = () => setTick((t) => t + 1)
  const [statusFilter, setStatusFilter] = useState<ListingStatus | 'all'>('all')
  const [regionFilter, setRegionFilter] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const actor = loadSupplierProfile()?.type ?? '공급자'
  const visits = getSupplierVisits()
  const visitCount = (id: string) => visits.filter((v) => v.houseId === id).length

  const listings = getListings().filter((l) => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false
    if (regionFilter !== 'all' && l.basic.region !== regionFilter) return false
    if (query && !l.basic.name.includes(query) && !l.basic.region.includes(query)) return false
    return true
  })

  const togglePublish = (l: HouseListing) => {
    if (l.status === 'published') {
      setListingStatus(l.id, 'paused', actor, '공급자가 일시 비공개 처리')
      trackEvent('listing_paused', l.id, actor)
      setNotice(`‘${l.basic.name}’을(를) 일시 비공개로 전환했어요.`)
    } else {
      const check = canPublish(l)
      if (!check.ok) {
        setNotice(`공개할 수 없어요 — ${check.failures.map((f) => f.label).join(', ')} 항목을 먼저 완료해 주세요.`)
        return
      }
      setListingStatus(l.id, 'published', actor, '공급자가 공개 처리')
      trackEvent('listing_published', l.id, actor)
      setNotice(`‘${l.basic.name}’을(를) 공개했어요. 수요자 화면에 노출됩니다.`)
    }
    refresh()
  }

  const exportJson = (l: HouseListing) => {
    const data = buildPublicExport([l])
    const json = JSON.stringify(data, null, 2)
    const leaks = containsSensitiveInfo(json, l)
    if (leaks.length > 0) {
      setNotice('내보내기 중단 — 공개 데이터에 민감정보가 포함되어 있어요. 입력값을 확인해 주세요.')
      return
    }
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `teojabang-public-${l.id}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importJson = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!validatePublicExport(parsed)) {
        setNotice('가져오기 실패 — 수요자용 데이터 스키마와 일치하지 않는 JSON이에요. (schema: teojabang-public-houses, version: 1)')
        return
      }
      setNotice(`스키마 검증 통과 — 공개 매물 ${parsed.houses.length}건이 확인됐어요. (읽기 검증용 데모: 목록에 추가하지 않습니다)`)
    } catch {
      setNotice('가져오기 실패 — JSON 파일을 읽을 수 없어요. 파일 형식을 확인해 주세요.')
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">등록 빈집 관리</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-tangerine-sub bg-white px-3.5 py-2 text-sm font-bold text-tangerine-dark hover:bg-tangerine-light/40"
          >
            <Upload className="size-4" aria-hidden />
            JSON 가져오기
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void importJson(f)
              e.target.value = ''
            }}
          />
          <Link to="/supplier/listings/new" className="inline-flex items-center gap-1.5 rounded-xl bg-tangerine px-3.5 py-2 text-sm font-bold text-white hover:bg-tangerine-sub">
            <Plus className="size-4" aria-hidden />새 빈집 등록
          </Link>
        </div>
      </div>

      {/* 필터 */}
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs font-semibold text-stone">상태</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ListingStatus | 'all')} className={`${inputCls} mt-1`}>
            <option value="all">전체</option>
            {LISTING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {LISTING_STATUS_META[s].label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-stone">지역</span>
          <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className={`${inputCls} mt-1`}>
            <option value="all">전체</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-stone">검색</span>
          <div className="relative mt-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="빈집명·지역" className={`${inputCls} pl-9`} />
          </div>
        </label>
      </div>

      {notice && (
        <p role="status" className="mt-4 rounded-xl bg-leaf px-4 py-3 text-sm font-medium text-forest-dark">
          {notice}
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {listings.map((l) => {
          const photos = photoCompleteness(l)
          return (
            <li key={l.id} className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-sand">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="w-full shrink-0 overflow-hidden rounded-xl sm:w-40">
                  <HouseImage houseId={l.id} className="h-24 w-full" showDemoBadge={false} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-extrabold">{l.basic.name || '(이름 없음)'}</h2>
                    <ListingStatusChip status={l.status} />
                    {l.status === 'published' && <Globe className="size-4 text-forest" aria-label="수요자 화면 공개 중" />}
                  </div>
                  <p className="mt-0.5 text-xs text-stone">
                    {l.basic.region} · {l.supplierType} · 최근 수정 {l.updatedAt.slice(0, 10)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span>
                      사진 <strong>{photos.covered.length}/{photos.required.length}</strong>장 ({photos.percent}%)
                    </span>
                    <span>분석 {l.analysis ? (l.analysis.isDemo ? '완료 (데모)' : '완료') : '전'}</span>
                    <span>검토 {l.review?.status === 'done' ? '완료' : l.analysis ? '필요' : '—'}</span>
                    <span>수리비 검토 {l.estimate?.reviewed ? '완료' : l.estimate ? '필요' : '—'}</span>
                    <span>
                      방문 신청 <strong>{visitCount(l.id)}</strong>건
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-sand pt-3">
                <Link to={`/supplier/listings/${l.id}/edit`} className="inline-flex items-center gap-1 rounded-lg border border-sand px-2.5 py-1.5 text-xs font-semibold hover:border-forest/40">
                  <Pencil className="size-3.5" aria-hidden />수정
                </Link>
                <Link to={`/supplier/listings/${l.id}/analysis`} className="inline-flex items-center gap-1 rounded-lg border border-sand px-2.5 py-1.5 text-xs font-semibold hover:border-forest/40">
                  AI 분석·검토
                </Link>
                <Link to={`/supplier/listings/${l.id}/preview`} className="inline-flex items-center gap-1 rounded-lg border border-sand px-2.5 py-1.5 text-xs font-semibold hover:border-forest/40">
                  <Eye className="size-3.5" aria-hidden />미리보기
                </Link>
                <button type="button" onClick={() => togglePublish(l)} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold ${l.status === 'published' ? 'bg-sand text-basalt hover:bg-tangerine-light/60' : 'bg-forest text-white hover:bg-forest-dark'}`}>
                  {l.status === 'published' ? (
                    <>
                      <PauseCircle className="size-3.5" aria-hidden />일시 비공개
                    </>
                  ) : (
                    <>
                      <Globe className="size-3.5" aria-hidden />공개
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    duplicateListing(l.id, actor)
                    setNotice(`‘${l.basic.name}’을(를) 복제했어요. 작성 중 상태로 추가됩니다.`)
                    refresh()
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-sand px-2.5 py-1.5 text-xs font-semibold hover:border-forest/40"
                >
                  <Copy className="size-3.5" aria-hidden />복제
                </button>
                <button type="button" onClick={() => exportJson(l)} className="inline-flex items-center gap-1 rounded-lg border border-sand px-2.5 py-1.5 text-xs font-semibold hover:border-forest/40">
                  <Download className="size-3.5" aria-hidden />JSON 내보내기
                </button>
                {l.status !== 'archived' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setListingStatus(l.id, 'archived', actor, '보관 처리 (삭제 대신)')
                      setNotice(`‘${l.basic.name}’을(를) 보관 처리했어요. 실수 방지를 위해 즉시 삭제하지 않아요.`)
                      refresh()
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-sand px-2.5 py-1.5 text-xs font-semibold text-stone hover:border-forest/40"
                  >
                    <Archive className="size-3.5" aria-hidden />보관
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      saveListing({ ...l, status: 'draft' }, actor, '보관 해제')
                      refresh()
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-sand px-2.5 py-1.5 text-xs font-semibold hover:border-forest/40"
                  >
                    보관 해제
                  </button>
                )}
              </div>
            </li>
          )
        })}
        {listings.length === 0 && (
          <li className="rounded-2xl bg-white p-8 text-center text-sm text-stone shadow-soft ring-1 ring-sand">
            조건에 맞는 빈집이 없어요. 필터를 바꾸거나 새 빈집을 등록해 보세요.
          </li>
        )}
      </ul>
    </div>
  )
}
