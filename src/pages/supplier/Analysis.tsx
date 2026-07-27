import { ArrowLeft, ArrowRight, CircleCheck, LoaderCircle, Plus, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorState, LevelBadge } from '../../components/ui'
import { inputCls } from '../../components/supplier/ui'
import { getPhotoAnalysisProvider, validateAnalysisResult } from '../../providers/photo-analysis'
import { getListingById, saveListing } from '../../repositories/listingsRepository'
import { loadSupplierProfile } from '../../repositories/supplierSessionRepository'
import { photoCompleteness } from '../../services/publication'
import { REPAIR_COST_NOTICE, buildEstimateFromIssues, estimateTotals, itemCost } from '../../services/repair-cost'
import type { HouseListing, ReviewedIssue } from '../../types/supplier'
import { trackEvent } from '../../utils/analytics'
import { manwonRange } from '../../utils/format'

export default function SupplierAnalysis() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const actor = loadSupplierProfile()?.type ?? '공급자'
  const [listing, setListing] = useState<HouseListing | null>(() => (id ? getListingById(id) : null))
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [reviewReason, setReviewReason] = useState(listing?.review?.reason ?? '')
  const [draftIssues, setDraftIssues] = useState<ReviewedIssue[]>(
    () =>
      listing?.review?.finalIssues ??
      listing?.analysis?.issues.map((i) => ({ ...i, excluded: false, editReason: '' })) ??
      [],
  )

  if (!listing) {
    return (
      <ErrorState
        title="빈집을 찾을 수 없어요"
        message="주소가 잘못되었거나 삭제된 매물이에요."
        onRetry={() => navigate('/supplier/listings')}
        retryLabel="목록으로 돌아가기"
      />
    )
  }

  const photos = photoCompleteness(listing)
  const reviewed = listing.review?.status === 'done'

  const persist = (next: HouseListing, action: string) => {
    saveListing(next, actor, action)
    setListing(next)
  }

  const runAnalysis = async () => {
    if (photos.missing.length > 0) {
      setError(`사진 등록이 완료되지 않았어요. 누락: ${photos.missing.join(', ')}. 사진 등록 후 분석을 실행해 주세요.`)
      return
    }
    setError('')
    setRunning(true)
    trackEvent('analysis_started', listing.id, actor)
    try {
      const provider = getPhotoAnalysisProvider()
      const result = await provider.analyze(listing)
      if (!validateAnalysisResult(result)) {
        throw new Error('AI 응답이 스키마와 일치하지 않아 오류로 처리했어요. 다시 시도해 주세요.')
      }
      const issues = result.issues.map((i) => ({ ...i, excluded: false, editReason: '' }))
      setDraftIssues(issues)
      persist(
        { ...listing, analysis: result, review: null, estimate: buildEstimateFromIssues(issues), status: 'review_required' },
        'AI 사전분석 실행',
      )
      trackEvent('analysis_completed', listing.id, actor)
    } catch (e) {
      setError(e instanceof Error ? e.message : '분석 실행에 실패했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setRunning(false)
    }
  }

  const updateIssue = (issueId: string, patch: Partial<ReviewedIssue>) => {
    setDraftIssues(draftIssues.map((i) => (i.id === issueId ? { ...i, ...patch } : i)))
  }

  const addFieldCheck = (label: string) => {
    if (!label.trim()) return
    persist(
      {
        ...listing,
        fieldChecks: [
          ...listing.fieldChecks,
          { id: `fc-sup-${Date.now().toString(36)}`, label: label.trim(), source: 'supplier', note: '' },
        ],
      },
      '현장 확인 항목 추가',
    )
  }

  const completeReview = () => {
    if (!listing.analysis) return
    const edited = draftIssues.some((i) => i.excluded || i.editReason)
    if (edited && !reviewReason.trim()) {
      setError('분석 결과를 수정했어요. 수정 사유를 작성해 주세요.')
      return
    }
    setError('')
    const estimate = { ...buildEstimateFromIssues(draftIssues), reviewed: listing.estimate?.reviewed ?? false }
    persist(
      {
        ...listing,
        review: {
          aiOriginal: listing.analysis,
          finalIssues: draftIssues,
          reviewedBy: actor,
          reviewedAt: new Date().toISOString(),
          reason: reviewReason,
          status: 'done',
        },
        estimate,
        status: estimate.reviewed ? 'ready_to_publish' : 'review_required',
      },
      '분석결과 검토 완료',
    )
    trackEvent('analysis_reviewed', listing.id, actor)
  }

  const markEstimateReviewed = () => {
    if (!listing.estimate) return
    const next: HouseListing = {
      ...listing,
      estimate: { ...listing.estimate, reviewed: true, reviewedAt: new Date().toISOString() },
    }
    if (next.review?.status === 'done') next.status = 'ready_to_publish'
    persist(next, '예상 수리비 검토 완료')
  }

  const updateQty = (itemId: string, qty: number) => {
    if (!listing.estimate) return
    persist(
      {
        ...listing,
        estimate: {
          ...listing.estimate,
          reviewed: false,
          items: listing.estimate.items.map((i) => (i.id === itemId ? { ...i, qty: Math.max(0, qty) } : i)),
        },
      },
      '수리비 수량 수정',
    )
  }

  const totals = listing.estimate ? estimateTotals(listing.estimate.items) : null
  const analysisStatusLabel = running
    ? '분석 중'
    : !listing.analysis
      ? '분석 전'
      : reviewed
        ? '검토 완료'
        : '검토 필요'

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/supplier/listings" className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone hover:text-forest">
        <ArrowLeft className="size-4" aria-hidden />
        목록으로
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-extrabold tracking-tight">AI 사전분석 — {listing.basic.name}</h1>
        <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-semibold text-stone">{analysisStatusLabel}</span>
        {listing.analysis?.isDemo && (
          <span className="rounded-full bg-tangerine-light px-2.5 py-0.5 text-xs font-semibold text-tangerine-dark">데모 분석</span>
        )}
      </div>
      <p className="mt-1 text-sm text-stone">
        분석 결과는 사람이 검토한 뒤에만 공개할 수 있어요. AI 원본과 수정 결과는 구분해 저장됩니다.
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-tangerine bg-tangerine-light/40 px-4 py-3 text-sm font-semibold text-tangerine-dark">
          {error}
        </p>
      )}

      {!listing.analysis && (
        <div className="mt-5 rounded-2xl bg-white p-6 text-center shadow-soft ring-1 ring-sand">
          <p className="text-sm text-stone">
            사진 {photos.covered.length}/{photos.required.length}개 분류 등록됨
            {photos.missing.length > 0 && ` — 누락: ${photos.missing.slice(0, 5).join(', ')}${photos.missing.length > 5 ? ' 외' : ''}`}
          </p>
          <button
            type="button"
            onClick={() => void runAnalysis()}
            disabled={running}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-tangerine px-6 py-3 text-base font-bold text-white hover:bg-tangerine-sub disabled:bg-tangerine-light"
          >
            {running ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <Sparkles className="size-5" aria-hidden />}
            {running ? '분석 중…' : 'AI 사진 사전분석 실행'}
          </button>
          <p className="mt-3 text-xs text-stone">
            외부 AI 미연결 상태에서는 Mock Provider가 “분석 결과 예시(데모 분석)”를 반환해요. 실제 사진의 하자를 판정하지 않습니다.
          </p>
        </div>
      )}

      {listing.analysis && (
        <>
          <section className="mt-5 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-sand">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">분석 결과 검토 ({draftIssues.filter((i) => !i.excluded).length}/{draftIssues.length}개 반영)</h2>
              <button type="button" onClick={() => void runAnalysis()} disabled={running} className="rounded-lg border border-sand px-3 py-1.5 text-xs font-semibold hover:border-forest/40 disabled:opacity-50">
                {running ? '분석 중…' : '다시 분석'}
              </button>
            </div>
            <ul className="mt-3 space-y-3">
              {draftIssues.map((issue) => (
                <li key={issue.id} className={`rounded-xl border p-4 ${issue.excluded ? 'border-sand bg-sand/40 opacity-60' : 'border-sand'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{issue.part}</span>
                    <span className="text-xs text-stone">{issue.location} · 관련 사진: {issue.photoCategory || '—'}</span>
                    <LevelBadge level={issue.burden} prefix="부담" />
                    <span className="rounded-full bg-sand px-2 py-0.5 text-[11px] font-medium text-stone">사진 {issue.photoSufficiency}</span>
                    <span className="rounded-full bg-sand px-2 py-0.5 text-[11px] font-medium text-stone">신뢰 {issue.confidence}</span>
                  </div>
                  <p className="mt-2 text-sm">{issue.feature}</p>
                  <p className="mt-0.5 text-xs text-stone">
                    의심 수리항목: {issue.suspectedRepair || '없음'} · 수리 가능성 {issue.likelihood} · {issue.note}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-sand pt-3 text-xs">
                    <label className="inline-flex items-center gap-1.5 font-semibold">
                      <input type="checkbox" checked={!issue.excluded} onChange={(e) => updateIssue(issue.id, { excluded: !e.target.checked })} className="size-4 accent-[#658a65]" />
                      결과에 반영
                    </label>
                    <label className="inline-flex items-center gap-1.5">
                      부담 등급
                      <select value={issue.burden} onChange={(e) => updateIssue(issue.id, { burden: e.target.value as ReviewedIssue['burden'] })} className="rounded-lg border border-sand bg-white px-2 py-1">
                        {(['낮음', '보통', '높음', '판단 불가'] as const).map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="inline-flex items-center gap-1.5">
                      <input type="checkbox" checked={issue.needsSiteCheck} onChange={(e) => updateIssue(issue.id, { needsSiteCheck: e.target.checked })} className="size-4 accent-[#658a65]" />
                      현장 확인 필요
                    </label>
                    <input
                      value={issue.editReason}
                      onChange={(e) => updateIssue(issue.id, { editReason: e.target.value })}
                      placeholder="수정 사유 (수정 시 작성)"
                      className="min-w-40 flex-1 rounded-lg border border-sand bg-white px-2.5 py-1.5"
                      aria-label={`${issue.part} 수정 사유`}
                    />
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 rounded-xl bg-sand/60 p-4 text-sm">
              <p className="text-xs font-bold text-stone">사진만으로 판단할 수 없는 항목</p>
              <p className="mt-1">{listing.analysis.unknowns.join(' · ')}</p>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-sm font-semibold">검토 의견·수정 사유</span>
                <textarea rows={2} value={reviewReason} onChange={(e) => setReviewReason(e.target.value)} className={`${inputCls} mt-1.5`} placeholder="예: 창호는 사진 확인 결과 부분 보수로 충분해 보여 등급을 낮췄습니다." />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={completeReview} className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2.5 text-sm font-bold text-white hover:bg-forest-dark">
                  <CircleCheck className="size-4" aria-hidden />
                  {reviewed ? '검토 내용 다시 저장' : '검토 완료'}
                </button>
                {reviewed && listing.review && (
                  <span className="text-xs text-stone">
                    {listing.review.reviewedBy} · {listing.review.reviewedAt.slice(0, 10)} 검토 완료 (AI 원본 보존됨)
                  </span>
                )}
              </div>
            </div>
          </section>

          {listing.estimate && totals && (
            <section className="mt-4 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-sand">
              <h2 className="font-bold">예상 수리비 검토 (참고 범위)</h2>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="border-b border-sand text-left text-xs text-stone">
                    <th className="py-2 font-semibold">수리항목</th>
                    <th className="py-2 font-semibold">수량</th>
                    <th className="py-2 font-semibold">단가(만 원)</th>
                    <th className="py-2 font-semibold">산정 근거</th>
                    <th className="py-2 text-right font-semibold">예상비용</th>
                  </tr>
                </thead>
                <tbody>
                  {listing.estimate.items.map((item) => {
                    const c = itemCost(item)
                    return (
                      <tr key={item.id} className="border-b border-sand/60">
                        <th scope="row" className="py-2.5 pr-2 text-left font-medium">
                          {item.name}
                        </th>
                        <td className="py-2.5 pr-2">
                          {item.needsSiteQuote ? (
                            '—'
                          ) : (
                            <input
                              type="number"
                              min={0}
                              value={item.qty}
                              onChange={(e) => updateQty(item.id, Math.floor(Number(e.target.value) || 0))}
                              className="w-16 rounded-lg border border-sand px-2 py-1 text-xs"
                              aria-label={`${item.name} 수량`}
                            />
                          )}
                          <span className="ml-1 text-xs text-stone">{item.unit}</span>
                        </td>
                        <td className="py-2.5 pr-2 text-xs">{item.needsSiteQuote ? '—' : `${item.minUnitCost}~${item.maxUnitCost}`}</td>
                        <td className="py-2.5 pr-2 text-xs text-stone">{item.basis}</td>
                        <td className="py-2.5 text-right font-semibold whitespace-nowrap">
                          {item.needsSiteQuote ? <span className="rounded-full bg-tangerine-light px-2 py-0.5 text-xs font-bold text-tangerine-dark">현장견적 필요</span> : manwonRange(c.min, c.max)}
                        </td>
                      </tr>
                    )
                  })}
                  <tr>
                    <th scope="row" colSpan={4} className="py-3 text-left font-bold">
                      총 예상 수리비 (현장견적 필요 항목 제외)
                    </th>
                    <td className="py-3 text-right text-base font-extrabold text-forest whitespace-nowrap">{manwonRange(totals.min, totals.max)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-2 rounded-xl border border-tangerine/40 bg-tangerine-light/40 p-3.5 text-xs leading-relaxed">{REPAIR_COST_NOTICE}</p>
              <button type="button" onClick={markEstimateReviewed} disabled={listing.estimate.reviewed} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2.5 text-sm font-bold text-white hover:bg-forest-dark disabled:bg-leaf disabled:text-forest-dark">
                <CircleCheck className="size-4" aria-hidden />
                {listing.estimate.reviewed ? '수리비 검토 완료됨' : '수리비 검토 완료'}
              </button>
            </section>
          )}

          <section className="mt-4 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-sand">
            <h2 className="font-bold">현장 확인 필요 항목 ({listing.fieldChecks.length}개)</h2>
            <ul className="mt-2 grid gap-1.5 text-sm sm:grid-cols-2">
              {listing.fieldChecks.map((f) => (
                <li key={f.id} className="rounded-lg bg-sand/50 px-3 py-1.5">
                  {f.label}
                  {f.source === 'supplier' && <span className="ml-1 text-xs text-tangerine-dark">(공급자 추가)</span>}
                </li>
              ))}
            </ul>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                const input = e.currentTarget.elements.namedItem('fc') as HTMLInputElement
                addFieldCheck(input.value)
                input.value = ''
              }}
            >
              <input name="fc" placeholder="항목 추가 (예: 마당 배수로 상태)" className={inputCls} aria-label="현장 확인 항목 추가" />
              <button type="submit" className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-tangerine-sub bg-white px-3.5 py-2 text-sm font-bold text-tangerine-dark hover:bg-tangerine-light/40">
                <Plus className="size-4" aria-hidden />
                추가
              </button>
            </form>
          </section>

          <div className="mt-5 flex justify-end">
            <Link to={`/supplier/listings/${listing.id}/preview`} className="inline-flex items-center gap-1.5 rounded-xl bg-tangerine px-5 py-2.5 text-sm font-bold text-white hover:bg-tangerine-sub">
              공개 전 미리보기
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
