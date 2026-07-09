import PropertyListPage from '../../components/PropertyListPage'
import {
  getUserProperties,
  createUserProperty,
  updateUserProperty,
  deleteUserProperty,
} from '../../api/properties'
import { useProjectStore } from '../../stores/projectStore'

export default function UserPropertyPage() {
  const projectId = useProjectStore((s) => s.currentProjectId)

  if (!projectId) return null

  return (
    <PropertyListPage
      title="用户属性"
      projectId={projectId}
      tableResizeKey="user-properties"
      fetchFn={getUserProperties}
      createFn={createUserProperty}
      updateFn={updateUserProperty}
      deleteFn={deleteUserProperty}
    />
  )
}
