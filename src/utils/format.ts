/** 금액(만 원) 표기 유틸 */

export const manwon = (n: number) => `${n.toLocaleString()}만 원`

export const manwonRange = (min: number, max: number) =>
  `${min.toLocaleString()}~${max.toLocaleString()}만 원`

export const pyeong = (m2: number) => Math.round(m2 * 0.3025)
