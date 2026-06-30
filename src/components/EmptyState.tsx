import { Empty, Button } from 'antd'
import { FileAddOutlined, SearchOutlined, ReloadOutlined, WifiOutlined } from '@ant-design/icons'

type EmptyScene = 'no_data' | 'filter_empty' | 'load_error' | 'network_error'

const SCENE_CONFIG: Record<EmptyScene, {
  icon: React.ReactNode
  description: string
  detail?: string
  actionLabel?: string
}> = {
  no_data: {
    icon: <FileAddOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />,
    description: '暂无数据',
    detail: '创建第一条记录开始使用吧',
    actionLabel: '立即创建',
  },
  filter_empty: {
    icon: <SearchOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />,
    description: '当前条件下无匹配结果',
    detail: '试试调整筛选条件',
    actionLabel: '清空筛选',
  },
  load_error: {
    icon: <ReloadOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />,
    description: '加载失败',
    detail: '请检查网络后重试',
    actionLabel: '重试',
  },
  network_error: {
    icon: <WifiOutlined style={{ fontSize: 48, color: '#faad14' }} />,
    description: '网络连接异常',
    detail: '请检查网络连接后重试',
    actionLabel: '重试',
  },
}

interface EmptyStateProps {
  scene: EmptyScene
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  /** 筛选场景下的额外属性名，如 "事件" */
  itemName?: string
}

export default function EmptyState({ scene, title, description, actionLabel, onAction, itemName }: EmptyStateProps) {
  const config = SCENE_CONFIG[scene]

  const desc = description || (itemName ? `一个${itemName}也没有，创建你的第一个吧` : config.detail)
  const label = actionLabel || config.actionLabel

  return (
    <Empty
      image={config.icon}
      description={
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#595959', marginBottom: 4 }}>
            {title || config.description}
          </div>
          <div style={{ fontSize: 13, color: '#8c8c8c' }}>
            {desc}
          </div>
        </div>
      }
    >
      {onAction && label && (
        <Button type="primary" onClick={onAction}>
          {label}
        </Button>
      )}
    </Empty>
  )
}
