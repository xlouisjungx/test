import { ArrowLeft, CalendarCheck, CalendarClock, CircleCheck, CircleX, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorState } from '../../components/ui'
import { VisitStatusChip, inputCls } from '../../components/supplier/ui'
import { getListingById } from '../../repositories/listingsRepository'
import { loadSupplierProfile } from '../../repositories/supplierSessionRepository'
import { getSupplierVisitById, updateVisit } from '../../repositories/supplierVisitsRepository'
import type { SupplierVisit } from '../../types/supplier'
import { REJECT_REASONS } from '../../types/supplier'
import { trackEvent } from '../../utils/analytics'

export default function SupplierVisitDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const actor = loadSupplierProfile()?.type ?? '공급자'
  const [visit, setVisit] = useState<SupplierVisit | null>(() => (id ? getSupplierVisitById(id) : null))
  const [memo, setMemo] = useState(visit?.supplierMemo ?? '')
  const [confirmDate, setConfirmDate] = useState(visit?.confirmedDate || visit?.visitDate || '')
  const [proposeDate, setProposeDate] = useState(visit?.proposedDate ?? '')
  const [rejectReason, setRejectReason] = useState<string>(REJECT_REASONS[0])
  const [rejectDetail, setRejectDetail] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (visit) trackEvent('visit_request_viewed', visit.houseId, actor)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!visit) {
    return (
      <ErrorState
        title="방문 신청을 찾을 수 없어요"
        message="신청번호가 잘못되었거나 삭제된 신청이에요."
        onRetry={() => navigate('/supplier/visits')}
        retryLabel="신청 목록으로"
      />
    )
  }

  const listing = getListingById(visit.houseId)

  const apply = (patch: Parameters<typeof updateVisit>[1], message: string) => {
    const updated = updateVisit(visit.id, patch, actor)
    if (updated) {
      setVisit(updated)
      setNotice(message)
      setError('')
    }
  }

  const confirm = () => {
    if (!confirmDate) {
      setError('확정할 방문일을 선택해 주세요.')
      return
    }
    apply({ status: '방문 확정', confirmedDate: confirmDate }, `방문을 ${confirmDate}로 확정했어요. (안내 메시지는 시연용으로 저장만 됩니다)`)
    trackEvent('visit_confirmed', visit.houseId, actor)
  }

  const propose = () => {
    if (!proposeDate) {
      setError('제안할 대체 일정을 선택해 주세요.')
      return
    }
    apply({ status: '일정 변경 요청', proposedDate: proposeDate }, `대체 일정(${proposeDate})을 제안했어요.`)
    trackEvent('visit_reschedule_requested', visit.houseId, actor)
  }

  const reject = () => {
    const reason = rejectReason === '기타' ? rejectDetail.trim() : rejectReason
    if (!reason) {
      setError('거절 사유를 작성해 주세요.')
      return
    }
    apply({ status: '방문 거절', rejectReason: reason }, '방문 신청을 거절 처리했어요.')
    setShowReject(false)
  }

  const complete = () => {
    apply({ status: '방문 완료' }, '방문 완료로 처리했어요.')
    trackEvent('visit_completed', visit.houseId, actor)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/supplier/visits" className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone hover:text-forest">
        <ArrowLeft className="size-4" aria-hidden />
        신청 목록으로
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-extrabold tracking-tight">방문 신청 {visit.id}</h1>
        <VisitStatusChip status={visit.status} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-white p-5 text-sm shadow-soft ring-1 ring-sand">
        <div>
          <dt className="text-xs text-stone">신청자</dt>
          <dd className="font-bold">{visit.name}</dd>
        </div>
        <div>
          <dt className="text-xs text-stone">연락처</dt>
          <dd className="font-bold">{visit.phone}{visit.contact && ` · ${visit.contact}`}</dd>
        </div>
        <div>
          <dt className="text-xs text-stone">선택 빈집</dt>
          <dd className="font-bold">
            {listing ? (
              <Link to={`/supplier/listings/${listing.id}/preview`} className="underline underline-offset-2 hover:text-forest">
                {visit.houseName}
              </Link>
            ) : (
              visit.houseName
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-stone">희망 방문일</dt>
          <dd className="font-bold">
            {visit.visitDate} · {visit.timeSlot} · 동행 {visit.companions}명
          </dd>
        </div>
        {visit.confirmedDate && (
          <div>
            <dt className="text-xs text-stone">확정일</dt>
            <dd className="font-bold text-forest">{visit.confirmedDate}</dd>
          </div>
        )}
        {visit.proposedDate && (
          <div>
            <dt className="text-xs text-stone">제안한 대체 일정</dt>
            <dd className="font-bold">{visit.proposedDate}</dd>
          </div>
        )}
        {visit.rejectReason && (
          <div className="col-span-2">
            <dt className="text-xs text-stone">거절 사유</dt>
            <dd className="font-bold">{visit.rejectReason}</dd>
          </div>
        )}
        <div className="col-span-2">
          <dt className="text-xs text-stone">확인하고 싶은 내용</dt>
          <dd>{visit.questions || '—'}</dd>
        </div>
      </dl>

      {listing && (
        <section className="mt-4 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-sand">
          <h2 className="text-sm font-bold">이 빈집의 현장점검 체크리스트 ({listing.fieldChecks.length}개)</h2>
          <ul className="mt-2 grid gap-1 text-xs text-stone sm:grid-cols-2">
            {listing.fieldChecks.slice(0, 8).map((f) => (
              <li key={f.id}>· {f.label}</li>
            ))}
            {listing.fieldChecks.length > 8 && <li>· 외 {listing.fieldChecks.length - 8}개</li>}
          </ul>
        </section>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-tangerine bg-tangerine-light/40 px-4 py-3 text-sm font-semibold text-tangerine-dark">
          {error}
        </p>
      )}
      {notice && !error && (
        <p role="status" className="mt-4 rounded-xl bg-leaf px-4 py-3 text-sm font-medium text-forest-dark">
          {notice}
        </p>
      )}

      <section className="mt-4 space-y-4 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-sand">
        <h2 className="font-bold">처리</h2>

        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="text-xs font-semibold text-stone">확정 방문일</span>
            <input type="date" value={confirmDate} onChange={(e) => setConfirmDate(e.target.value)} className={`${inputCls} mt-1`} />
          </label>
          <button type="button" onClick={confirm} className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2.5 text-sm font-bold text-white hover:bg-forest-dark">
            <CalendarCheck className="size-4" aria-hidden />
            일정 확정
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="text-xs font-semibold text-stone">대체 일정 제안</span>
            <input type="date" value={proposeDate} onChange={(e) => setProposeDate(e.target.value)} className={`${inputCls} mt-1`} />
          </label>
          <button type="button" onClick={propose} className="inline-flex items-center gap-1.5 rounded-xl border border-tangerine-sub bg-white px-4 py-2.5 text-sm font-bold text-tangerine-dark hover:bg-tangerine-light/40">
            <CalendarClock className="size-4" aria-hidden />
            대체 일정 제안
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => apply({ status: '확인 중' }, '확인 중으로 변경했어요.')} className="rounded-xl border border-sand px-4 py-2.5 text-sm font-semibold hover:border-forest/40">
            확인 중으로
          </button>
          <button type="button" onClick={complete} className="inline-flex items-center gap-1.5 rounded-xl border border-sand px-4 py-2.5 text-sm font-semibold hover:border-forest/40">
            <CircleCheck className="size-4 text-forest" aria-hidden />
            방문 완료 처리
          </button>
          <button type="button" onClick={() => setShowReject(!showReject)} className="inline-flex items-center gap-1.5 rounded-xl border border-sand px-4 py-2.5 text-sm font-semibold text-stone hover:border-tangerine hover:text-tangerine-dark">
            <CircleX className="size-4" aria-hidden />
            거절
          </button>
        </div>

        {showReject && (
          <div className="rounded-xl bg-sand/50 p-4">
            <label className="block">
              <span className="text-xs font-semibold text-stone">거절 사유 *</span>
              <select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className={`${inputCls} mt-1`}>
                {REJECT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            {rejectReason === '기타' && (
              <input value={rejectDetail} onChange={(e) => setRejectDetail(e.target.value)} placeholder="사유를 직접 작성해 주세요" className={`${inputCls} mt-2`} />
            )}
            <button type="button" onClick={reject} className="mt-3 rounded-xl bg-basalt px-4 py-2.5 text-sm font-bold text-white hover:bg-stone">
              거절 확정
            </button>
          </div>
        )}

        <div>
          <label className="block">
            <span className="text-xs font-semibold text-stone">공급자 메모 (내부용, 비공개)</span>
            <textarea rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} className={`${inputCls} mt-1`} />
          </label>
          <button type="button" onClick={() => apply({ supplierMemo: memo }, '메모를 저장했어요.')} className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-tangerine-sub bg-white px-3.5 py-2 text-sm font-bold text-tangerine-dark hover:bg-tangerine-light/40">
            <Save className="size-4" aria-hidden />
            메모 저장
          </button>
        </div>
      </section>
    </div>
  )
}
