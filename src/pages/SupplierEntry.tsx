import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { Sprout, ArrowRight, ShieldCheck } from 'lucide-react'
import type { SupplierRole } from '../types'
import { SUPPLIER_ROLE_META } from '../data/constants'
import { sessionRepo, eventsRepo } from '../repositories'
import { Btn, ErrorBox } from '../components/ui'

export default function SupplierEntry() {
  const navigate = useNavigate()
  const location = useLocation()
  const [role, setRole] = useState<SupplierRole | null>(sessionRepo.get()?.role ?? null)
  const needRole = (location.state as { reason?: string } | null)?.reason === 'no-role'

  const start = () => {
    if (!role) return
    sessionRepo.setRole(role)
    eventsRepo.log('supplier_role_selected', { supplierRole: role })
    navigate('/supplier/dashboard')
  }

  return (
    <div className="mx-auto max-w-2xl py-6">
      <div className="mb-12 text-center">
        <div className="mb-4 flex items-center justify-center gap-3">
          <Sprout className="h-9 w-9 text-pine-600" aria-hidden />
          <span className="font-brand text-[52px] leading-none text-pine-600">터잡앙</span>
          <span className="rounded-lg bg-leaf-200 px-2 py-1 text-xs font-semibold text-pine-700">공급자용</span>
        </div>
        <p className="font-brand text-[26px] text-citrus-500">“빈집을 살펴보고, 제주에 터잡앙”</p>
        <p className="mt-1 font-brand text-[21px] text-citrus-400">AI 기반 청년농 맞춤 빈집 분석·비교 서비스</p>
        <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-basalt-500">
          활용 가능한 제주 농촌 빈집을 표준화해 등록하고, 사진 분석 결과와 방문 신청을 관리하세요.
        </p>
      </div>

      {needRole && (
        <div className="mb-4">
          <ErrorBox title="공급자 유형을 먼저 선택해주세요" detail="공급자 화면을 이용하려면 역할 선택이 필요합니다." />
        </div>
      )}

      <fieldset className="mb-6">
        <legend className="mb-2 text-sm font-semibold text-basalt-900">공급자 유형 선택</legend>
        <div className="space-y-2">
          {(Object.keys(SUPPLIER_ROLE_META) as SupplierRole[]).map((r) => (
            <label
              key={r}
              className={`block cursor-pointer rounded-3xl border p-5 shadow-soft transition-colors ${
                role === r ? 'border-citrus-500 bg-citrus-100/30 ring-1 ring-citrus-500' : 'border-sand-200 bg-white hover:border-citrus-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="supplier-role"
                  className="h-4 w-4 accent-citrus-500"
                  checked={role === r}
                  onChange={() => setRole(r)}
                />
                <span className="text-lg font-bold text-basalt-900">{SUPPLIER_ROLE_META[r].label}</span>
              </div>
              <p className="mt-1 pl-6 text-sm text-basalt-500">{SUPPLIER_ROLE_META[r].desc}</p>
            </label>
          ))}
        </div>
      </fieldset>

      <Btn onClick={start} disabled={!role}>
        공급자 관리 시작하기 <ArrowRight className="h-4 w-4" aria-hidden />
      </Btn>

      <div className="mt-6 space-y-3 text-sm">
        <Link to="/consumer" className="inline-block text-citrus-600 underline underline-offset-2 hover:text-citrus-400">
          수요자용 화면 보기 (공개 매물 확인) →
        </Link>
        <div className="flex items-start gap-2 rounded-2xl border border-sand-200 bg-white p-4 text-xs leading-relaxed text-basalt-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-pine-600" aria-hidden />
          <div>
            <p className="font-medium text-basalt-700">개인정보 및 공개범위 안내</p>
            <p className="mt-1">
              소유자 성명·연락처·동의 증빙·상세주소는 수요자에게 공개되지 않으며, 공개용 주소는 등록 시 선택한 범위(읍·면/리/방문
              확정 후)까지만 표시됩니다. 이 MVP는 본인인증·기관인증 없이 데모 계정으로 동작하며, 모든 데이터는 이 브라우저에만
              저장됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
