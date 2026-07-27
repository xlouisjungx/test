import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadConditions, saveConditions } from '../repositories/conditionsRepository'
import type { Crop, MaxTravel, Region, UserConditions, UtilityKey, Vehicle } from '../types'
import { CROPS, PRIORITY_OPTIONS, REGIONS, TRAVEL_OPTIONS, UTILITY_KEYS, UTILITY_LABELS, VEHICLES } from '../types'
import { trackEvent } from '../utils/analytics'

const STEP_TITLES = ['희망 영농정보', '예산', '차량과 작업조건', '생활조건']

const emptyConditions: UserConditions = {
  regions: [],
  crop: '',
  farmLocation: '',
  maxTravelMinutes: 999,
  budget: { maxDeposit: 0, maxMonthlyRent: 0, repairBudget: 0, maxInitialCost: 0 },
  vehicles: [],
  vehicleAccessRequired: false,
  parkingRequired: false,
  storageRequired: false,
  yardRequired: false,
  farmStorageRequired: false,
  requiredUtilities: [],
  priorities: [],
}

function Chip({
  selected,
  onToggle,
  children,
  disabled = false,
}: {
  selected: boolean
  onToggle: () => void
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onToggle}
      className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition focus:outline-2 focus:outline-offset-2 focus:outline-forest ${
        selected
          ? 'border-forest bg-forest text-white'
          : 'border-sand bg-white text-basalt hover:border-forest/50'
      } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
    >
      {children}
    </button>
  )
}

function NumberField({
  id,
  label,
  value,
  onChange,
  help,
}: {
  id: string
  label: string
  value: number
  onChange: (n: number) => void
  help?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-basalt">
        {label}
      </label>
      {help && <p className="mt-0.5 text-xs text-stone">{help}</p>}
      <div className="mt-1.5 flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          step={10}
          value={value === 0 ? '' : value}
          onChange={(e) => {
            const n = Math.floor(Number(e.target.value))
            onChange(Number.isFinite(n) && n > 0 ? n : 0)
          }}
          className="w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 text-base focus:border-forest focus:outline-2 focus:outline-offset-1 focus:outline-forest"
          placeholder="0"
        />
        <span className="shrink-0 text-sm font-medium text-stone">만 원</span>
      </div>
    </div>
  )
}

