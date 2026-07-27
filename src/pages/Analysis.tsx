import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Sparkles, Loader2, CheckCircle2, Plus, RotateCcw } from 'lucide-react'
import type { HouseListing, RepairItemKey, VisibleIssue } from '../types'
import {
  ANALYSIS_STATUS_LABEL,
  BURDEN_META,
  CONFIDENCE_LABEL,
  ESTIMATE_DISCLAIMER,
  LIKELIHOOD_LABEL,
  REPAIR_ITEM_LABEL,
  SUFFICIENCY_LABEL,
  SUPPLIER_ROLE_META,
} from '../data/constants'
import { getAnalysisProvider, validateAnalysisResult } from '../providers/photo-analysis'
import { auditRepo, eventsRepo, listingsRepo } from '../repositories'
import { uid, nowIso } from '../repositories/storage'
import { photoCompleteness } from '../services/photos'
import { conditionSummary } from '../services/condition'
import { buildEstimate, recalcEstimate } from '../services/repair-cost'
import { Btn, Card, CheckboxRow, ErrorBox, Section, inputCls } from '../components/ui'

const REPAIR_KEYS = Object.keys(REPAIR_ITEM_LABEL) as RepairItemKey[]

/**
 * 상태 판단 요약 — 항목별 관찰을 수요자가 비교할 수 있는 등급으로 집계한다.
 * 종합 등급은 '가장 높은 부담' 기준이며 임의의 점수를 만들지 않는다.
 */
function ConditionPanel({ issues }: { issues: VisibleIssue[] }) {
  const s = conditionSummary(issues)
  const overall = s.overall === 'unknown' ? null : BURDEN_META[s.overall]

  return (
    <Card className="mb-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-sm font-semibold text-basalt-900">상태 판단</span>
        {overall ? (
          <span className={`rounded-lg px-2.5 py-1 text-sm font-bold ${overall.cls}`}>
            수리 부담 {overall.label}
          </span>
        ) : (
          <span className="rounded-lg bg-sand-200 px-2.5 py-1 text-sm font-bold text-basalt-500">판단 불가</span>
        )}
        <span className="text-xs text-basalt-500">
          {s.total > 0 ? '확인된 항목 중 가장 높은 부담 기준' : '판단할 항목이 없습니다'}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
        {(['low', 'medium', 'high'] as const).map((level) => (
          <div key={level} className="rounded-xl bg-cream px-2 py-1.5">
            <dt className="text-[11px] text-basalt-500">부담 {BURDEN_META[level].label}</dt>
            <dd className="text-lg font-bold text-basalt-900">{s.counts[level]}</dd>
          </div>
        ))}
        <div className="rounded-xl bg-cream px-2 py-1.5">
          <dt className="text-[11px] text-basalt-500">사진 판단 불가</dt>
          <dd className="text-lg font-bold text-basalt-900">{s.insufficientCount}</dd>
        </div>
        <div className="rounded-xl bg-cream px-2 py-1.5">
          <dt className="text-[11px] text-basalt-500">현장 확인 필요</dt>
          <dd className="text-lg font-bold text-citrus-600">{s.fieldCheckCount}</dd>
        </div>
      </dl>

      <p className="mt-2 text-[11px] leading-relaxed text-basalt-500">
        이 등급은 사진에서 확인된 범위의 <strong>수리 부담</strong>이며, 구조 안전성 판정이 아닙니다. 수요자 화면에도 같은
        기준의 '수리 부담'으로 표시되고, 적합도 점수와 추천 순위는 수요자 조건에 따라 별도로 계산됩니다.
      </p>
    </Card>
  )
}

