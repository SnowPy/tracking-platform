import PropertyListPage from '../../components/PropertyListPage'
import {
  getUserProperties,
  createUserProperty,
  updateUserProperty,
  deleteUserProperty,
} from '../../api/properties'

export default function UserPropertyPage() {
  return (
    <PropertyListPage
      title="用户属性"
      fetchFn={getUserProperties}
      createFn={createUserProperty}
      updateFn={updateUserProperty}
      deleteFn={deleteUserProperty}
    />
  )
}
