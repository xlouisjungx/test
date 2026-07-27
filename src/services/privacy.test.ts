import { describe, expect, it } from 'vitest'
import { SEED_LISTINGS } from '../data/supplierSeed'
import { scoreHouse } from './scoring'
import type { UserConditions } from '../types'
import {
  buildPublicExport,
  containsSensitiveInfo,
  sensitiveValues,
  toPublicHouse,
  validatePublicExport,
} from './privacy'

const published = SEED_LISTINGS.find((l) => l.status === 'published')!

describe('공개 데이터 민감정보 제거', () => {
  it('변환된 공개 데이터에 소유자·주소·내부 메모가 포함되지 않는다', () => {
    const json = JSON.stringify(toPublicHouse(published))
    expect(containsSensitiveInfo(json, published)).toEqual([])
    for (const value of sensitiveValues(published)) {
      expect(json).not.toContain(value)
    }
  })

  it('민감 값 목록에 소유자 성명·연락처·상세주소가 포함된다', () => {
    const values = sensitiveValues(published)
    expect(values).toContain(published.consent.ownerName)
    expect(values).toContain(published.consent.ownerContact)
    expect(values).toContain(published.basic.fullAddress)
  })

  it('JSON 내보내기 전체에서도 민감정보가 검출되지 않는다', () => {
    const json = JSON.stringify(buildPublicExport([published]))
    expect(containsSensitiveInfo(json, published)).toEqual([])
  })
})

describe('수요자 스키마 호환', () => {
  it('변환 결과가 수요자용 공개 스키마 검증을 통과한다', () => {
    const data = buildPublicExport([published])
    expect(validatePublicExport(data)).toBe(true)
  })

  it('스키마가 다른 JSON은 거부한다', () => {
    expect(validatePublicExport({ schema: 'other', version: 1, houses: [] })).toBe(false)
    expect(validatePublicExport({ schema: 'teojabang-public-houses', version: 1, houses: [{ id: 1 }] })).toBe(false)
    expect(validatePublicExport(null)).toBe(false)
  })

  it('변환된 매물로 수요자 적합도 점수를 계산할 수 있다', () => {
    const house = toPublicHouse(published)
    const conditions: UserConditions = {
      regions: ['애월읍'],
      crop: '감귤',
      farmLocation: '',
      maxTravelMinutes: 10,
      budget: { maxDeposit: 3000, maxMonthlyRent: 60, repairBudget: 2000, maxInitialCost: 5000 },
      vehicles: ['1톤 트럭'],
      vehicleAccessRequired: true,
      parkingRequired: true,
      storageRequired: true,
      yardRequired: false,
      farmStorageRequired: false,
      requiredUtilities: ['water', 'electricity'],
      priorities: [],
    }
    const score = scoreHouse(house, conditions)
    expect(score.total).toBeGreaterThan(0)
    expect(score.total).toBeLessThanOrEqual(100)
    expect(score.breakdown).toHaveLength(6)
  })
})

describe('판단 불가 항목 표현', () => {
  it('판단 불가 항목은 “이상 없음”이 아니라 확인 필요 정보로 노출된다', () => {
    const house = toPublicHouse(published)
    const undetermined = house.photoAnalysis.filter((a) => a.burden === '판단 불가')
    for (const item of undetermined) {
      expect(item.needsSiteCheck).toBe(true)
    }
    expect(house.unknownFromPhotos.length).toBeGreaterThan(0)
  })
})
