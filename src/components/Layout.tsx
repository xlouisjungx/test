import { Sprout } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { SafetyNotice } from './ui'

export function Layout() {
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 bg-forest-dark">
        <div className="mx-auto flex h-14 w-full max-w-[1080px] items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 focus:outline-2 focus:outline-offset-2 focus:outline-tangerine-sub">
            <Sprout className="size-5 text-tangerine-sub" aria-hidden />
            <span className="font-logo text-2xl leading-none text-white">터잡앙</span>
            <span className="ml-1 rounded-full bg-tangerine-light px-2 py-0.5 text-xs font-semibold text-forest-dark">
              수요자용
            </span>
          </Link>
          {pathname !== '/conditions' && (
            <Link
              to="/conditions"
              className="rounded-xl bg-tangerine px-3.5 py-2 text-sm font-bold text-white hover:bg-tangerine-sub focus:outline-2 focus:outline-offset-2 focus:outline-tangerine-sub"
            >
              내 조건 입력
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1080px] flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-sand bg-sand/50">
        <div className="mx-auto w-full max-w-[1080px] px-4 py-6 sm:px-6">
          <p className="text-sm font-semibold text-basalt">
            <span className="font-logo text-lg text-forest">터잡앙</span> — AI 기반 청년농 맞춤 빈집 분석·비교 서비스
          </p>
          <SafetyNotice className="mt-2" />
          <p className="mt-2 text-xs text-stone">본 화면의 매물은 모두 MVP 시연용 가상 매물입니다.</p>
        </div>
      </footer>
    </div>
  )
}
