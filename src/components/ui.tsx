import { AlertTriangle, Check, CircleHelp, RotateCcw, X } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Level, TriState } from '../types'

/** 수리 부담 등급 배지 */
export function LevelBadge({ level, prefix }: { level: Level | '판단 불가'; prefix?: string }) {
  const styles: Record<string, string> = {
    낮음: 'bg-leaf text-forest-dark',
    보통: 'bg-tangerine-light text-tangerine-dark',
    높음: 'bg-tangerine text-white',
    '판단 불가': 'bg-sand text-stone',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[level]}`}>
      {prefix ? `${prefix} ` : ''}
      {level}
    </span>
  )
}

/** 가능/불가/확인 필요 표시 */
export function TriStateMark({ state, showLabel = true }: { state: TriState; showLabel?: boolean }) {
  if (state === 'yes') {
    return (
      <span className="inline-flex items-center gap-1 text-forest font-medium">
        <Check className="size-4" aria-hidden />
        {showLabel && '가능'}
      </span>
    )
  }
  if (state === 'no') {
    return (
      <span className="inline-flex items-center gap-1 text-tangerine-dark font-medium">
        <X className="size-4" aria-hidden />
        {showLabel && '어려움'}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-stone font-medium">
      <CircleHelp className="size-4" aria-hidden />
      {showLabel && '확인 필요'}
    </span>
  )
}

export function BoolMark({ value, yes = '있음', no = '없음' }: { value: boolean; yes?: string; no?: string }) {
  return value ? (
    <span className="inline-flex items-center gap-1 text-forest font-medium">
      <Check className="size-4" aria-hidden />
      {yes}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-stone font-medium">
      <X className="size-4" aria-hidden />
      {no}
    </span>
  )
}

/** 안전문구 */
export function SafetyNotice({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs leading-relaxed text-stone ${className}`}>
      터잡앙의 분석 결과는 사진에서 확인 가능한 범위의 참고정보이며, 안전진단이나 확정 공사견적을
      대신하지 않습니다. 정확한 진단과 견적은 계약 전 전문가의 현장점검이 필요합니다.
    </p>
  )
}

/** 섹션 카드 */
export function SectionCard({
  title,
  description,
  children,
  className = '',
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-2xl bg-white p-5 shadow-soft ring-1 ring-sand sm:p-6 ${className}`}>
      <h2 className="text-lg font-bold text-basalt">{title}</h2>
      {description && <p className="mt-1 text-sm text-stone">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

/** 오류·재시도 상태 */
export function ErrorState({
  title,
  message,
  onRetry,
  retryLabel = '다시 시도',
}: {
  title: string
  message: string
  onRetry?: () => void
  retryLabel?: string
}) {
  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-8 text-center shadow-soft ring-1 ring-sand">
      <AlertTriangle className="mx-auto size-10 text-tangerine" aria-hidden />
      <h2 className="mt-4 text-lg font-bold">{title}</h2>
      <p className="mt-2 text-sm text-stone">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-tangerine px-5 py-2.5 text-sm font-bold text-white hover:bg-tangerine-sub focus:outline-2 focus:outline-offset-2 focus:outline-tangerine-sub"
        >
          <RotateCcw className="size-4" aria-hidden />
          {retryLabel}
        </button>
      )}
    </div>
  )
}

/** 로딩 스켈레톤 카드 */
export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl bg-white p-5 shadow-soft ring-1 ring-sand" aria-hidden>
      <div className="h-40 rounded-xl bg-sand" />
      <div className="mt-4 h-5 w-2/3 rounded bg-sand" />
      <div className="mt-2 h-4 w-1/2 rounded bg-sand" />
      <div className="mt-4 h-16 rounded-xl bg-sand" />
    </div>
  )
}
