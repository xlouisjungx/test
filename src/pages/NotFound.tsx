import { useNavigate } from 'react-router-dom'
import { ErrorState } from '../components/ui'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <ErrorState
      title="페이지를 찾을 수 없어요"
      message="주소가 잘못되었거나 삭제된 페이지예요."
      onRetry={() => navigate('/')}
      retryLabel="홈으로 가기"
    />
  )
}
