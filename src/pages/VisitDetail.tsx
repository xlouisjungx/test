import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CalendarCheck, CalendarClock, XCircle, CheckCircle2 } from 'lucide-react'
import type { VisitRequest } from '../types'
import { REJECT_REASONS, VISIT_STATUS_META } from '../data/constants'
import { eventsRepo, listingsRepo, visitsRepo } from '../repositories'
import { Btn, Card, DemoBadge, ErrorBox, VisitBadge, inputCls } from '../components/ui'

export default function VisitDetail() {
  const { id } = useParams()
  const [visit, setVisit] = useState<VisitRequest | undefined>(() => (id ? visitsRepo.get(id) : undefined))
  const [error, setError] = useState<string>()
  const [confirmDate, setConfirmDate] = useState(visit?.preferredDate ?? '')
  const [confirmTime, setConfirmTime] = useState(visit?.preferredTime ?? '')
  const [proposeDate, setProposeDate] = useState('')
  const [proposeTime, setProposeTime] = useState('')
  const [rejectReason, setRejectReason] = useState<string>(REJECT_REASONS[0])
  const [rejectDetail, setRejectDetail] = useState('')
  const [memo, setMemo] = useState(visit?.supplierMemo ?? '')
  const viewed = useRef(false)

  useEffect(() => {
    if (visit && !viewed.current) {
      viewed.current = true
      eventsRepo.log('visit_request_viewed', { listingId: visit.listingId })
    }
  }, [visit])

  if (!visit) {
    return (
      <ErrorBox
        title="존재하지 않는 방문 신청입니다"
        detail="주소가 잘못되었거나 신청이 취소되었을 수 있습니다."
        action={<Link className="text-sm font-medium text-pine-600 underline" to="/supplier/visits">방문 신청 목록으로 이동</Link>}
      />
    )
  }

  const listing = listingsRepo.get(visit.listingId)

  const apply = (fn: () => { ok: boolean; error?: string }) => {
    const result = fn()
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(undefined)
    setVisit(visitsRepo.get(visit.id))
  }

  // 실제 문자·이메일은 발송하지 않는다. 상태 변경과 안내 메시지만 저장된다.
  const confirm = () => {
    if (!confirmDate) return setError('확정할 방문일을 입력하세요.')
    apply(() => visitsRepo.setStatus(visit.id, 'confirmed', `방문 확정 안내: ${confirmDate} ${confirmTime}`, { confirmedDate: confirmDate, confirmedTime: confirmTime }))
    eventsRepo.log('visit_confirmed', { listingId: visit.listingId })
  }
  const propose = () => {
    if (!proposeDate) return setError('제안할 대체 일정을 입력하세요.')
    apply(() => visitsRepo.setStatus(visit.id, 'reschedule_requested', `대체 일정 제안: ${proposeDate} ${proposeTime}`, { proposedDate: proposeDate, proposedTime: proposeTime }))
    eventsRepo.log('visit_reschedule_requested', { listingId: visit.listingId })
  }
  const reject = () => {
    const reason = rejectReason === '기타' ? rejectDetail.trim() : rejectReason
    if (!reason) return setError('거절 사유를 작성하세요.')
    apply(() => visitsRepo.setStatus(visit.id, 'rejected', `거절 사유: ${reason}`, { rejectReason: reason }))
  }
  const complete = () => {
    apply(() => visitsRepo.setStatus(visit.id, 'completed', '방문 완료 처리'))
    eventsRepo.log('visit_completed', { listingId: visit.listingId })
  }
  const startChecking = () => apply(() => visitsRepo.setStatus(visit.id, 'checking', '신청 확인 시작'))
  const saveMemo = () => apply(() => visitsRepo.save({ ...visit, supplierMemo: memo }))

  const active = !['rejected', 'completed', 'cancelled'].includes(visit.status)

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[28px] font-bold leading-tight text-basalt-900">방문 신청 {visit.no}</h1>
          <VisitBadge status={visit.status} />
          {visit.isDemo && <DemoBadge />}
        </div>
        <Link to="/supplier/visits" className="text-sm text-pine-600 underline">목록으로</Link>
      </div>

      {error && <div className="mb-4"><ErrorBox title="처리할 수 없습니다" detail={error} /></div>}

      <div className="space-y-4">
        <Card>
          <h2 className="mb-2 text-sm font-semibold text-basalt-900">신청자 정보</h2>
          <dl className="grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
            <div><dt className="text-basalt-500">이름</dt><dd>{visit.applicantName}</dd></div>
            <div><dt className="text-basalt-500">연락처 (내부 확인용)</dt><dd>{visit.applicantContact}</dd></div>
            <div><dt className="text-basalt-500">희망 방문일</dt><dd>{visit.preferredDate} {visit.preferredTime}</dd></div>
            <div><dt className="text-basalt-500">동행 인원</dt><dd>{visit.companions}명</dd></div>
            {visit.confirmedDate && <div><dt className="text-basalt-500">확정 일정</dt><dd className="font-medium text-pine-700">{visit.confirmedDate} {visit.confirmedTime}</dd></div>}
            {visit.proposedDate && <div><dt className="text-basalt-500">제안한 대체 일정</dt><dd className="text-citrus-600">{visit.proposedDate} {visit.proposedTime}</dd></div>}
            {visit.rejectReason && <div><dt className="text-basalt-500">거절 사유</dt><dd>{visit.rejectReason}</dd></div>}
          </dl>
          {visit.questions && (
            <p className="mt-2 rounded-lg bg-sand-100 p-2.5 text-sm text-basalt-700"><span className="font-medium">확인하고 싶은 내용:</span> {visit.questions}</p>
          )}
        </Card>

        <Card>
          <h2 className="mb-2 text-sm font-semibold text-basalt-900">선택한 빈집</h2>
          {listing ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-basalt-900">{listing.basic.name}</p>
                <p className="text-xs text-basalt-500">{listing.basic.region}</p>
              </div>
              <Link className="text-sm text-pine-600 underline" to={`/supplier/listings/${listing.id}/preview`}>매물 보기</Link>
            </div>
          ) : (
            <p className="text-sm text-basalt-500">매물 정보를 찾을 수 없습니다. (보관 또는 삭제됨)</p>
          )}
          {listing && listing.fieldCheckItems.length > 0 && (
            <div className="mt-3 border-t border-sand-100 pt-3">
              <p className="mb-1 text-xs font-medium text-basalt-700">이 빈집의 현장점검 체크리스트 — 방문 시 신청자와 함께 확인하세요</p>
              <ul className="grid grid-cols-1 gap-0.5 text-xs text-basalt-500 sm:grid-cols-2">
                {listing.fieldCheckItems.map((f) => <li key={f.id}>· {f.label}</li>)}
              </ul>
            </div>
          )}
        </Card>

        {active && (
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-basalt-900">일정 처리</h2>
            <p className="mb-3 rounded-lg bg-sand-100 p-2 text-xs text-basalt-500">
              MVP에서는 실제 문자·이메일이 발송되지 않으며, 상태 변경과 안내 메시지만 저장됩니다.
            </p>
            <div className="space-y-4">
              {visit.status === 'received' && (
                <Btn variant="secondary" onClick={startChecking}>확인 중으로 변경</Btn>
              )}
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-xs text-basalt-500">방문일<input type="date" className={`${inputCls} mt-1`} value={confirmDate} onChange={(e) => setConfirmDate(e.target.value)} /></label>
                <label className="text-xs text-basalt-500">시간<input className={`${inputCls} mt-1`} value={confirmTime} onChange={(e) => setConfirmTime(e.target.value)} placeholder="예: 오전 10시" /></label>
                <Btn onClick={confirm}><CalendarCheck className="h-4 w-4" aria-hidden /> 일정 확정</Btn>
              </div>
              <div className="flex flex-wrap items-end gap-2 border-t border-sand-100 pt-3">
                <label className="text-xs text-basalt-500">대체 일정<input type="date" className={`${inputCls} mt-1`} value={proposeDate} onChange={(e) => setProposeDate(e.target.value)} /></label>
                <label className="text-xs text-basalt-500">시간<input className={`${inputCls} mt-1`} value={proposeTime} onChange={(e) => setProposeTime(e.target.value)} placeholder="예: 오후 2시" /></label>
                <Btn variant="secondary" onClick={propose}><CalendarClock className="h-4 w-4" aria-hidden /> 대체 일정 제안</Btn>
              </div>
              <div className="flex flex-wrap items-end gap-2 border-t border-sand-100 pt-3">
                <label className="text-xs text-basalt-500">
                  거절 사유
                  <select className={`${inputCls} mt-1`} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}>
                    {REJECT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
                {rejectReason === '기타' && (
                  <label className="flex-1 text-xs text-basalt-500">상세 사유<input className={`${inputCls} mt-1`} value={rejectDetail} onChange={(e) => setRejectDetail(e.target.value)} /></label>
                )}
                <Btn variant="warn" onClick={reject}><XCircle className="h-4 w-4" aria-hidden /> 방문 거절</Btn>
              </div>
              {visit.status === 'confirmed' && (
                <div className="border-t border-sand-100 pt-3">
                  <Btn variant="secondary" onClick={complete}><CheckCircle2 className="h-4 w-4" aria-hidden /> 방문 완료 처리</Btn>
                </div>
              )}
            </div>
          </Card>
        )}

        <Card>
          <h2 className="mb-2 text-sm font-semibold text-basalt-900">공급자 메모 (내부용)</h2>
          <textarea className={inputCls} rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="수요자에게 공개되지 않는 내부 메모" />
          <div className="mt-2"><Btn variant="secondary" onClick={saveMemo}>메모 저장</Btn></div>
        </Card>

        <Card>
          <h2 className="mb-2 text-sm font-semibold text-basalt-900">처리 이력</h2>
          <ul className="space-y-1 text-xs text-basalt-500">
            {[...visit.history].reverse().map((h, i) => (
              <li key={i}>
                {new Date(h.at).toLocaleString('ko-KR')} — {VISIT_STATUS_META[h.status].label}
                {h.note && ` · ${h.note}`}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
