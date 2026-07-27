import type { ReactNode } from 'react'
import type { ListingStatus, VisitStatus } from '../../types/supplier'
import { LISTING_STATUS_META, VISIT_STATUS_META } from '../../types/supplier'

export function ListingStatusChip({ status }: { status: ListingStatus }) {
  const meta = LISTING_STATUS_META[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.chip}`}>
      {meta.label}
    </span>
  )
}

export function VisitStatusChip({ status }: { status: VisitStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${VISIT_STATUS_META[status]}`}>
      {status}
    </span>
  )
}

export function FieldRow({ label, children, help }: { label: string; children: ReactNode; help?: string }) {
  return (
    <div>
      <span className="block text-sm font-semibold text-basalt">{label}</span>
      {help && <p className="mt-0.5 text-xs text-stone">{help}</p>}
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

export const inputCls =
  'w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm focus:border-forest focus:outline-2 focus:outline-offset-1 focus:outline-forest'

export function TextInput({
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
  )
}

export function NumberInput({
  id,
  value,
  onChange,
  suffix,
  step = 1,
}: {
  id?: string
  value: number
  onChange: (n: number) => void
  suffix?: string
  step?: number
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        step={step}
        value={value === 0 ? '' : value}
        onChange={(e) => {
          const n = Number(e.target.value)
          onChange(Number.isFinite(n) && n > 0 ? n : 0)
        }}
        placeholder="0"
        className={inputCls}
      />
      {suffix && <span className="shrink-0 text-xs font-medium text-stone">{suffix}</span>}
    </div>
  )
}

/** 확인됨/어려움·없음/확인되지 않음 3상태 선택 */
export function TriSelect({
  value,
  onChange,
  yesLabel = '확인됨',
  noLabel = '아니오·없음',
}: {
  value: 'yes' | 'no' | 'unknown'
  onChange: (v: 'yes' | 'no' | 'unknown') => void
  yesLabel?: string
  noLabel?: string
}) {
  const options = [
    ['yes', yesLabel],
    ['no', noLabel],
    ['unknown', '확인되지 않음'],
  ] as const
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
            value === v ? 'border-forest bg-forest text-white' : 'border-sand bg-white text-basalt hover:border-forest/40'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function CheckField({ checked, onChange, label, sub }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sand bg-white px-3.5 py-3 hover:border-forest/40">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 accent-[#658a65]" />
      <span className="text-sm">
        <span className="font-medium">{label}</span>
        {sub && <span className="mt-0.5 block text-xs text-stone">{sub}</span>}
      </span>
    </label>
  )
}
