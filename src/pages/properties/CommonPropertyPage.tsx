import PropertyListPage from '../../components/PropertyListPage'
import {
  getCommonProperties,
  createCommonProperty,
  updateCommonProperty,
  deleteCommonProperty,
} from '../../api/properties'

export default function CommonPropertyPage() {
  return (
    <PropertyListPage
      title="公共属性"
      fetchFn={getCommonProperties}
      createFn={createCommonProperty}
      updateFn={updateCommonProperty}
      deleteFn={deleteCommonProperty}
    />
  )
}