export default function Conditions() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [c, setC] = useState<UserConditions>(() => loadConditions() ?? emptyConditions)

  useEffect(() => {
    trackEvent('conditions_started')
  }, [])

  const toggle = <T,>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter((v) => v !== item) : [...list, item]

  const stepError = useMemo(() => {
    if (step === 0) {
      if (c.regions.length === 0) return '희망지역을 1곳 이상 선택해 주세요.'
      if (c.crop === '') return '재배 예정 작목을 선택해 주세요.'
    }
    if (step === 1) {
      const { maxDeposit, maxMonthlyRent, repairBudget, maxInitialCost } = c.budget
      if (maxDeposit <= 0 || maxMonthlyRent <= 0 || repairBudget <= 0 || maxInitialCost <= 0)
        return '예산 항목을 모두 1만 원 이상으로 입력해 주세요.'
      if (maxInitialCost < maxDeposit)
        return '최대 초기 주거비는 최대 보증금보다 크거나 같아야 해요.'
    }
    if (step === 2 && c.vehicles.length === 0) return '보유 차량을 선택해 주세요. (없다면 “없음”)'
    return ''
  }, [step, c])

  const goNext = () => {
    if (stepError) {
      setError(stepError)
      return
    }
    setError('')
    if (step < 3) {
      setStep(step + 1)
      window.scrollTo({ top: 0 })
      return
    }
    // 제출
    saveConditions(c)
    trackEvent('conditions_submitted')
    navigate('/results')
  }

  const goBack = () => {
    setError('')
    if (step > 0) setStep(step - 1)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold tracking-tight">내 조건 입력</h1>
      <p className="mt-1 text-sm text-stone">입력한 조건으로 빈집 3채의 방문 우선순위를 정리해 드려요.</p>

      {/* 진행 표시기 */}
      <ol className="mt-6 flex items-center gap-1.5" aria-label="입력 단계">
        {STEP_TITLES.map((title, i) => (
          <li key={title} className="flex flex-1 flex-col gap-1.5" aria-current={i === step ? 'step' : undefined}>
            <span className={`h-1.5 rounded-full ${i <= step ? 'bg-forest' : 'bg-sand'}`} />
            <span className={`text-[11px] font-medium sm:text-xs ${i === step ? 'text-forest-dark' : 'text-stone'}`}>
              {i + 1}. {title}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-sand sm:p-7">
        {step === 0 && (
          <div className="space-y-6">
            <fieldset>
              <legend className="text-sm font-semibold">희망지역 (복수 선택 가능) *</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {REGIONS.map((r) => (
                  <Chip key={r} selected={c.regions.includes(r)} onToggle={() => setC({ ...c, regions: toggle<Region>(c.regions, r) })}>
                    {r}
                  </Chip>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold">재배 예정 작목 *</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {CROPS.map((crop) => (
                  <Chip key={crop} selected={c.crop === crop} onToggle={() => setC({ ...c, crop: crop as Crop })}>
                    {crop}
                  </Chip>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="farm-location" className="block text-sm font-semibold">
                농지 위치 또는 선호지역 <span className="font-normal text-stone">(선택)</span>
              </label>
              <input
                id="farm-location"
                type="text"
                value={c.farmLocation}
                onChange={(e) => setC({ ...c, farmLocation: e.target.value })}
                placeholder="예: 애월읍 상가리 인근 감귤밭"
                className="mt-1.5 w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 text-base focus:border-forest focus:outline-2 focus:outline-offset-1 focus:outline-forest"
              />
            </div>

            <fieldset>
              <legend className="text-sm font-semibold">집에서 농지까지 허용 가능한 최대 이동시간</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {TRAVEL_OPTIONS.map((t) => (
                  <Chip key={t} selected={c.maxTravelMinutes === t} onToggle={() => setC({ ...c, maxTravelMinutes: t as MaxTravel })}>
                    {t === 999 ? '상관없음' : `${t}분`}
                  </Chip>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <NumberField
              id="max-deposit"
              label="최대 보증금 *"
              value={c.budget.maxDeposit}
              onChange={(n) => setC({ ...c, budget: { ...c.budget, maxDeposit: n } })}
            />
            <NumberField
              id="max-rent"
              label="허용 가능한 월 임대료 *"
              value={c.budget.maxMonthlyRent}
              onChange={(n) => setC({ ...c, budget: { ...c.budget, maxMonthlyRent: n } })}
            />
            <NumberField
              id="repair-budget"
              label="사용 가능한 수리 예산 *"
              value={c.budget.repairBudget}
              onChange={(n) => setC({ ...c, budget: { ...c.budget, repairBudget: n } })}
            />
            <NumberField
              id="max-initial"
              label="최대 초기 주거비 (보증금 + 수리비) *"
              help="중개수수료·이사비·가구가전 등은 포함하지 않는 주거 관련 초기비용 기준이에요."
              value={c.budget.maxInitialCost}
              onChange={(n) => setC({ ...c, budget: { ...c.budget, maxInitialCost: n } })}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <fieldset>
              <legend className="text-sm font-semibold">보유 차량 (복수 선택 가능) *</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {VEHICLES.map((v) => (
                  <Chip
                    key={v}
                    selected={c.vehicles.includes(v)}
                    onToggle={() =>
                      setC({
                        ...c,
                        vehicles:
                          v === '없음'
                            ? c.vehicles.includes('없음') ? [] : ['없음']
                            : toggle<Vehicle>(c.vehicles.filter((x) => x !== '없음'), v),
                      })
                    }
                  >
                    {v}
                  </Chip>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold">꼭 필요한 조건을 선택해 주세요</legend>
              <div className="mt-2 space-y-2.5">
                {(
                  [
                    ['vehicleAccessRequired', '차량 진입이 꼭 가능해야 해요'],
                    ['parkingRequired', '주차공간이 꼭 필요해요'],
                    ['storageRequired', '창고가 꼭 필요해요'],
                    ['yardRequired', '마당이 꼭 필요해요'],
                    ['farmStorageRequired', '농산물·농기구 보관공간이 꼭 필요해요'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-sand bg-white px-3.5 py-3 hover:border-forest/40">
                    <input
                      type="checkbox"
                      checked={c[key]}
                      onChange={(e) => setC({ ...c, [key]: e.target.checked })}
                      className="size-4 accent-[#2e5b3f]"
                    />
                    <span className="text-sm font-medium">{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <fieldset>
              <legend className="text-sm font-semibold">꼭 확인되어야 하는 생활 기반시설</legend>
              <p className="mt-0.5 text-xs text-stone">선택한 항목이 확인되지 않은 집은 “현장 확인 필요”로 안내해 드려요.</p>
              <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
                {UTILITY_KEYS.map((key) => (
                  <label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-sand bg-white px-3.5 py-3 hover:border-forest/40">
                    <input
                      type="checkbox"
                      checked={c.requiredUtilities.includes(key)}
                      onChange={() => setC({ ...c, requiredUtilities: toggle<UtilityKey>(c.requiredUtilities, key) })}
                      className="size-4 accent-[#2e5b3f]"
                    />
                    <span className="text-sm font-medium">{UTILITY_LABELS[key]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold">
                가장 중요하게 생각하는 조건 <span className="font-normal text-stone">(최대 3개)</span>
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {PRIORITY_OPTIONS.map((p) => {
                  const selected = c.priorities.includes(p)
                  return (
                    <Chip
                      key={p}
                      selected={selected}
                      disabled={!selected && c.priorities.length >= 3}
                      onToggle={() => setC({ ...c, priorities: toggle<string>(c.priorities, p) })}
                    >
                      {p}
                    </Chip>
                  )
                })}
              </div>
            </fieldset>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {error}
          </p>
        )}

        <div className="mt-7 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-tangerine-sub bg-white px-4 py-2.5 text-sm font-bold text-tangerine-dark hover:bg-tangerine-light/40 disabled:cursor-not-allowed disabled:border-0 disabled:bg-tangerine-light disabled:text-white focus:outline-2 focus:outline-offset-2 focus:outline-tangerine-sub"
          >
            <ArrowLeft className="size-4" aria-hidden />
            이전
          </button>
          <button
            type="button"
            onClick={goNext}
            className="inline-flex items-center gap-1.5 rounded-xl bg-tangerine px-5 py-2.5 text-sm font-bold text-white hover:bg-tangerine-sub focus:outline-2 focus:outline-offset-2 focus:outline-tangerine-sub"
          >
            {step === 3 ? (
              <>
                <Sparkles className="size-4" aria-hidden />
                내게 맞는 빈집 분석하기
              </>
            ) : (
              <>
                다음
                <ArrowRight className="size-4" aria-hidden />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
