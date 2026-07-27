import { useRef, useState } from 'react'
import { Star, Trash2, ArrowUp, ArrowDown, ImagePlus, ShieldAlert } from 'lucide-react'
import type { HousePhoto, PhotoCategory } from '../types'
import { PHOTO_CATEGORY_META, REQUIRED_PHOTO_CATEGORIES } from '../data/constants'
import {
  MIN_PHOTO_HEIGHT,
  MIN_PHOTO_WIDTH,
  photoCompleteness,
  validatePhotoFile,
  type FileValidationError,
} from '../services/photos'
import { uid } from '../repositories/storage'
import { Card, CheckboxRow, ErrorBox, inputCls } from './ui'

/** 원본 대신 축소본(dataURL)을 저장해 localStorage 용량을 아낀다 */
async function fileToThumbnail(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('이미지를 읽을 수 없습니다.'))
      el.src = url
    })
    const scale = Math.min(1, 1024 / img.width)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return { dataUrl: canvas.toDataURL('image/jpeg', 0.72), width: img.width, height: img.height }
  } finally {
    URL.revokeObjectURL(url)
  }
}

interface Props {
  photos: HousePhoto[]
  photoNA: PhotoCategory[]
  onChange: (photos: HousePhoto[]) => void
  onChangeNA: (na: PhotoCategory[]) => void
}

