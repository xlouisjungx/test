import { CircleCheck, ListChecks, Scale } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ErrorState } from '../components/ui'
import { getLatestVisitRequest, getVisitRequestById } from '../repositories/visitRepository'

const PREP_ITEMS = [
  '지붕·천장 누수 흔적 (손전등 준비)',
  '보일러·난방설비 작동 확인',
  '수도 수압과 배수 상태 (물 틀어보기)',
  '실제 차량 진입 가능 폭 (직접 운전해 보기)',
  '토지·건축물 권리관계 서류 확인',
  '마을 진입로와 주변 생활환경 둘러보기',
]

export default function VisitComplete() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const request = useMemo(() => {
    const id = params.get('id')
    return (id ? getVisitRequestById(id) : null) ?? getLatestVisitRequest()
  }, [params])

  if (!request) {
    return (
      <ErrorState
        title="신청 내역이 없어요"
        message="아직 방문 신청을 완료하지 않았어요. 추천 결과에서 마음에 드는 집을 골라 신청해 보세요."
        onRetry={() => navigate('/results')}
        retryLabel="추천 결과 보기"
      />
    )
  }

  return (
    <div className="mx-auto max-w-xl text-center">
      <CircleCheck className="mx-auto size-14 text-forest" aria-hidden />
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight">방문 신청이 완료됐어요!</h1>
      <p className="mt-2 text-sm text-stone">
        신청 내용이 저장됐어요. 실제 서비스에서는 담당자가 연락드려 일정을 확정하게 돼요.
      </p>

      <dl className="mt-6 space-y-3 rounded-2xl bg-white p-6 text-left shadow-sm ring-1 ring-sand">
        <div className="flex justify-between gap-4">
          <dt className="text-sm text-stone">신청번호</dt>
          <dd className="font-bold">{request.id}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-sm text-stone">선택한 빈집</dt>
          <dd className="font-bold">{request.houseName}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-sm text-stone">희망 방문일</dt>
          <dd className="font-bold">
            {request.visitDate} · {request.timeSlot}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-sm text-stone">신청자</dt>
          <dd className="font-bold">
            {request.name} ({request.companions > 0 ? `동행 ${request.companions}명` : '단독 방문'})
          </dd>
        </div>
      </dl>

      <div className="mt-5 rounded-2xl bg-leaf/60 p-6 text-left">
        <p className="flex items-center gap-2 font-bold">
          <ListChecks className="size-5 text-forest" aria-hidden />
          방문 전 준비하면 좋은 현장점검 항목
        </p>
        <ul className="mt-3 space-y-1.5 text-sm">
          {PREP_ITEMS.map((item) => (
            <li key={item}>· {item}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-stone">
          상세 페이지의 현장점검 체크리스트를 함께 활용해 보세요. 정확한 진단은 전문가 현장점검이 필요해요.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link
          to="/results"
          className="flex flex-1 items-center justify-center rounded-xl bg-tangerine px-5 py-3 text-sm font-bold text-white hover:bg-tangerine-sub focus:outline-2 focus:outline-offset-2 focus:outline-tangerine-sub"
        >
          추천 결과로 돌아가기
        </Link>
        <Link
          to="/compare"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-tangerine-sub bg-white px-5 py-3 text-sm font-bold text-tangerine-dark hover:bg-tangerine-light/40 focus:outline-2 focus:outline-offset-2 focus:outline-tangerine-sub"
        >
          <Scale className="size-4" aria-hidden />
          다른 빈집 비교하기
        </Link>
      </div>
    </div>
  )
}
