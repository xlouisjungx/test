import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, List, CalendarCheck, Eye, UserRound } from 'lucide-react'
import { sessionRepo } from '../repositories'
import { SUPPLIER_ROLE_META } from '../data/constants'

const navItems = [
  { to: '/supplier/dashboard', label: '대시보드', icon: LayoutDashboard },
  { to: '/supplier/listings', label: '빈집 관리', icon: List },
  { to: '/supplier/visits', label: '방문 신청', icon: CalendarCheck },
  { to: '/consumer', label: '수요자 화면', icon: Eye },
]

export default function Layout() {
  const location = useLocation()
  const session = sessionRepo.get()

  // 공급자 역할 미선택 상태에서는 공급자 작업 화면 접근 시 진입 페이지로 보낸다
  if (!session && location.pathname.startsWith('/supplier/')) {
    return <Navigate to="/supplier" replace state={{ reason: 'no-role' }} />
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* 상단 헤더 바 — Header/Deep Green */}
      <header className="sticky top-0 z-10 bg-pine-700">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2.5 sm:px-6">
          <NavLink to="/supplier" className="flex items-center gap-2">
            <span className="font-brand text-[26px] leading-none text-white">터잡앙</span>
            <span className="rounded-lg bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white">공급자용</span>
          </NavLink>
          {session && (
            <>
              <nav className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto pb-1 sm:order-2 sm:w-auto sm:flex-1 sm:pb-0">
                {navItems.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-medium ${
                        isActive ? 'bg-citrus-500 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {label}
                  </NavLink>
                ))}
              </nav>
              <NavLink
                to="/supplier"
                className="order-2 ml-auto flex items-center gap-1.5 rounded-xl px-2 py-1 text-xs text-white/80 hover:bg-white/10 hover:text-white sm:order-3"
                title="역할 변경"
              >
                <UserRound className="h-4 w-4" aria-hidden />
                {SUPPLIER_ROLE_META[session.role].label}
              </NavLink>
            </>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-[1080px] px-4 py-10 sm:px-6">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-[1080px] px-4 pb-10 text-center text-xs text-basalt-500 sm:px-6">
        터잡앙 공급자용 MVP — 모든 매물·연락처는 시연용 가상 정보이며 실제 거래·중개 서비스가 아닙니다.
      </footer>
    </div>
  )
}
