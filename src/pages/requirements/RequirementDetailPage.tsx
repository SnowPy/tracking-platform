import { Navigate, useParams } from 'react-router-dom'

export default function RequirementDetailPage() {
  const { id } = useParams<{ id: string }>()
  const target = id ? `/requirements?detail=${encodeURIComponent(id)}` : '/requirements'

  return <Navigate to={target} replace />
}
