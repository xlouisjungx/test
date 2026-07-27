import { ArrowLeft, CalendarCheck, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { HouseImage } from '../components/HouseImage'
import { ErrorState, SkeletonCard } from '../components/ui'
import { useHouse } from '../hooks/useHouses'
import { saveVisitRequest } from '../repositories/visitRepository'
import { trackEvent } from '../utils/analytics'

const TIME_SLOTS = ['오전 (9~12시)', '오후 (12~17시)', '저녁 (17시 이후)', '협의 가능']

export default function VisitRequest() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { house, loading } = useHouse(id)

  const [form, setForm] = useState({
    name: '',
    phone: '',
    contact: '',
    visitDate: '',
    timeSlot: '',
    companions: 0,
    questions: '',
    agreedPrivacy: false,
  })
  const [fieldError, setFieldError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (house) trackEvent('visit_request_started', house.id)
  }, [house])

  if (loading) {
    return (
      <div className="mx-auto max-w-xl">
        <SkeletonCard />
      </div>
    )
  }

  if (!house) {
    return (
      <ErrorState
        title="빈집을 찾을 수 없어요"
        message="주소가 잘못되었거나 더 이상 등록되지 않은 매물이에요."
        onRetry={() => navigate('/results')}
        retryLabel="추천 결과로 돌아가기"
      />
    )
  }

  const validate = (): string => {
    if (!form.name.trim()) return '신청자 이름을 입력해 주세요.'
    if (!/^[0-9\-+ ]{9,15}$/.test(form.phone.trim())) return '연락처를 숫자로 정확히 입력해 주세요. (예: 010-1234-5678)'
    if (!form.visitDate) return '희망 방문일을 선택해 주세요.'
    if (new Date(form.visitDate) < new Date(new Date().toDateString()))
      return '희망 방문일은 오늘 이후 날짜로 선택해 주세요.'
    if (!form.timeSlot) return '희망 시간대를 선택해 주세요.'
    if (form.companions < 0 || !Number.isInteger(form.companions)) return '동행 인원을 확인해 주세요.'
    if (!form.agreedPrivacy) return '개인정보 수집·이용에 동의해 주세요.'
    return ''
  }

  const submit = async () => {
    const err = validate()
    if (err) {
      setFieldError(err)
      return
    }
    setFieldError('')
    setSaveError('')
    setSubmitting(true)
    try {
      const saved = await saveVisitRequest({
        houseId: house.id,
        houseName: house.name,
        name: form.name.trim(),
        phone: form.phone.trim(),
        contact: form.contact.trim(),
        visitDate: form.visitDate,
        timeSlot: form.timeSlot,
        companions: form.companions,
        questions: form.questions.trim(),
        agreedPrivacy: form.agreedPrivacy,
      })
      trackEvent('visit_request_completed', house.id)
      navigate(`/visit/complete?id=${encodeURIComponent(saved.id)}`)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '방문 신청을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls =
    'mt-1.5 w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 text-base focus:border-forest focus:outline-2 focus:outline-offset-1 focus:outline-forest'

  return (
    <div className="mx-auto max-w-xl">
      <Link
        to={`/houses/${house.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone hover:text-forest focus:outline-2 focus:outline-offset-2 focus:outline-forest"
      >
        <ArrowLeft className="size-4" aria-hidden />
        상세 분석으로
      </Link>

      <h1 className="mt-3 text-2xl font-extrabold tracking-tight">현장 방문 신청</h1>
      <p className="mt-1 text-sm text-stone">신청 내용은 시연용으로 이 브라우저에만 저장돼요.</p>

      {/* 선택한 빈집 요약 */}
      <div className="mt-5 flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-sand">
        <div className="w-24 shrink-0 overflow-hidden rounded-lg">
          <HouseImage houseId={house.id} className="h-16 w-full" showDemoBadge={false} />
        </div>
        <div>
          <p className="font-extrabold">{house.name}</p>
          <p className="text-sm text-stone">
            {house.region} · {house.areaM2}㎡ · 보증금 {house.deposit.toLocaleString()} / 월세 {house.monthlyRent}만 원
          </p>
        </div>
      </div>

      <form
        className="mt-5 space-y-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-sand sm:p-7"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
        noValidate
      >
        <div>
          <label htmlFor="v-name" className="block text-sm font-semibold">
            신청자 이름 *
          </label>
          <input
            id="v-name"
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputCls}
            autoComplete="name"
          />
        </div>

        <div>
          <label htmlFor="v-phone" className="block text-sm font-semibold">
            연락처 *
          </label>
          <input
            id="v-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="010-1234-5678"
            className={inputCls}
            autoComplete="tel"
          />
        </div>

        <div>
          <label htmlFor="v-contact" className="block text-sm font-semibold">
            이메일 또는 연락 가능한 수단 <span className="font-normal text-stone">(선택)</span>
          </label>
          <input
            id="v-contact"
            type="text"
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
            placeholder="example@mail.com / 카카오톡 ID 등"
            className={inputCls}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="v-date" className="block text-sm font-semibold">
              희망 방문일 *
            </label>
            <input
              id="v-date"
              type="date"
              value={form.visitDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setForm({ ...form, visitDate: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="v-time" className="block text-sm font-semibold">
              희망 시간대 *
            </label>
            <select
              id="v-time"
              value={form.timeSlot}
              onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
              className={inputCls}
            >
              <option value="">선택해 주세요</option>
              {TIME_SLOTS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="v-companions" className="block text-sm font-semibold">
            동행 인원
          </label>
          <input
            id="v-companions"
            type="number"
            min={0}
            max={10}
            value={form.companions}
            onChange={(e) => setForm({ ...form, companions: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="v-questions" className="block text-sm font-semibold">
            현장에서 확인하고 싶은 내용 <span className="font-normal text-stone">(선택)</span>
          </label>
          <textarea
            id="v-questions"
            rows={3}
            value={form.questions}
            onChange={(e) => setForm({ ...form, questions: e.target.value })}
            placeholder="예: 지붕 누수 흔적, 트럭 회차 공간, 보일러 상태"
            className={inputCls}
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sand px-3.5 py-3">
          <input
            type="checkbox"
            checked={form.agreedPrivacy}
            onChange={(e) => setForm({ ...form, agreedPrivacy: e.target.checked })}
            className="mt-0.5 size-4 accent-[#2e5b3f]"
          />
          <span className="text-sm">
            <strong>개인정보 수집·이용 동의 *</strong>
            <br />
            <span className="text-xs text-stone">
              방문 일정 조율 목적으로만 사용되며, 시연 환경에서는 이 브라우저에만 저장됩니다.
            </span>
          </span>
        </label>

        {fieldError && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {fieldError}
          </p>
        )}
        {saveError && (
          <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            <p>{saveError}</p>
            <button type="submit" className="mt-2 rounded-lg bg-red-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-800">
              다시 시도
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-tangerine px-5 py-3.5 text-base font-extrabold text-white shadow-soft hover:bg-tangerine-sub disabled:bg-tangerine-light focus:outline-2 focus:outline-offset-2 focus:outline-tangerine-dark"
        >
          {submitting ? (
            <>
              <LoaderCircle className="size-5 animate-spin" aria-hidden />
              신청 처리 중…
            </>
          ) : (
            <>
              <CalendarCheck className="size-5" aria-hidden />
              방문 신청하기
            </>
          )}
        </button>
      </form>
    </div>
  )
}
