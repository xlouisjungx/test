import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapPin, Upload, ArrowLeft } from 'lucide-react'
import type { PublicListing } from '../types'
import { TRANSACTION_TYPE_LABEL } from '../data/constants'
import { importedPublicRepo, listingsRepo } from '../repositories'
import { toPublicListing, validatePublicPayload } from '../services/privacy'
import PublicListingView from '../components/PublicListingView'
import { Card, DemoBadge, EmptyState, ErrorBox } from '../components/ui'

/**
 * 수요자 사이드 화면(간이).
 * 같은 도메인에서는 공개 상태의 매물을 저장소에서 직접 읽고,
 * 별도 앱으로 운영되는 경우를 위해 JSON 가져오기를 지원한다.
 */
function allPublicListings(): PublicListing[] {
  const local = listingsRepo.published().map(toPublicListing)
  const imported = importedPublicRepo.all().filter((i) => !local.some((l) => l.id === i.id))
  return [...local, ...imported]
}

export function ConsumerDetail() {
  const { id } = useParams()
  const listing = allPublicListings().find((l) => l.id === id)
  if (!listing) {
    return (
      <ErrorBox
        title="공개된 매물이 아닙니다"
        detail="매물이 비공개로 전환되었거나 존재하지 않습니다."
        action={<Link to="/consumer" className="text-sm font-medium text-pine-600 underline">공개 매물 목록으로</Link>}
      />
    )
  }
  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/consumer" className="mb-4 inline-flex items-center gap-1 text-sm text-pine-600 underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> 공개 매물 목록
      </Link>
      <PublicListingView listing={listing} />
    </div>
  )
}

export default function Consumer() {
  const [refresh, setRefresh] = useState(0)
  const [importMsg, setImportMsg] = useState<string>()
  const [importErr, setImportErr] = useState<string>()
  const fileRef = useRef<HTMLInputElement>(null)
  const listings = allPublicListings()

  const importJson = async (file: File | undefined) => {
    setImportErr(undefined)
    setImportMsg(undefined)
    if (!file) return
    try {
      const data: unknown = JSON.parse(await file.text())
      const errors = validatePublicPayload(data)
      if (errors.length > 0) {
        setImportErr(`JSON 스키마 검증 실패 — ${errors.join(' / ')}`)
        return
      }
      const payload = data as { listings: PublicListing[] }
      importedPublicRepo.replace(payload.listings)
      setImportMsg(`공개 매물 ${payload.listings.length}건을 가져왔습니다.`)
      setRefresh(refresh + 1)
    } catch {
      setImportErr('JSON 파일을 읽을 수 없습니다. 공급자 화면에서 내보낸 파일인지 확인하세요.')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-[28px] font-bold leading-tight text-basalt-900">수요자 화면 — 공개 빈집</h1>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-xl border border-citrus-400 bg-white px-4 py-2 text-sm font-bold text-citrus-600 hover:bg-citrus-100/40"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-4 w-4" aria-hidden /> 공개 매물 JSON 가져오기
        </button>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" aria-label="공개 매물 JSON 파일" onChange={(e) => void importJson(e.target.files?.[0])} />
      </div>
      <p className="mb-4 text-xs text-basalt-500">
        공급자가 공개한 매물만 표시됩니다. 적합도 점수와 추천 순위는 수요자 조건에 따라 수요자 앱에서 계산됩니다.
      </p>

      {importErr && <div className="mb-4"><ErrorBox title="가져오기 실패" detail={importErr} /></div>}
      {importMsg && <p className="mb-4 rounded-lg bg-pine-50 p-2.5 text-sm text-pine-700">{importMsg}</p>}

      {listings.length === 0 ? (
        <EmptyState message="아직 공개된 빈집이 없습니다. 공급자 화면에서 매물을 공개하면 여기에 표시됩니다." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => {
            const primary = l.photos.find((p) => p.isPrimary) ?? l.photos[0]
            return (
              <Link key={l.id} to={`/consumer/${l.id}`} className="block">
                <Card className="h-full p-0 transition-colors hover:border-pine-500">
                  {primary?.dataUrl ? (
                    <img src={primary.dataUrl} alt="" className="h-36 w-full rounded-t-xl object-cover" />
                  ) : (
                    <div className="flex h-36 items-center justify-center rounded-t-xl bg-sand-100 text-xs text-basalt-500">사진 없음</div>
                  )}
                  <div className="p-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-semibold text-basalt-900">{l.name}</p>
                      {l.isDemo && <DemoBadge />}
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-basalt-500">
                      <MapPin className="h-3.5 w-3.5" aria-hidden /> {l.publicAddress}
                    </p>
                    <p className="mt-1.5 text-sm font-medium text-pine-700">{TRANSACTION_TYPE_LABEL[l.transaction.type]}</p>
                    {l.estimate && (
                      <p className="mt-0.5 text-xs text-basalt-500">
                        예상 수리비 {l.estimate.totalMinManwon.toLocaleString('ko-KR')}~{l.estimate.totalMaxManwon.toLocaleString('ko-KR')}만 원 (참고)
                      </p>
                    )}
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
