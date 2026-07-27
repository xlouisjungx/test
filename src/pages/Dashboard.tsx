import { Link, useNavigate } from 'react-router-dom'
import { Plus, List, CalendarCheck } from 'lucide-react'
import type { ListingStatus } from '../types'
import { listingsRepo, visitsRepo } from '../repositories'
import { LISTING_STATUS_META } from '../data/constants'
import { photoCompleteness } from '../services/photos'
import { publishChecklist } from '../services/publication'
import { Btn, Card, StatusBadge, VisitBadge, Section, DemoBadge } from '../components/ui'

function StatCard({ label, value, cls }: { label: string; value: number; cls?: string }) {
  return (
    <div className="rounded-xl border border-sand-200 bg-white p-3">
      <p className="text-xs text-basalt-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${cls ?? 'text-basalt-900'}`}>{value}</p>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const listings = listingsRepo.all().filter((l) => l.status !== 'archived')
  const visits = visitsRepo.all()

  const count = (s: ListingStatus) => listings.filter((l) => l.status === s).length
  const newVisits = visits.filter((v) => v.status === 'received').length
  const confirmedVisits = visits.filter((v) => v.status === 'confirmed').length

  const recentListings = [...listings].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3)
  const recentVisits = [...visits].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)).slice(0, 3)
  const needsAttention = listings
    .map((l) => {
      const failed = publishChecklist(l).filter((c) => !c.ok)
      return { listing: l, failed }
    })
    .filter((x) => x.listing.status !== 'published' && x.listing.status !== 'paused' && x.failed.length > 0)
    .slice(0, 3)

  const listingName = (id: string) => listingsRepo.get(id)?.basic.name ?? '(삭제된 매물)'

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-bold leading-tight text-basalt-900">공급자 대시보드</h1>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => navigate('/supplier/listings/new')}>
            <Plus className="h-4 w-4" aria-hidden /> 새 빈집 등록
          </Btn>
          <Btn variant="secondary" onClick={() => navigate('/supplier/listings')}>
            <List className="h-4 w-4" aria-hidden /> 등록 빈집 관리
          </Btn>
          <Btn variant="secondary" onClick={() => navigate('/supplier/visits')}>
            <CalendarCheck className="h-4 w-4" aria-hidden /> 방문 신청 관리
          </Btn>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatCard label="전체 등록 빈집" value={listings.length} />
        <StatCard label={LISTING_STATUS_META.draft.label} value={count('draft')} cls="text-basalt-500" />
        <StatCard label="사진 미완료" value={count('incomplete')} cls="text-citrus-600" />
        <StatCard label={LISTING_STATUS_META.analysis_pending.label} value={count('analysis_pending')} cls="text-basalt-500" />
        <StatCard label={LISTING_STATUS_META.review_required.label} value={count('review_required')} cls="text-citrus-600" />
        <StatCard label={LISTING_STATUS_META.published.label} value={count('published')} cls="text-pine-600" />
        <StatCard label="신규 방문 신청" value={newVisits} cls="text-citrus-600" />
        <StatCard label="확정된 방문 일정" value={confirmedVisits} cls="text-pine-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="최근 등록한 빈집">
          <div className="space-y-2">
            {recentListings.map((l) => {
              const c = photoCompleteness(l.photos, l.photoNA)
              return (
                <Link key={l.id} to={`/supplier/listings/${l.id}/edit`} className="block">
                  <Card className="flex items-center gap-3 transition-colors hover:border-pine-500">
                    {l.photos[0]?.dataUrl ? (
                      <img src={l.photos[0].dataUrl} alt="" className="h-14 w-20 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg bg-sand-100 text-[10px] text-basalt-500">사진 없음</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate font-medium text-basalt-900">{l.basic.name || '(이름 없음)'}</p>
                        {l.isDemo && <DemoBadge />}
                      </div>
                      <p className="mt-0.5 text-xs text-basalt-500">
                        {l.basic.region} · 사진 {c.registered}/{c.requiredTotal}개 등록
                      </p>
                    </div>
                    <StatusBadge status={l.status} />
                  </Card>
                </Link>
              )
            })}
          </div>
        </Section>

        <Section title="최근 방문 신청">
          <div className="space-y-2">
            {recentVisits.map((v) => (
              <Link key={v.id} to={`/supplier/visits/${v.id}`} className="block">
                <Card className="flex items-center justify-between gap-3 transition-colors hover:border-pine-500">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-basalt-900">
                      {v.applicantName} → {listingName(v.listingId)}
                    </p>
                    <p className="mt-0.5 text-xs text-basalt-500">희망 방문일 {v.preferredDate} {v.preferredTime}</p>
                  </div>
                  <VisitBadge status={v.status} />
                </Card>
              </Link>
            ))}
          </div>
        </Section>
      </div>

      {needsAttention.length > 0 && (
        <Section title="정보 보완이 필요한 빈집">
          <div className="space-y-2">
            {needsAttention.map(({ listing, failed }) => (
              <Card key={listing.id} className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-basalt-900">{listing.basic.name || '(이름 없음)'}</p>
                  <p className="mt-0.5 text-xs text-citrus-600">
                    {failed.slice(0, 2).map((f) => f.label).join(' · ')}
                    {failed.length > 2 && ` 외 ${failed.length - 2}건 남음`}
                  </p>
                </div>
                <Btn variant="secondary" onClick={() => navigate(`/supplier/listings/${listing.id}/edit`)}>
                  보완하기
                </Btn>
              </Card>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
