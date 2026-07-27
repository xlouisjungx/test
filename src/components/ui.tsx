import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { ListingStatus, Tri, VisitStatus } from '../types'
import { LISTING_STATUS_META, TRI_LABEL, VISIT_STATUS_META } from '../data/constants'

export function StatusBadge({ status }: { status: ListingStatus }) {
  const meta = LISTING_STATUS_META[status]
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.cls}`}>{meta.label}</span>
}

export function VisitBadge({ status }: { status: VisitStatus }) {
  const meta = VISIT_STATUS_META[status]
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.cls}`}>{meta.label}</span>
}

export function DemoBadge() {
  return (
    <span className="inline-block rounded bg-sand-200 px-1.5 py-0.5 text-[11px] font-medium text-basalt-500">
      MVP 시연용 가상 정보
    </span>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-sand-200 bg-white p-5 shadow-soft ${className}`}>{children}</div>
}

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="mb-12">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-basalt-900">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

export function ErrorBox({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-2xl border border-citrus-400 bg-citrus-100 p-4 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-citrus-600" aria-hidden />
      <div>
        <p className="font-bold text-citrus-600">{title}</p>
        {detail && <p className="mt-0.5 text-basalt-700">{detail}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  )
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-sand-200 bg-white/60 p-10 text-center text-sm text-basalt-500">
      <p>{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

// ---------- 폼 필드 ----------
interface FieldProps {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: ReactNode
  htmlFor?: string
}

export function Field({ label, required, hint, error, children, htmlFor }: FieldProps) {
  return (
    <div className="mb-3">
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-basalt-700">
        {label}
        {required && <span className="ml-0.5 text-citrus-600" aria-hidden>*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-basalt-500">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-citrus-600" role="alert">{error}</p>}
    </div>
  )
}

export const inputCls =
  'w-full rounded-xl border border-sand-200 bg-white px-3.5 py-2.5 text-sm text-basalt-900 focus:border-citrus-400 focus:outline-none focus:ring-1 focus:ring-citrus-400'

export function TextInput(props: {
  id?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      id={props.id}
      type={props.type ?? 'text'}
      className={inputCls}
      value={props.value}
      placeholder={props.placeholder}
      onChange={(e) => props.onChange(e.target.value)}
    />
  )
}

/** 음수·숫자 오류를 막는 숫자 입력 (빈 값은 undefined) */
export function NumInput(props: {
  id?: string
  value: number | undefined
  onChange: (v: number | undefined) => void
  placeholder?: string
  suffix?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        id={props.id}
        type="number"
        min={0}
        inputMode="decimal"
        className={inputCls}
        value={props.value ?? ''}
        placeholder={props.placeholder}
        onChange={(e) => {
          if (e.target.value === '') return props.onChange(undefined)
          const n = Number(e.target.value)
          if (Number.isNaN(n)) return
          props.onChange(Math.max(0, n))
        }}
      />
      {props.suffix && <span className="shrink-0 text-sm text-basalt-500">{props.suffix}</span>}
    </div>
  )
}

export function SelectInput<T extends string>(props: {
  id?: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <select id={props.id} className={inputCls} value={props.value} onChange={(e) => props.onChange(e.target.value as T)}>
      {props.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/** 있음/없음/확인되지 않음 3상태 라디오 */
export function TriRadio(props: { name: string; value: Tri; onChange: (v: Tri) => void; labels?: Partial<Record<Tri, string>> }) {
  const options: Tri[] = ['yes', 'no', 'unknown']
  return (
    <div role="radiogroup" aria-label={props.name} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={props.value === o}
          onClick={() => props.onChange(o)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            props.value === o
              ? 'border-citrus-500 bg-citrus-500 text-white'
              : 'border-sand-200 bg-white text-basalt-500 hover:border-citrus-400'
          }`}
        >
          {props.labels?.[o] ?? TRI_LABEL[o]}
        </button>
      ))}
    </div>
  )
}

export function CheckboxRow(props: { id: string; checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <label htmlFor={props.id} className="flex cursor-pointer items-start gap-2 text-sm text-basalt-700">
      <input
        id={props.id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-citrus-500"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      <span>{props.label}</span>
    </label>
  )
}

// ---------- 버튼 ----------
// Primary #DD923D+흰색 / Secondary 흰 배경+#E7B072 테두리+#DD923D 텍스트 / Disabled #F1CDA5+흰색
const btnBase =
  'inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-[17px] font-bold transition-colors disabled:cursor-not-allowed'

export function Btn(props: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'warn' | 'ghost'
  disabled?: boolean
  type?: 'button' | 'submit'
  title?: string
}) {
  const variants = {
    primary: 'bg-citrus-500 text-white hover:bg-citrus-400 disabled:bg-citrus-100 disabled:text-white',
    secondary: 'border border-citrus-400 bg-white text-citrus-600 hover:bg-citrus-100/40 disabled:border-citrus-100 disabled:text-citrus-100',
    warn: 'bg-pine-700 text-white hover:bg-basalt-500 disabled:bg-sand-200',
    ghost: 'text-basalt-500 hover:bg-sand-100 disabled:text-mute',
  }
  return (
    <button
      type={props.type ?? 'button'}
      title={props.title}
      className={`${btnBase} ${variants[props.variant ?? 'primary']}`}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children}
    </button>
  )
}
