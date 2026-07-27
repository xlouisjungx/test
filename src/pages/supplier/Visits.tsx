import { Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { VisitStatusChip, inputCls } from '../../components/supplier/ui'
import { getListings } from '../../repositories/listingsRepository'
import { getSupplierVisits } from '../../repositories/supplierVisitsRepository'
import type { VisitStatus } from '../../types/supplier'
import { VISIT_STATUSES } from '../../types/supplier'

export default function SupplierVisits() {
  const [statusFilter, setStatusFilter] = useState<VisitStatus | 'all' | 'new'>('all')
  const [houseFilter, setHouseFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')

  const listings = getListings()
  const visits = getSupplierVisits().filter((v) => {
    if (statusFilter === 'new' && v.status !== '신청 접수') return false
    if (statusFilter !== 'all' && statusFilter !== 'new' && v.status !== statusFilter) return false
    if (houseFilter !== 'all' && v.houseId !== houseFilter) return false
    if (dateFilter && v.visitDate !== dateFilter && v.confirmedDate !== dateFilter) return false
    return true
  })

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight">방문 신청 관리</h1>
      <p className="mt-1 text-sm text-stone">
        실제 문자·이메일은 발송되지 않아요. 상태 변경과 안내 메시지는 이 브라우저에만 저장됩니다.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs font-semibold text-stone">상태</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as VisitStatus | 'all' | 'new')} className={`${inputCls} mt-1`}>
            <option value="all">전체</option>
            <option value="new">신규 신청만</option>
            {VISIT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-stone">빈집</span>
          <select value={houseFilter} onChange={(e) => setHouseFilter(e.target.value)} className={`${inputCls} mt-1`}>
            <option value="all">전체</option>
            {listings.map((l) => (
              <option key={l.id} value={l.id}>
                {l.basic.name || '(이름 없음)'}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-stone">방문 예정일</span>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className={`${inputCls} mt-1`} />
        </label>
      </div>

      <ul className="mt-4 space-y-3">
        {visits.map((v) => (
          <li key={v.id}>
            <Link to={`/supplier/visits/${v.id}`} className="block rounded-2xl bg-white p-4 shadow-soft ring-1 ring-sand hover:ring-forest/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold">
                    {v.name} <span className="text-xs font-normal text-stone">· {v.id}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-stone">
                    {v.houseName} · 희망 {v.visitDate} {v.timeSlot} · 동행 {v.companions}명 · 신청일 {v.createdAt.slice(0, 10)}
                  </p>
                  {v.questions && <p className="mt-1 text-xs text-stone">확인 요청: {v.questions}</p>}
                </div>
                <VisitStatusChip status={v.status} />
              </div>
            </Link>
          </li>
        ))}
        {visits.length === 0 && (
          <li className="rounded-2xl bg-white p-8 text-center text-sm text-stone shadow-soft ring-1 ring-sand">
            <Search className="mx-auto mb-2 size-6 text-stone" aria-hidden />
            조건에 맞는 방문 신청이 없어요.
          </li>
        )}
      </ul>
    </div>
  )
}
