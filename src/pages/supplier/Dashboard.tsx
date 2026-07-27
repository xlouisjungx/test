import { CalendarCheck, List, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ListingStatusChip, VisitStatusChip } from '../../components/supplier/ui'
import { getListings } from '../../repositories/listingsRepository'
import { getSupplierVisits } from '../../repositories/supplierVisitsRepository'
import { photoCompleteness, publishChecklist } from '../../services/publication'
import type { ListingStatus } from '../../types/supplier'
import { LISTING_STATUS_META } from '../../types/supplier'

const STAT_ORDER: ListingStatus[] = ['draft', 'incomplete', 'analysis_pending', 'review_required', 'published']

export default function SupplierDashboard() {
  const listings = getListings().filter((l) => l.status !== 'archived')
  const visits = getSupplierVisits()

  const counts = listings.reduce(
    (acc, l) => {
      acc[l.status] = (acc[l.status] ?? 0) + 1
      return acc
    },
    {} as Record<ListingStatus, number>,
  )
  const photoIncomplete = listings.filter((l) => photoCompleteness(l).missing.length > 0)
  const newVisits = visits.filter((v) => v.status === '신청 접수')
  const confirmedVisits = visits.filter((v) => v.status === '방문 확정')
  const needsWork = listings
    .map((l) => ({ listing: l, failures: publishChecklist(l).filter((c) => !c.ok) }))
    .filter((x) => x.failures.length > 0 && x.listing.status !== 'published')

  const stats: { label: string; value: number; chip?: string }[] = [
    { label: '전체 등록 빈집', value: listings.length },
    ...STAT_ORDER.map((s) => ({ label: LISTING_STATUS_META[s].label, value: counts[s] ?? 0, chip: LISTING_STATUS_META[s].chip })),
    { label: '사진 미완료', value: photoIncomplete.length, chip: 'bg-tangerine-light text-tangerine-dark' },
    { label: '신규 방문 신청', value: newVisits.length, chip: 'bg-tangerine-light text-tangerine-dark' },
    { label: '확정된 방문 일정', value: confirmedVisits.length, chip: 'bg-forest text-white' },
  ]

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">공급자 대시보드</h1>
        <div className="flex flex-wrap gap-2">
          <Link to="/supplier/listings/new" className="inline-flex items-center gap-1.5 rounded-xl bg-tangerine px-4 py-2.5 text-sm font-bold text-white hover:bg-tangerine-sub focus:outline-2 focus:outline-offset-2 focus:outline-tangerine-sub">
            <Plus className="size-4" aria-hidden />새 빈집 등록
          </Link>
          <Link to="/supplier/listings" className="inline-flex items-center gap-1.5 rounded-xl border border-tangerine-sub bg-white px-4 py-2.5 text-sm font-bold text-tangerine-dark hover:bg-tangerine-light/40 focus:outline-2 focus:outline-offset-2 focus:outline-tangerine-sub">
            <List className="size-4" aria-hidden />등록 빈집 관리
          </Link>
          <Link to="/supplier/visits" className="inline-flex items-center gap-1.5 rounded-xl border border-tangerine-sub bg-white px-4 py-2.5 text-sm font-bold text-tangerine-dark hover:bg-tangerine-light/40 focus:outline-2 focus:outline-offset-2 focus:outline-tangerine-sub">
            <CalendarCheck className="size-4" aria-hidden />방문 신청 관리
          </Link>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-sand">
            <p className="text-xs font-medium text-stone">{s.label}</p>
            <p className="mt-1 text-2xl font-extrabold">{s.value}</p>
            {s.chip && <span className={`mt-1 inline-block h-1.5 w-8 rounded-full ${s.chip.split(' ')[0]}`} aria-hidden />}
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-sand">
          <h2 className="font-bold">최근 등록한 빈집</h2>
          <ul className="mt-3 divide-y divide-sand">
            {[...listings]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .slice(0, 4)
              .map((l) => {
                const photos = photoCompleteness(l)
                return (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link to={`/supplier/listings/${l.id}/edit`} className="font-semibold hover:text-forest">
                        {l.basic.name || '(이름 없음)'}
                      </Link>
                      <p className="text-xs text-stone">
                        {l.basic.region} · 사진 {photos.covered.length}/{photos.required.length}장 · {l.supplierType}
                      </p>
                    </div>
                    <ListingStatusChip status={l.status} />
                  </li>
                )
              })}
          </ul>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-sand">
          <h2 className="font-bold">최근 방문 신청</h2>
          <ul className="mt-3 divide-y divide-sand">
            {visits.slice(0, 4).map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link to={`/supplier/visits/${v.id}`} className="font-semibold hover:text-forest">
                    {v.name} · {v.houseName}
                  </Link>
                  <p className="text-xs text-stone">
                    희망일 {v.visitDate} · {v.timeSlot}
                  </p>
                </div>
                <VisitStatusChip status={v.status} />
              </li>
            ))}
            {visits.length === 0 && <li className="py-2.5 text-sm text-stone">아직 방문 신청이 없어요.</li>}
          </ul>
        </section>
      </div>

      <section className="mt-4 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-sand">
        <h2 className="font-bold">정보 보완이 필요한 빈집</h2>
        <ul className="mt-3 space-y-2">
          {needsWork.slice(0, 5).map(({ listing, failures }) => (
            <li key={listing.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-tangerine-light/30 px-3.5 py-2.5">
              <div>
                <Link to={`/supplier/listings/${listing.id}/edit`} className="text-sm font-semibold hover:text-forest">
                  {listing.basic.name || '(이름 없음)'}
                </Link>
                <p className="text-xs text-stone">
                  {failures.length}개 항목 남음 — {failures.slice(0, 2).map((f) => f.label).join(', ')}
                  {failures.length > 2 ? ' 외' : ''}
                </p>
              </div>
              <ListingStatusChip status={listing.status} />
            </li>
          ))}
          {needsWork.length === 0 && <li className="text-sm text-stone">보완이 필요한 빈집이 없어요.</li>}
        </ul>
      </section>
    </div>
  )
}
