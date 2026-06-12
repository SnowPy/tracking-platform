import { useEffect, useState } from 'react'
import { Card, message } from 'antd'
import PropertyTable from '../../components/PropertyTable'
import type { PropertyItem } from '../../components/PropertyTable'
import {
  getUserProperties,
  createUserProperty,
  updateUserProperty,
  deleteUserProperty,
} from '../../api/properties'

export default function UserPropertyPage() {
  const [data, setData] = useState<PropertyItem[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await getUserProperties()
      setData(result)
    } catch (err: any) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>用户属性</h2>
      <Card>
        <PropertyTable
          dataSource={data}
          loading={loading}
          onCreate={async (values) => { await createUserProperty(values); await loadData() }}
          onUpdate={async (id, values) => { await updateUserProperty(id, values); await loadData() }}
          onDelete={async (id) => { await deleteUserProperty(id); await loadData() }}
        />
      </Card>
    </div>
  )
}
