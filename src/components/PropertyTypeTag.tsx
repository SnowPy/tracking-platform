import { Tag } from 'antd'
import { usePropertyTypeMap } from '../hooks/usePropertyTypes'

interface PropertyTypeTagProps {
  type: string
  projectId?: string
}

export default function PropertyTypeTag({ type, projectId }: PropertyTypeTagProps) {
  const types = usePropertyTypeMap(projectId)
  const config = types[type]
  return <Tag color={config?.color || '#999'}>{config?.label || type}</Tag>
}
