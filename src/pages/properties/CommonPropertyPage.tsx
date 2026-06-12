import { useEffect, useState } from 'react'
import { Card, message } from 'antd'
import PropertyTable from '../../components/PropertyTable'
import type { PropertyItem } from '../../components/PropertyTable'
import {
  getCommonProperties,
  createCommonProperty,
  updateCommonProperty,
  deleteCommonProperty,
} from '../../api/properties'

export default function CommonPropertyPage() {
  const [data, setData] = useState<PropertyItem[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await getCommonProperties()
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
      <h2 style={{ marginBottom: 16 }}>公共属性</h2>
      <Card>
        <PropertyTable
          dataSource={data}
          loading={loading}
          onCreate={async (values) => { await createCommonProperty(values); await loadData() }}
          onUpdate={async (id, values) => { await updateCommonProperty(id, values); await loadData() }}
          onDelete={async (id) => { await deleteCommonProperty(id); await loadData() }}
        />
      </Card>
    </div>
  )
}
