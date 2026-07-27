import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <p className="text-3xl font-bold text-basalt-900">페이지를 찾을 수 없습니다</p>
      <p className="mt-2 text-sm text-basalt-500">주소가 잘못되었거나 삭제된 페이지입니다.</p>
      <Link to="/supplier" className="mt-4 inline-block rounded-xl bg-citrus-500 px-5 py-2.5 text-[17px] font-bold text-white hover:bg-citrus-400">
        공급자 홈으로 이동
      </Link>
    </div>
  )
}
