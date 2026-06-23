import PropertyListPage from '../../components/PropertyListPage'
import {
  getCommonProperties,
  createCommonProperty,
  updateCommonProperty,
  deleteCommonProperty,
} from '../../api/properties'
import { useProjectStore } from '../../stores/projectStore'

export default function CommonPropertyPage() {
  const projectId = useProjectStore((s) => s.currentProjectId)

  if (!projectId) return null

  return (
    <PropertyListPage
      title="公共属性"
      projectId={projectId}
      fetchFn={getCommonProperties}
      createFn={createCommonProperty}
      updateFn={updateCommonProperty}
      deleteFn={deleteCommonProperty}
    />
  )
}
