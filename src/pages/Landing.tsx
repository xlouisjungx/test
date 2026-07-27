import { ArrowRight, Camera, ClipboardList, Coins, Home, ListChecks, MapPinned } from 'lucide-react'
import { Link } from 'react-router-dom'
import { HouseImage } from '../components/HouseImage'
import { SafetyNotice } from '../components/ui'

const VALUES = [
  {
    icon: Camera,
    title: '사진으로 빈집 상태 확인',
    body: '등록된 사진에서 확인된 노후·수리 의심 항목을 미리 살펴봐요.',
  },
  {
    icon: Coins,
    title: '예상 수리비와 초기 부담 비교',
    body: '보증금과 참고용 수리비를 합친 초기 주거비 범위를 한눈에 비교해요.',
  },
  {
    icon: MapPinned,
    title: '내 영농조건에 맞는 방문 순위 확인',
    body: '농지 거리, 트럭 진입, 창고·마당 조건을 대조해 방문 우선순위를 정해요.',
  },
]

const STEPS = [
  { icon: ClipboardList, title: '조건 입력', body: '영농·생활·예산 조건을 입력해요' },
  { icon: Home, title: '빈집 3채 비교', body: '같은 기준으로 적합도를 비교해요' },
  { icon: ListChecks, title: '방문할 집 선택', body: '체크리스트와 함께 방문을 신청해요' },
]

export default function Landing() {
  return (
    <div className="space-y-12 sm:space-y-16">
      {/* 히어로 */}
      <section className="grid items-center gap-8 pt-4 sm:grid-cols-2 sm:pt-8">
        <div>
          <p className="inline-flex rounded-full bg-leaf px-3 py-1 text-xs font-semibold text-forest-dark">
            제주 청년농 맞춤 빈집 분석·비교 서비스 · 수요자용
          </p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-basalt sm:text-4xl">
            빈집을 살펴보고,
            <br />
            <span className="font-logo text-4xl font-normal text-forest sm:text-5xl">제주에 터잡앙</span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-stone">
            AI 기반 청년농 맞춤 빈집 분석·비교 서비스. 제한된 제주 방문 일정 안에서{' '}
            <strong className="text-basalt">“등록된 빈집 3채 중 어떤 집을 먼저 방문해야 하는지”</strong>를
            내 영농·생활 조건으로 정리해 드려요.
          </p>
          <Link
            to="/conditions"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-tangerine px-6 py-3.5 text-base font-bold text-white shadow-soft hover:bg-tangerine-sub focus:outline-2 focus:outline-offset-2 focus:outline-tangerine-sub"
          >
            내 조건으로 빈집 찾기
            <ArrowRight className="size-5" aria-hidden />
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl shadow-soft ring-1 ring-sand">
          <HouseImage houseId="seongsan-wind" label="제주 농가주택" className="h-56 w-full sm:h-72" />
        </div>
      </section>

      {/* 핵심 가치 */}
      <section aria-labelledby="values-heading">
        <h2 id="values-heading" className="text-xl font-bold text-basalt">
          터잡앙이 도와드리는 것
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {VALUES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-sand">
              <span className="flex size-10 items-center justify-center rounded-xl bg-leaf text-forest">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-3 font-bold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 이용 흐름 */}
      <section aria-labelledby="flow-heading" className="rounded-2xl bg-leaf/60 p-6 sm:p-8">
        <h2 id="flow-heading" className="text-xl font-bold text-basalt">
          이렇게 진행돼요
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="flex items-start gap-3 rounded-xl bg-white/80 p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tangerine text-sm font-bold text-white">
                {i + 1}
              </span>
              <div>
                <p className="flex items-center gap-1.5 font-bold">
                  <Icon className="size-4 text-forest" aria-hidden />
                  {title}
                </p>
                <p className="mt-1 text-sm text-stone">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <SafetyNotice />
    </div>
  )
}
