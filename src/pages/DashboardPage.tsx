import { useEffect, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Row, Col, Card, Statistic, Space, Tag, Typography, theme, message, Button } from 'antd'
import {
  ThunderboltOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
  FileTextOutlined, RightOutlined,
} from '@ant-design/icons'
import { getEventStats, getEvents } from '../api/events'
import { getRequirements } from '../api/requirements'
import type { TrackingEvent, Requirement } from '../types'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import { useProjectStore } from '../stores/projectStore'

const { Text } = Typography

const pageMaxWidth = 1200

const cardStyle = {
  height: '100%',
  borderRadius: 8,
} as const

const listCardStyle = {
  ...cardStyle,
  minHeight: 260,
} as const

export default function DashboardPage() {
  const navigate = useNavigate()
  const { token } = theme.useToken()
  const projectId = useProjectStore((s) => s.currentProjectId)
  const [stats, setStats] = useState({ total: 0, active: 0, deprecated: 0 })
  const [recentEvents, setRecentEvents] = useState<TrackingEvent[]>([])
  const [pendingReqs, setPendingReqs] = useState<Requirement[]>([])
  const [loading, setLoading] = useState(true)

  const getNavigationCardProps = (path: string) => ({
    role: 'link',
    tabIndex: 0,
    onClick: () => navigate(path),
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Enter' || event.key === ' ') navigate(path)
    },
  })

  useEffect(() => {
    const load = async () => {
      if (!projectId) return
      try {
        const [eventStats, events, reqs] = await Promise.all([
          getEventStats(projectId),
          getEvents({ projectId, page: 1 }).then((r) => r.data.slice(0, 5)),
          getRequirements(projectId),
        ])
        setStats(eventStats)
        setRecentEvents(events)
        setPendingReqs(reqs.filter((r) => r.status === 'pending' || r.status === 'in_progress'))
      } catch (err) {
        message.error('加载仪表盘数据失败，请刷新页面重试')
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  return (
    <div style={{ maxWidth: pageMaxWidth, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.25 }}>总览</h1>
          <Text type="secondary">查看当前项目的事件资产和待处理需求</Text>
        </div>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[12, 12]}>
        <Col xs={12} md={6}>
          <Card hoverable {...getNavigationCardProps('/events')} loading={loading} style={cardStyle}>
            <Statistic
              title="事件总数"
              value={stats.total}
              prefix={<ThunderboltOutlined />}
              suffix="个"
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card hoverable {...getNavigationCardProps('/events?status=active')} loading={loading} style={cardStyle}>
            <Statistic
              title="启用中"
              value={stats.active}
              prefix={<CheckCircleOutlined />}
              suffix="个"
              styles={{ content: { color: token.colorSuccess } }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card hoverable {...getNavigationCardProps('/events?status=deprecated')} loading={loading} style={cardStyle}>
            <Statistic
              title="已废弃"
              value={stats.deprecated}
              prefix={<ExclamationCircleOutlined />}
              suffix="个"
              styles={{ content: { color: token.colorWarning } }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card hoverable {...getNavigationCardProps('/requirements')} loading={loading} style={cardStyle}>
            <Statistic
              title="待处理需求"
              value={pendingReqs.length}
              prefix={<FileTextOutlined />}
              suffix="个"
              styles={{ content: { color: token.colorPrimary } }}
            />
          </Card>
        </Col>
      </Row>

      {/* 最近事件 & 需求 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card
            title="最近更新事件"
            loading={loading}
            style={listCardStyle}
            extra={<Button type="link" size="small" onClick={() => navigate('/events')}>全部 <RightOutlined /></Button>}
          >
            {recentEvents.length === 0 ? (
              <EmptyState scene="no_data" itemName="事件" onAction={() => navigate('/events')} actionLabel="前往创建" />
            ) : (
              <div className="dashboard-list">
                {recentEvents.map((item) => (
                  <button key={item.id} type="button" className="dashboard-list-item" onClick={() => navigate(`/events/${item.id}`)}>
                    <span className="management-identity">
                      <Text strong ellipsis={{ tooltip: item.display_name || item.name }}>{item.display_name || item.name}</Text>
                      <Text code ellipsis={{ tooltip: item.name }}>{item.name}</Text>
                    </span>
                    <Space size={4} wrap>
                      <StatusBadge status={item.status} type="event" />
                      {item.categories?.name && <Tag>{item.categories.name}</Tag>}
                    </Space>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="待处理需求"
            loading={loading}
            style={listCardStyle}
            extra={<Button type="link" size="small" onClick={() => navigate('/requirements')}>全部 <RightOutlined /></Button>}
          >
            {pendingReqs.length === 0 ? (
              <EmptyState scene="no_data" itemName="待处理需求" onAction={() => navigate('/requirements')} actionLabel="提交需求" />
            ) : (
              <div className="dashboard-list">
                {pendingReqs.slice(0, 5).map((item) => (
                  <button key={item.id} type="button" className="dashboard-list-item" onClick={() => navigate(`/requirements/${item.id}`)}>
                    <Text strong ellipsis={{ tooltip: item.display_name || item.event_name || item.title }}>
                      {item.display_name || item.event_name || item.title}
                    </Text>
                    <StatusBadge status={item.status} type="requirement" />
                  </button>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