export default function PhotoUploader({ photos, photoNA, onChange, onChangeNA }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [errors, setErrors] = useState<FileValidationError[]>([])
  const [busy, setBusy] = useState(false)
  const completeness = photoCompleteness(photos, photoNA)

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setBusy(true)
    const nextErrors: FileValidationError[] = []
    const added: HousePhoto[] = []
    let current = [...photos]
    for (const file of Array.from(files)) {
      const err = validatePhotoFile(file, current)
      if (err) {
        nextErrors.push(err)
        continue
      }
      try {
        const { dataUrl, width, height } = await fileToThumbnail(file)
        if (width < MIN_PHOTO_WIDTH || height < MIN_PHOTO_HEIGHT) {
          nextErrors.push({
            fileName: file.name,
            reason: `이미지가 너무 작습니다(${width}×${height}). 최소 ${MIN_PHOTO_WIDTH}×${MIN_PHOTO_HEIGHT} 이상으로 다시 촬영하세요.`,
          })
          continue
        }
        const photo: HousePhoto = {
          id: uid(),
          category: 'etc',
          fileName: file.name,
          dataUrl,
          isPrimary: current.length === 0 && added.length === 0,
          isPublic: true,
          order: current.length + added.length,
        }
        added.push(photo)
        current = [...current, photo]
      } catch {
        nextErrors.push({ fileName: file.name, reason: '사진 등록에 실패했습니다. 파일이 손상되지 않았는지 확인한 뒤 다시 시도하세요.' })
      }
    }
    setErrors(nextErrors)
    if (added.length > 0) onChange([...photos, ...added])
    setBusy(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const update = (id: string, patch: Partial<HousePhoto>) => {
    onChange(photos.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }
  const remove = (id: string) => {
    const rest = photos.filter((p) => p.id !== id).map((p, i) => ({ ...p, order: i }))
    if (rest.length > 0 && !rest.some((p) => p.isPrimary)) rest[0] = { ...rest[0], isPrimary: true }
    onChange(rest)
  }
  const setPrimary = (id: string) => {
    onChange(photos.map((p) => ({ ...p, isPrimary: p.id === id })))
  }
  const move = (id: string, dir: -1 | 1) => {
    const sorted = [...photos].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex((p) => p.id === id)
    const target = idx + dir
    if (target < 0 || target >= sorted.length) return
    ;[sorted[idx], sorted[target]] = [sorted[target], sorted[idx]]
    onChange(sorted.map((p, i) => ({ ...p, order: i })))
  }
  const toggleNA = (cat: PhotoCategory) => {
    onChangeNA(photoNA.includes(cat) ? photoNA.filter((c) => c !== cat) : [...photoNA, cat])
  }

  const sorted = [...photos].sort((a, b) => a.order - b.order)
  const categoryOptions = [
    ...REQUIRED_PHOTO_CATEGORIES.map((c) => ({ value: c as string, label: PHOTO_CATEGORY_META[c].label })),
    { value: 'etc', label: '기타' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-citrus-500/30 bg-citrus-100/60 p-3 text-xs leading-relaxed text-basalt-700">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-citrus-600" aria-hidden />
        <div>
          <p className="font-medium">개인정보 보호 안내</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>사람 얼굴이 나온 사진은 피해주세요.</li>
            <li>신분증·계약서·우편물 등 개인정보가 보이는 사진은 등록하지 마세요.</li>
            <li>전체 상세주소·소유자 연락처가 사진에 노출되지 않게 확인하세요.</li>
          </ul>
        </div>
      </div>

      <Card>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-basalt-900">
            촬영 가이드 충족도 — {completeness.registered}/{completeness.requiredTotal}개 분류 ({completeness.percent}%) <span className="font-normal text-basalt-500">· 권장 사항</span>
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl bg-citrus-500 px-4 py-2 text-sm font-bold text-white hover:bg-citrus-400 disabled:bg-citrus-100"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            <ImagePlus className="h-4 w-4" aria-hidden /> {busy ? '등록 중…' : '사진 추가'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            aria-label="사진 파일 선택"
            onChange={(e) => void addFiles(e.target.files)}
          />
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-sand-100" role="progressbar" aria-valuenow={completeness.percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-pine-500 transition-all" style={{ width: `${completeness.percent}%` }} />
        </div>
        <p className="mt-1 text-[11px] text-basalt-500">
          아래 분류는 표준 촬영 가이드(권장)입니다. 모든 분류가 필수는 아니며 사진 1장만 있어도 등록·분석·공개가 가능하지만,
          많이 채울수록 분석 범위와 수요자 신뢰가 높아집니다. 충족도는 분류 등록 여부만 검사하는 단순 확인이며, 사진
          품질(어두움·흔들림)에 대한 AI 판정이 아닙니다.
        </p>
        <ul className="mt-3 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
          {REQUIRED_PHOTO_CATEGORIES.map((cat) => {
            const meta = PHOTO_CATEGORY_META[cat]
            const has = photos.some((p) => p.category === cat)
            const na = completeness.notApplicable.includes(cat)
            return (
              <li key={cat} className="flex items-center justify-between gap-2 rounded-lg border border-sand-100 px-2 py-1.5">
                <span className={na ? 'text-basalt-500 line-through' : has ? 'text-pine-700' : 'text-basalt-700'}>
                  {has ? '✓ ' : na ? '— ' : '○ '}
                  {meta.label}
                  {na && ' (해당 공간 없음)'}
                </span>
                {meta.naAllowed && !has && (
                  <button type="button" className="shrink-0 text-[11px] text-basalt-500 underline" onClick={() => toggleNA(cat)}>
                    {na ? '되돌리기' : '해당 공간 없음'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </Card>

      {errors.length > 0 && (
        <ErrorBox
          title={`사진 ${errors.length}장을 등록하지 못했습니다`}
          detail={errors.map((e) => `${e.fileName}: ${e.reason}`).join(' / ')}
        />
      )}

      <ul className="space-y-2">
        {sorted.map((p, idx) => (
          <li key={p.id}>
            <Card className="flex flex-col gap-3 sm:flex-row">
              <img src={p.dataUrl} alt={p.caption ?? p.fileName} className="h-28 w-full rounded-lg object-cover sm:w-40" />
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className={`${inputCls} !w-auto`}
                    value={p.category}
                    aria-label="사진 분류"
                    onChange={(e) => update(p.id, { category: e.target.value as HousePhoto['category'] })}
                  >
                    {categoryOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
                      p.isPrimary ? 'border-citrus-500 bg-citrus-100 text-citrus-600' : 'border-sand-200 text-basalt-500'
                    }`}
                    onClick={() => setPrimary(p.id)}
                  >
                    <Star className="h-3.5 w-3.5" aria-hidden /> {p.isPrimary ? '대표사진' : '대표로 지정'}
                  </button>
                  <div className="ml-auto flex items-center gap-1">
                    <button type="button" aria-label="위로" className="rounded p-1 text-basalt-500 hover:bg-sand-100 disabled:opacity-30" disabled={idx === 0} onClick={() => move(p.id, -1)}>
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label="아래로" className="rounded p-1 text-basalt-500 hover:bg-sand-100 disabled:opacity-30" disabled={idx === sorted.length - 1} onClick={() => move(p.id, 1)}>
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label="사진 삭제" className="rounded-lg p-1 text-citrus-600 hover:bg-citrus-100/50" onClick={() => remove(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className={inputCls}
                    placeholder="사진 설명 (예: 안방 천장 모서리)"
                    aria-label="사진 설명"
                    value={p.caption ?? ''}
                    onChange={(e) => update(p.id, { caption: e.target.value })}
                  />
                  <input
                    type="date"
                    className={inputCls}
                    aria-label="촬영일"
                    value={p.takenAt ?? ''}
                    onChange={(e) => update(p.id, { takenAt: e.target.value })}
                  />
                </div>
                <CheckboxRow
                  id={`pub-${p.id}`}
                  checked={p.isPublic}
                  onChange={(v) => update(p.id, { isPublic: v })}
                  label="수요자에게 공개"
                />
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}