export default function Analysis() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [listing, setListing] = useState<HouseListing | undefined>(() => (id ? listingsRepo.get(id) : undefined))
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string>()
  const [reviewReason, setReviewReason] = useState('')
  const [newFieldCheck, setNewFieldCheck] = useState('')

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

  const completeness = photoCompleteness(listing.photos, listing.photoNA)
  const canRun = listing.photos.length > 0 && !running

  const runAnalysis = async () => {
    setError(undefined)
    setRunning(true)
    persist({ ...listing, analysisStatus: 'running' })
    eventsRepo.log('analysis_started', { supplierRole: listing.supplierRole, listingId: listing.id })
    try {
      const provider = getAnalysisProvider()
      const result = await provider.analyze(listing)
      const schemaErrors = validateAnalysisResult(result)
      if (schemaErrors.length > 0) {
        throw new Error(`AI 응답이 스키마와 다릅니다: ${schemaErrors.join(' / ')}`)
      }
      const current = listingsRepo.get(listing.id)!
      persist({
        ...current,
        analysisStatus: 'review_required',
        aiResult: result,
        // AI 원본과 별도로 수정 가능한 사본을 만든다
        finalIssues: result.issues.map((i) => ({ ...i })),
        review: undefined,
        estimate: undefined,
      })
      eventsRepo.log('analysis_completed', { supplierRole: listing.supplierRole, listingId: listing.id })
    } catch (e) {
      setError(e instanceof Error ? e.message : '분석 실행에 실패했습니다. 다시 시도하세요.')
      persist({ ...listingsRepo.get(listing.id)!, analysisStatus: 'failed' })
    } finally {
      setRunning(false)
    }
  }

  // AI 원본은 보존하고, 검토·수정은 사본(finalIssues)에서 이뤄진다
  const issues = listing.finalIssues ?? (listing.aiResult?.issues ?? []).map((i) => ({ ...i }))

  const updateIssue = (issueId: string, patch: Partial<VisibleIssue>) => {
    persist({
      ...listing,
      finalIssues: issues.map((i) => (i.id === issueId ? { ...i, ...patch } : i)),
      // 결과를 수정하면 재검토가 필요하다
      review: undefined,
      analysisStatus: 'review_required',
    })
  }

  const approveReview = () => {
    const reviewer = SUPPLIER_ROLE_META[listing.supplierRole].label
    const review = { reviewedBy: reviewer, reviewedAt: nowIso(), reason: reviewReason || undefined }
    const estimate = listing.estimate ?? buildEstimate(listing, issues)
    persist({ ...listing, finalIssues: issues, review, estimate, analysisStatus: 'reviewed' })
    auditRepo.log(reviewer, 'analysis_reviewed', { listingId: listing.id, detail: reviewReason || undefined })
    eventsRepo.log('analysis_reviewed', { supplierRole: listing.supplierRole, listingId: listing.id })
  }

  const setEstimateQty = (key: RepairItemKey, quantity: number) => {
    if (!listing.estimate) return
    const next = recalcEstimate({
      ...listing.estimate,
      items: listing.estimate.items.map((i) => (i.key === key ? { ...i, quantity: Math.max(0, quantity) } : i)),
      reviewed: false,
      reviewedAt: undefined,
    })
    persist({ ...listing, estimate: next })
  }

  const rebuildEstimate = () => {
    persist({ ...listing, estimate: buildEstimate(listing, issues) })
  }

  const confirmEstimate = () => {
    if (!listing.estimate) return
    persist({ ...listing, estimate: { ...listing.estimate, reviewed: true, reviewedAt: nowIso() } })
  }

  const addFieldCheck = () => {
    if (!newFieldCheck.trim()) return
    persist({
      ...listing,
      fieldCheckItems: [...listing.fieldCheckItems, { id: uid(), label: newFieldCheck.trim(), custom: true }],
    })
    setNewFieldCheck('')
  }

  const aiIssueById = new Map((listing.aiResult?.issues ?? []).map((i) => [i.id, i]))

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-basalt-900">AI 사진 사전분석 — {listing.basic.name || '(이름 없음)'}</h1>
          <p className="mt-0.5 text-xs text-basalt-500">분석 상태: {ANALYSIS_STATUS_LABEL[listing.analysisStatus]}</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={() => navigate(`/supplier/listings/${listing.id}/edit`)}>정보 수정</Btn>
          <Btn variant="secondary" onClick={() => navigate(`/supplier/listings/${listing.id}/preview`)}>미리보기</Btn>
        </div>
      </div>

      {error && <div className="mb-4"><ErrorBox title="분석 오류" detail={error} action={<Btn variant="secondary" onClick={() => void runAnalysis()}>다시 시도</Btn>} /></div>}

      {listing.photos.length === 0 && (
        <div className="mb-4">
          <ErrorBox
            title="등록된 사진이 없습니다"
            detail="AI 사전분석은 사진이 1장 이상 등록된 뒤 실행할 수 있습니다. 촬영 가이드의 분류를 많이 채울수록 분석 범위가 넓어집니다."
            action={<Btn variant="secondary" onClick={() => navigate(`/supplier/listings/${listing.id}/edit`)}>사진 등록으로 이동</Btn>}
          />
        </div>
      )}
      {listing.photos.length > 0 && completeness.percent < 100 && (
        <p className="mb-4 rounded-lg bg-sand-100 p-2.5 text-xs text-basalt-700">
          촬영 가이드 {completeness.registered}/{completeness.requiredTotal}개 분류가 충족되었습니다(권장 사항). 등록되지 않은
          분류는 분석 결과에 포함되지 않으며 '사진으로 판단할 수 없는 항목'으로 안내됩니다.
        </p>
      )}

      <Card className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-basalt-900">사진 {listing.photos.length}장 등록됨</p>
            <p className="mt-0.5 text-xs text-basalt-500">
              외부 AI가 연결되지 않아 <strong>데모 분석(Mock)</strong>으로 실행됩니다. 결과는 '분석 결과 예시'로 표시되며 실제
              사진 상태와 다를 수 있습니다.
            </p>
          </div>
          <Btn onClick={() => void runAnalysis()} disabled={!canRun}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
            {running ? '분석 중…' : listing.aiResult ? '다시 분석' : 'AI 사전분석 실행'}
          </Btn>
        </div>
      </Card>

      {listing.aiResult && (
        <>
          <Section
            title="사진에서 확인된 상태"
            aside={<span className="rounded-lg bg-leaf-200 px-2 py-0.5 text-[11px] font-medium text-pine-700">데모 분석 — 분석 결과 예시</span>}
          >
            <ConditionPanel issues={issues} />
            <p className="mb-3 text-xs text-basalt-500">
              AI 원본 결과는 보존되며, 아래에서 수정한 값이 최종 공개 결과로 저장됩니다.
            </p>
            <div className="space-y-3">
              {issues.map((issue) => {
                const original = aiIssueById.get(issue.id)
                const edited = original && JSON.stringify(original) !== JSON.stringify({ ...issue, editReason: original.editReason, excluded: original.excluded })
                return (
                  <Card key={issue.id} className={issue.excluded ? 'opacity-60' : ''}>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="font-medium text-basalt-900">{issue.area} · {issue.location}</span>
                      {edited && <span className="rounded-lg bg-citrus-100 px-1.5 py-0.5 text-[11px] font-medium text-citrus-600">공급자 수정됨</span>}
                      <span className="text-[11px] text-basalt-500">
                        관련 사진 {issue.photoIds.length}장 · 신뢰 수준 {CONFIDENCE_LABEL[issue.confidence]} · {LIKELIHOOD_LABEL[issue.repairLikelihood]}
                      </span>
                      <label className="ml-auto flex items-center gap-1.5 text-xs text-basalt-500">
                        <input type="checkbox" className="h-3.5 w-3.5 accent-citrus-500" checked={issue.excluded ?? false} onChange={(e) => updateIssue(issue.id, { excluded: e.target.checked })} />
                        잘못된 분석 — 제외
                      </label>
                    </div>
                    <p className="text-sm text-basalt-700">{issue.observation}</p>
                    {issue.note && <p className="mt-1 text-xs text-basalt-500">{issue.note}</p>}
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <label className="text-xs text-basalt-500">
                        부담 등급
                        <select className={`${inputCls} mt-1`} value={issue.burden} onChange={(e) => updateIssue(issue.id, { burden: e.target.value as VisibleIssue['burden'] })}>
                          {(Object.keys(BURDEN_META) as VisibleIssue['burden'][]).map((b) => (
                            <option key={b} value={b}>{BURDEN_META[b].label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs text-basalt-500">
                        사진 충분성
                        <select className={`${inputCls} mt-1`} value={issue.sufficiency} onChange={(e) => updateIssue(issue.id, { sufficiency: e.target.value as VisibleIssue['sufficiency'] })}>
                          {(Object.keys(SUFFICIENCY_LABEL) as VisibleIssue['sufficiency'][]).map((s) => (
                            <option key={s} value={s}>{SUFFICIENCY_LABEL[s]}</option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs text-basalt-500">
                        수리 가능성
                        <select className={`${inputCls} mt-1`} value={issue.repairLikelihood} onChange={(e) => updateIssue(issue.id, { repairLikelihood: e.target.value as VisibleIssue['repairLikelihood'] })}>
                          {(Object.keys(LIKELIHOOD_LABEL) as VisibleIssue['repairLikelihood'][]).map((k) => (
                            <option key={k} value={k}>{LIKELIHOOD_LABEL[k]}{k === 'unknown' ? " ('이상 없음' 아님)" : ''}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="mt-3">
                      <p className="mb-1 text-xs text-basalt-500">의심되는 수리항목</p>
                      <div className="flex flex-wrap gap-1.5">
                        {REPAIR_KEYS.map((k) => {
                          const on = issue.suspectedRepairs.includes(k)
                          return (
                            <button
                              key={k}
                              type="button"
                              aria-pressed={on}
                              onClick={() =>
                                updateIssue(issue.id, {
                                  suspectedRepairs: on ? issue.suspectedRepairs.filter((x) => x !== k) : [...issue.suspectedRepairs, k],
                                })
                              }
                              className={`rounded-full border px-2.5 py-0.5 text-[11px] ${on ? 'border-citrus-500 bg-citrus-500 text-white' : 'border-sand-200 text-basalt-500'}`}
                            >
                              {REPAIR_ITEM_LABEL[k]}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <label className="text-xs text-basalt-500">
                        설명 보완
                        <input className={`${inputCls} mt-1`} value={issue.note ?? ''} onChange={(e) => updateIssue(issue.id, { note: e.target.value })} placeholder="예: 사진 추가 필요, 현장에서 우선 확인" />
                      </label>
                      <label className="text-xs text-basalt-500">
                        수정 사유
                        <input className={`${inputCls} mt-1`} value={issue.editReason ?? ''} onChange={(e) => updateIssue(issue.id, { editReason: e.target.value })} placeholder="결과를 수정·제외한 경우 사유를 기록" />
                      </label>
                    </div>
                    <div className="mt-2">
                      <CheckboxRow id={`fc-${issue.id}`} checked={issue.needsFieldCheck} onChange={(v) => updateIssue(issue.id, { needsFieldCheck: v })} label="현장 확인 필요 항목으로 표시" />
                    </div>
                  </Card>
                )
              })}
            </div>

            <Card className="mt-4">
              <p className="mb-1 text-sm font-semibold text-basalt-900">사진으로 판단할 수 없는 항목</p>
              <p className="mb-2 text-xs text-basalt-500">이 항목들은 '이상 없음'이 아니라 '판단 불가'로 수요자에게 표시됩니다.</p>
              <ul className="list-disc pl-5 text-sm text-basalt-700">
                {(listing.aiResult.uncheckable ?? []).map((u) => <li key={u}>{u}</li>)}
              </ul>
            </Card>

            {/* 승인은 별도 단계가 아니라 결과 아래 확인 바로 처리한다 */}
            {listing.review ? (
              <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-pine-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                <span className="font-medium">검토 완료 — {listing.review.reviewedBy}</span>
                <span className="text-basalt-500">
                  {new Date(listing.review.reviewedAt).toLocaleString('ko-KR')}
                  {listing.review.reason && ` · ${listing.review.reason}`}
                </span>
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-pine-100 bg-pine-50 px-3 py-2">
                <p className="text-xs text-basalt-500">위 상태 판단을 확인했다면 공개 단계로 넘어갈 수 있습니다.</p>
                <input
                  className={`${inputCls} !w-auto min-w-[180px] flex-1 !py-1.5 text-xs`}
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  placeholder="검토 의견(선택)"
                  aria-label="검토 의견"
                />
                <Btn onClick={approveReview}>
                  <CheckCircle2 className="h-4 w-4" aria-hidden /> 확인 완료
                </Btn>
              </div>
            )}
          </Section>

          {listing.estimate && (
            <Section
              title="예상 수리비 검토"
              aside={
                <div className="flex gap-2">
                  <Btn variant="ghost" onClick={rebuildEstimate} title="검토된 이슈 기준으로 항목 다시 생성">
                    <RotateCcw className="h-4 w-4" aria-hidden /> 항목 재생성
                  </Btn>
                  {!listing.estimate.reviewed && <Btn variant="secondary" onClick={confirmEstimate}>수리비 검토 완료</Btn>}
                </div>
              }
            >
              <Card>
                <p className="text-lg font-bold text-pine-700">
                  총 {listing.estimate.totalMinManwon.toLocaleString('ko-KR')} ~ {listing.estimate.totalMaxManwon.toLocaleString('ko-KR')}만 원
                  {listing.estimate.reviewed && <span className="ml-2 align-middle text-xs font-medium text-pine-600">✓ 검토 완료</span>}
                </p>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-sand-200 text-basalt-500">
                        <th className="py-1.5 pr-2 font-medium">수리항목</th>
                        <th className="py-1.5 pr-2 font-medium">단위</th>
                        <th className="py-1.5 pr-2 font-medium">예상 수량</th>
                        <th className="py-1.5 pr-2 font-medium">단가(만 원)</th>
                        <th className="py-1.5 pr-2 font-medium">예상비용(만 원)</th>
                        <th className="py-1.5 font-medium">계산 근거</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listing.estimate.items.map((item) => (
                        <tr key={item.key} className="border-b border-sand-100">
                          <td className="py-1.5 pr-2">{item.label}</td>
                          <td className="py-1.5 pr-2">{item.unit}</td>
                          <td className="py-1.5 pr-2">
                            {item.needsFieldQuote ? '-' : (
                              <input
                                type="number"
                                min={0}
                                className="w-20 rounded border border-sand-200 px-2 py-1"
                                value={item.quantity}
                                aria-label={`${item.label} 수량`}
                                onChange={(e) => setEstimateQty(item.key, Number(e.target.value))}
                              />
                            )}
                          </td>
                          <td className="py-1.5 pr-2">{item.needsFieldQuote ? '-' : `${item.minRateManwon} ~ ${item.maxRateManwon}`}</td>
                          <td className="py-1.5 pr-2">
                            {item.needsFieldQuote
                              ? <span className="font-medium text-citrus-600">현장견적 필요</span>
                              : `${item.minCostManwon.toLocaleString('ko-KR')} ~ ${item.maxCostManwon.toLocaleString('ko-KR')}`}
                          </td>
                          <td className="py-1.5 text-basalt-500">{item.basis}</td>
                        </tr>
                      ))}
                      {listing.estimate.items.length === 0 && (
                        <tr><td colSpan={6} className="py-3 text-center text-basalt-500">검토된 이슈에 연결된 수리항목이 없습니다. 이슈에서 수리항목을 지정하거나 '항목 재생성'을 누르세요.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 rounded-lg bg-sand-100 p-2.5 text-xs leading-relaxed text-basalt-700">{ESTIMATE_DISCLAIMER}</p>
              </Card>
            </Section>
          )}

          <Section title="현장 확인 필요 항목">
            <Card>
              <ul className="grid grid-cols-1 gap-1 text-sm text-basalt-700 sm:grid-cols-2">
                {listing.fieldCheckItems.map((f) => (
                  <li key={f.id} className="flex items-start gap-1.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pine-500" aria-hidden />
                    {f.label}
                    {f.custom && <span className="text-[11px] text-basalt-500">(직접 추가)</span>}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <input className={inputCls} value={newFieldCheck} onChange={(e) => setNewFieldCheck(e.target.value)} placeholder="확인 항목 추가 — 예: 장마철 마당 배수 상태" aria-label="현장 확인 항목 추가" />
                <Btn variant="secondary" onClick={addFieldCheck}>
                  <Plus className="h-4 w-4" aria-hidden /> 추가
                </Btn>
              </div>
            </Card>
          </Section>

          <div className="flex justify-end">
            <Btn onClick={() => navigate(`/supplier/listings/${listing.id}/preview`)}>수요자 화면 미리보기로 이동</Btn>
          </div>
        </>
      )}
    </div>
  )
}
