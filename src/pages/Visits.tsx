import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { VisitStatus } from '../types'
import { VISIT_STATUS_META } from '../data/constants'
import { listingsRepo, visitsRepo } from '../repositories'
import { Card, DemoBadge, EmptyState, VisitBadge, inputCls } from '../components/ui'

export default function Visits() {
  const [statusFilter, setStatusFilter] = useState<VisitStatus | 'all' | 'new'>('all')
  const [listingFilter, setListingFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')

  const visits = visitsRepo
    .all()
    .filter((v) => {
      if (statusFilter === 'all') return true
      if (statusFilter === 'new') return v.status === 'received'
      return v.status === statusFilter
    })
    .filter((v) => listingFilter === 'all' || v.listingId === listingFilter)
    .filter((v) => !dateFilter || v.preferredDate === dateFilter || v.confirmedDate === dateFilter)
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))

  const listings = listingsRepo.all()
  const listingName = (id: string) => listings.find((l) => l.id === id)?.basic.name ?? '(삭제된 매물)'

  return (
    <div>
      <h1 className="mb-4 text-[28px] font-bold leading-tight text-basalt-900">방문 신청 관리</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        <label className="flex items-center gap-1.5 text-sm text-basalt-500">
          상태
          <select className={`${inputCls} !w-auto`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as VisitStatus | 'all' | 'new')}>
            <option value="all">전체</option>
            <option value="new">신규 신청만</option>
            {(Object.keys(VISIT_STATUS_META) as VisitStatus[]).map((s) => (
              <option key={s} value={s}>{VISIT_STATUS_META[s].label}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-basalt-500">
          빈집
          <select className={`${inputCls} !w-auto max-w-[180px]`} value={listingFilter} onChange={(e) => setListingFilter(e.target.value)}>
            <option value="all">전체</option>
            {listings.map((l) => (
              <option key={l.id} value={l.id}>{l.basic.name || '(이름 없음)'}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-basalt-500">
          방문 예정일
          <input type="date" className={`${inputCls} !w-auto`} value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        </label>
      </div>

      {visits.length === 0 ? (
        <EmptyState message="조건에 맞는 방문 신청이 없습니다." />
      ) : (
        <div className="space-y-2">
          {visits.map((v) => (
            <Link key={v.id} to={`/supplier/visits/${v.id}`} className="block">
              <Card className="flex flex-wrap items-center justify-between gap-3 transition-colors hover:border-pine-500">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono text-basalt-500">{v.no}</span>
                    <span className="font-medium text-basalt-900">{v.applicantName}</span>
                    {v.isDemo && <DemoBadge />}
                  </div>
                  <p className="mt-1 text-sm text-basalt-700">{listingName(v.listingId)}</p>
                  <p className="mt-0.5 text-xs text-basalt-500">
                    신청 {new Date(v.requestedAt).toLocaleDateString('ko-KR')} · 희망 {v.preferredDate} {v.preferredTime} · 동행 {v.companions}명
                  </p>
                  {v.questions && <p className="mt-0.5 truncate text-xs text-basalt-500">확인 요청: {v.questions}</p>}
                </div>
                <VisitBadge status={v.status} />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
