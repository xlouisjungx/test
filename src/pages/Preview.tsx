import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, XCircle, Globe, PauseCircle } from 'lucide-react'
import type { HouseListing } from '../types'
import { SAFETY_NOTICE, SUPPLIER_ROLE_META } from '../data/constants'
import { auditRepo, eventsRepo, listingsRepo } from '../repositories'
import { nowIso } from '../repositories/storage'
import { findSensitiveKeys, toPublicListing } from '../services/privacy'
import { canPublish, publishChecklist } from '../services/publication'
import PublicListingView from '../components/PublicListingView'
import { Btn, Card, CheckboxRow, ErrorBox, StatusBadge } from '../components/ui'

export default function Preview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [listing, setListing] = useState<HouseListing | undefined>(() => (id ? listingsRepo.get(id) : undefined))
  const [error, setError] = useState<string>()
  const logged = useRef(false)

  useEffect(() => {
    if (listing && !logged.current) {
      logged.current = true
      eventsRepo.log('listing_previewed', { supplierRole: listing.supplierRole, listingId: listing.id })
    }
  }, [listing])

  if (!listing) {
    return (
      <ErrorBox
        title="존재하지 않는 빈집입니다"
        action={<Link className="text-sm font-medium text-pine-600 underline" to="/supplier/listings">빈집 목록으로 이동</Link>}
      />
    )
  }

  const persist = (next: HouseListing) => {
    const result = listingsRepo.save(next)
    if (!result.ok) setError(result.error)
    setListing(result.listing)
  }

  const checklist = publishChecklist(listing)
  const publishable = canPublish(listing)
  const publicData = toPublicListing(listing)
  const sensitiveLeaks = findSensitiveKeys(publicData)

  const publish = () => {
    if (!publishable) return
    if (sensitiveLeaks.length > 0) {
      setError(`공개 데이터에 민감정보가 포함되어 있어 공개할 수 없습니다: ${sensitiveLeaks.join(', ')}`)
      return
    }
    const actor = SUPPLIER_ROLE_META[listing.supplierRole].label
    persist({ ...listing, status: 'published', publishedAt: nowIso() })
    auditRepo.log(actor, 'listing_published', { listingId: listing.id })
    eventsRepo.log('listing_published', { supplierRole: listing.supplierRole, listingId: listing.id })
  }

  const pause = () => {
    persist({ ...listing, status: 'paused' })
    auditRepo.log(SUPPLIER_ROLE_META[listing.supplierRole].label, 'listing_paused', { listingId: listing.id })
    eventsRepo.log('listing_paused', { supplierRole: listing.supplierRole, listingId: listing.id })
  }

  const setConfirm = (patch: Partial<HouseListing['publishConfirmations']>) => {
    persist({ ...listing, publishConfirmations: { ...listing.publishConfirmations, ...patch } })
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-basalt-900">공개 전 미리보기 — {listing.basic.name || '(이름 없음)'}</h1>
          <p className="mt-0.5 text-xs text-basalt-500">수요자 사이드에서 보이는 모습과 동일한 형태입니다.</p>
        </div>
        <StatusBadge status={listing.status} />
      </div>

      {error && <div className="mb-4"><ErrorBox title="공개 실패" detail={error} /></div>}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="order-2 lg:order-1 rounded-2xl border border-sand-200 bg-cream p-4 sm:p-6">
          <PublicListingView listing={publicData} />
        </div>

        <div className="order-1 lg:order-2">
          <Card className="lg:sticky lg:top-16">
            <h2 className="mb-2 text-sm font-semibold text-basalt-900">공개 전 체크리스트</h2>
            <ul className="space-y-1.5 text-sm">
              {checklist.map((c) => (
                <li key={c.key} className="flex items-start gap-1.5">
                  {c.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-pine-600" aria-hidden />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-citrus-600" aria-hidden />
                  )}
                  <div>
                    <span className={c.ok ? 'text-basalt-700' : 'font-medium text-citrus-600'}>{c.label}</span>
                    {!c.ok && c.reason && <p className="text-xs text-basalt-500">{c.reason}</p>}
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-y-2 border-t border-sand-100 pt-3">
              <CheckboxRow
                id="confirm-privacy"
                checked={listing.publishConfirmations.privacyChecked}
                onChange={(v) => setConfirm({ privacyChecked: v })}
                label="사진과 정보에 얼굴·신분증·연락처 등 개인정보가 없는 것을 확인했습니다."
              />
              <CheckboxRow
                id="confirm-fieldcheck"
                checked={listing.publishConfirmations.fieldCheckChecked}
                onChange={(v) => setConfirm({ fieldCheckChecked: v })}
                label="현장 확인 필요 항목을 확인했습니다."
              />
              <CheckboxRow
                id="confirm-safety"
                checked={listing.publishConfirmations.safetyNoticeChecked}
                onChange={(v) => setConfirm({ safetyNoticeChecked: v })}
                label={<>수요자에게 표시되는 안전 안내문구를 확인했습니다. <span className="text-xs text-basalt-500">({SAFETY_NOTICE})</span></>}
              />
            </div>

            {sensitiveLeaks.length > 0 && (
              <p className="mt-3 rounded-xl bg-citrus-100 p-2.5 text-xs font-medium text-citrus-600" role="alert">
                공개 데이터 민감정보 검사 실패: {sensitiveLeaks.join(', ')}
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2">
              {listing.status === 'published' ? (
                <Btn variant="warn" onClick={pause}>
                  <PauseCircle className="h-4 w-4" aria-hidden /> 일시 비공개로 전환
                </Btn>
              ) : (
                <Btn onClick={publish} disabled={!publishable || sensitiveLeaks.length > 0}>
                  <Globe className="h-4 w-4" aria-hidden /> 빈집 공개하기
                </Btn>
              )}
              {!publishable && listing.status !== 'published' && (
                <p className="text-xs text-basalt-500">체크리스트가 모두 완료되면 공개할 수 있습니다.</p>
              )}
              <Btn variant="ghost" onClick={() => navigate(`/supplier/listings/${listing.id}/analysis`)}>분석·검토로 돌아가기</Btn>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
