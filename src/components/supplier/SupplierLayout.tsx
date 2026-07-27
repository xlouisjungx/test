import { CalendarCheck, Home, LayoutDashboard, List, Sprout } from 'lucide-react'
import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { loadSupplierProfile } from '../../repositories/supplierSessionRepository'
import { SafetyNotice } from '../ui'

const NAV = [
  { to: '/supplier/dashboard', label: '대시보드', icon: LayoutDashboard },
  { to: '/supplier/listings', label: '등록 빈집', icon: List },
  { to: '/supplier/visits', label: '방문 신청', icon: CalendarCheck },
]

export function SupplierLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const profile = loadSupplierProfile()

  useEffect(() => {
    if (!profile && pathname !== '/supplier') {
      navigate('/supplier', { replace: true })
    }
  }, [profile, pathname, navigate])

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 bg-forest-dark">
        <div className="mx-auto flex h-14 w-full max-w-[1080px] items-center justify-between px-4 sm:px-6">
          <Link to="/supplier/dashboard" className="flex items-center gap-2 focus:outline-2 focus:outline-offset-2 focus:outline-tangerine-sub">
            <Sprout className="size-5 text-tangerine-sub" aria-hidden />
            <span className="font-logo text-2xl leading-none text-white">터잡앙</span>
            <span className="ml-1 rounded-full bg-leaf px-2 py-0.5 text-xs font-semibold text-forest-dark">공급자용</span>
          </Link>
          <div className="flex items-center gap-2">
            {profile && (
              <span className="hidden rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white sm:inline">
                {profile.type} (데모 계정)
              </span>
            )}
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20 focus:outline-2 focus:outline-offset-2 focus:outline-tangerine-sub"
            >
              <Home className="size-3.5" aria-hidden />
              수요자용
            </Link>
          </div>
        </div>
        {profile && (
          <nav className="border-t border-white/10 bg-forest-dark" aria-label="공급자 메뉴">
            <div className="mx-auto flex w-full max-w-[1080px] gap-1 overflow-x-auto px-4 sm:px-6">
              {NAV.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold ${
                      isActive ? 'border-tangerine-sub text-white' : 'border-transparent text-white/70 hover:text-white'
                    }`
                  }
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-[1080px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-sand bg-sand/50">
        <div className="mx-auto w-full max-w-[1080px] px-4 py-5 sm:px-6">
          <SafetyNotice />
          <p className="mt-2 text-xs text-stone">
            본 화면의 매물·신청·소유자 정보는 모두 MVP 시연용 가상 정보입니다. 본인인증·법률 검증은 수행하지 않습니다.
          </p>
        </div>
      </footer>
    </div>
  )
}
