import { ArrowRight, Building2, Landmark, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { saveSupplierProfile } from '../../repositories/supplierSessionRepository'
import type { SupplierType } from '../../types/supplier'
import { trackEvent } from '../../utils/analytics'

const ROLES: { type: SupplierType; icon: typeof UserRound; desc: string }[] = [
  { type: '빈집 소유자', icon: UserRound, desc: '내가 소유·관리하는 빈집을 등록하고 활용 의사를 밝혀요. 방문 신청을 확인해요.' },
  { type: '공인중개사', icon: Building2, desc: '소유자 동의를 받은 빈집을 등록하고 거래조건을 입력해요. 분석 결과를 검토하고 방문 일정을 조율해요.' },
  { type: '지자체·귀농지원기관', icon: Landmark, desc: '빈집 활용사업과 연계된 주택을 등록해요. 공급유형과 여러 빈집·방문 신청을 관리해요.' },
]

export default function SupplierEntry() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<SupplierType | null>(null)
  const [error, setError] = useState('')

  const start = () => {
    if (!selected) {
      setError('공급자 유형을 선택해 주세요.')
      return
    }
    saveSupplierProfile({ type: selected, displayName: `${selected} 데모 계정`, selectedAt: new Date().toISOString() })
    trackEvent('supplier_role_selected', undefined, selected)
    navigate('/supplier/dashboard')
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="inline-flex rounded-full bg-leaf px-3 py-1 text-xs font-semibold text-forest-dark">공급자용</p>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
        빈집을 살펴보고, <span className="font-logo font-normal text-forest">제주에 터잡앙</span>
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-stone">
        활용 가능한 제주 농촌 빈집을 표준화해 등록하고, 사진 분석 결과와 방문 신청을 관리하세요.
      </p>

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold">공급자 유형 선택</legend>
        <div className="mt-2 grid gap-3">
          {ROLES.map(({ type, icon: Icon, desc }) => (
            <button
              key={type}
              type="button"
              aria-pressed={selected === type}
              onClick={() => {
                setSelected(type)
                setError('')
              }}
              className={`flex items-start gap-3 rounded-2xl border-2 bg-white p-4 text-left transition focus:outline-2 focus:outline-offset-2 focus:outline-forest ${
                selected === type ? 'border-forest' : 'border-sand hover:border-forest/40'
              }`}
            >
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${selected === type ? 'bg-forest text-white' : 'bg-leaf text-forest'}`}>
                <Icon className="size-5" aria-hidden />
              </span>
              <span>
                <span className="font-bold">{type}</span>
                <span className="mt-0.5 block text-sm text-stone">{desc}</span>
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={start}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-tangerine px-6 py-3.5 text-base font-bold text-white shadow-soft hover:bg-tangerine-sub focus:outline-2 focus:outline-offset-2 focus:outline-tangerine-sub sm:w-auto"
      >
        공급자 관리 시작하기
        <ArrowRight className="size-5" aria-hidden />
      </button>

      <div className="mt-6 space-y-2 text-xs leading-relaxed text-stone">
        <p>
          MVP에서는 본인인증·기관 인증을 수행하지 않으며 데모 계정으로 이용합니다. 소유자 성명·연락처·동의 증빙 등
          민감정보는 수요자 화면에 공개되지 않고, 이 브라우저에만 저장됩니다.
        </p>
        <p>
          예비 청년농이신가요?{' '}
          <Link to="/" className="font-semibold text-forest underline underline-offset-2">
            수요자용 서비스로 이동
          </Link>
        </p>
      </div>
    </div>
  )
}
