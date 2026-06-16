import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Button, Tag, Space, Table, Typography, message, Popconfirm, Modal, Input } from 'antd'
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined, CheckOutlined, UserOutlined } from '@ant-design/icons'
import { supabase } from '../../supabase/client'
import { getRequirements, updateRequirement, deleteRequirement } from '../../api/requirements'
import { createEventProperty, updateEventProperty, deleteEventProperty } from '../../api/eventProperties'
import StatusBadge from '../../components/StatusBadge'
import type { Requirement, ProposedProperty } from '../../types'
import { PLATFORM_OPTIONS } from '../../types'

const { TextArea } = Input
const { Title, Text, Paragraph } = Typography

export default function RequirementDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [req, setReq] = useState<Requirement | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [comment, setComment] = useState('')

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await getRequirements()
      const found = data.find((r) => r.id === id)
      if (found) {
        setReq(found)
        setComment(found.comment || '')
      }
    } catch (e: any) { message.error(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const handleStatusChange = async (status: string) => {
    if (!req) return
    try {
      if (status === 'done') {
        const trackingType = (req as any).tracking_type || 'event'
        const typeLabel = trackingType === 'event' ? '事件' : trackingType === 'common_property' ? '公共属性' : '用户属性'

        const confirmed = await new Promise<boolean>((res) => {
          Modal.confirm({
            title: '确认完成并同步',
            content: req.modification_type === 'new'
              ? `将自动创建${typeLabel}「${req.event_name || req.display_name}」并同步，确认？`
              : `将自动更新${typeLabel}，确认？`,
            onOk: () => res(true), onCancel: () => res(false),
          })
        })
        if (!confirmed) return
        setSyncing(true)
        await updateRequirement(req.id, { status })

        // 同步逻辑
        if (trackingType === 'event') {
          if (req.modification_type === 'new') {
            const { data: newEvent } = await supabase.from('events').insert({
              name: req.event_name!, display_name: req.display_name || req.title,
              description: req.description, status: 'active',
              platforms: req.platforms || [],
              trigger_timing: req.trigger_timing || null,
            }).select().single()
            if (newEvent && req.proposed_properties?.length) {
              await supabase.from('event_properties').insert(
                req.proposed_properties.filter(p => !p.action || p.action === 'add').map(p => ({
                  event_id: newEvent.id, name: p.name,
                  display_name: p.display_name || p.name,
                  type: p.type, description: p.description, required: p.required,
                }))
              )
            }
            message.success('事件已创建')
          } else if (req.modification_type === 'modify' && req.event_id) {
            for (const p of req.proposed_properties || []) {
              if (p.action === 'delete' && p.existing_id) await deleteEventProperty(p.existing_id)
              else if (p.action === 'modify' && p.existing_id) await updateEventProperty(p.existing_id, {
                name: p.name, display_name: p.display_name, type: p.type, description: p.description, required: p.required,
              })
              else await createEventProperty({
                event_id: req.event_id, name: p.name, display_name: p.display_name || p.name,
                type: p.type, description: p.description, required: p.required,
              })
            }
            message.success('事件属性已更新')
          }
        } else {
          // 公共属性 / 用户属性同步
          const tableName = trackingType === 'common_property' ? 'common_properties' : 'user_properties'
          if (req.modification_type === 'new') {
            await supabase.from(tableName).insert({
              name: req.event_name!,
              display_name: req.display_name || req.title,
              type: 'string',
              description: req.description,
              platforms: req.platforms || [],
            })
            message.success(`${trackingType === 'common_property' ? '公共属性' : '用户属性'}已创建`)
          } else if (req.modification_type === 'modify' && req.event_id) {
            await supabase.from(tableName).update({
              name: req.event_name,
              display_name: req.display_name || req.title,
              description: req.description,
              platforms: req.platforms || [],
              updated_at: new Date().toISOString(),
            }).eq('id', req.event_id)
            message.success(`${trackingType === 'common_property' ? '公共属性' : '用户属性'}已更新`)
          }
        }
      } else {
        await updateRequirement(req.id, { status })
        message.success('状态已更新')
      }
      await load()
    } catch (e: any) {
      if (e?.code === '23505') {
        message.error(`「${req.event_name || req.display_name || req.title}」已存在，请勿重复同步`)
      } else {
        message.error(e.message)
      }
      setSyncing(false)
      return
    }
    finally { setSyncing(false) }
  }

  const handleClaim = async () => {
    if (!req) return
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await updateRequirement(req.id, { assignee_id: user.id, status: 'in_progress' })
      message.success('已认领')
      await load()
    }
  }

  const handleAddComment = async () => {
    if (!req || !comment.trim()) return
    await updateRequirement(req.id, { comment })
    message.success('备注已保存')
    await load()
  }

  const handleDelete = async () => {
    if (!req) return
    await deleteRequirement(req.id)
    message.success('已删除')
    navigate('/requirements')
  }

  if (!req) return null

  const platformTags = (req.platforms || []).map((p: string) => {
    const opt = PLATFORM_OPTIONS.find(o => o.value === p)
    return <Tag key={p} color={opt?.color}>{opt?.label || p}</Tag>
  })

  return (
    <div>
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/requirements')} style={{ padding: 0, marginBottom: 16 }}>
        返回需求列表
      </Button>

      <div style={{ display: 'flex', gap: 16 }}>
        {/* 左侧主内容 */}
        <div style={{ flex: 2 }}>
          <Card loading={loading}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Space>
                  <Title level={4} style={{ margin: 0 }}>{req.title}</Title>
                  <StatusBadge status={req.status} type="requirement" />
                  <Tag color={req.modification_type === 'new' ? 'blue' : 'green'}>
                    {req.modification_type === 'new' ? '新增' : '修改'}
                  </Tag>
                  {req.tracking_type && (
                    <Tag color={
                      req.tracking_type === 'event' ? 'purple' :
                      req.tracking_type === 'common_property' ? 'cyan' : 'geekblue'
                    }>
                      {req.tracking_type === 'event' ? '事件' :
                       req.tracking_type === 'common_property' ? '公共属性' : '用户属性'}
                    </Tag>
                  )}
                </Space>
              </div>
              <Space>
                {req.status === 'pending' && (
                  <Button icon={<UserOutlined />} onClick={handleClaim}>认领</Button>
                )}
                {req.status === 'in_progress' && (
                  <Button type="primary" icon={<CheckOutlined />} onClick={() => handleStatusChange('done')} loading={syncing}>
                    完成并同步
                  </Button>
                )}
                <Button icon={<EditOutlined />} onClick={() => { navigate('/requirements'); /* trigger edit */ }}>编辑</Button>
                <Popconfirm title="确定删除？" onConfirm={handleDelete}>
                  <Button danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            </div>

            <Descriptions column={2} size="small" style={{ marginTop: 16 }} bordered>
              <Descriptions.Item label="需求类型">
                <Tag color={req.modification_type === 'new' ? 'blue' : 'green'}>
                  {req.modification_type === 'new' ? '新增' : '修改'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="埋点类型">
                {req.tracking_type === 'event' ? '事件' :
                 req.tracking_type === 'common_property' ? '公共属性' : '用户属性'}
              </Descriptions.Item>
              <Descriptions.Item label="显示名">{req.display_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="优先级">
                <Tag color={req.priority === 'high' ? 'red' : req.priority === 'medium' ? 'orange' : 'default'}>
                  {req.priority === 'high' ? '高' : req.priority === 'medium' ? '中' : '低'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="版本号">{req.version || '-'}</Descriptions.Item>
              <Descriptions.Item label="目标平台">{platformTags.length > 0 ? <Space>{platformTags}</Space> : '-'}</Descriptions.Item>
              <Descriptions.Item label={req.tracking_type === 'event' ? '事件名' : '属性名'}>
                {req.event_name ? <code>{req.event_name}</code> : (req.events ? <code>{req.events.name}</code> : '-')}
              </Descriptions.Item>
              <Descriptions.Item label="触发时机">{req.trigger_timing || '-'}</Descriptions.Item>
              <Descriptions.Item label="提交人">{req.profiles_requester?.display_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="承接人">{req.profiles_assignee?.display_name || '未认领'}</Descriptions.Item>
              <Descriptions.Item label="创建时间" span={2}>
                {new Date(req.created_at).toLocaleString('zh-CN')}
              </Descriptions.Item>
            </Descriptions>

            {req.description && (
              <div style={{ marginTop: 16, padding: 12, background: '#fafafa', borderRadius: 6 }}>
                <Text strong>业务场景描述：</Text>
                <Paragraph style={{ marginBottom: 0, marginTop: 4 }}>{req.description}</Paragraph>
              </div>
            )}
            {req.trigger_timing && (
              <div style={{ marginTop: 12, padding: 12, background: '#f6ffed', borderRadius: 6 }}>
                <Text strong>触发时机：</Text>
                <Paragraph style={{ marginBottom: 0, marginTop: 4 }}>{req.trigger_timing}</Paragraph>
              </div>
            )}
          </Card>

          {/* 建议属性 */}
          <Card title="建议属性" style={{ marginTop: 16 }} loading={loading}>
            {!req.proposed_properties || req.proposed_properties.length === 0 ? (
              <Text type="secondary">无建议属性</Text>
            ) : (
              <Table
                dataSource={req.proposed_properties}
                rowKey={(r, i) => r.existing_id || `new-${i}`}
                pagination={false}
                size="small"
                columns={[
                  { title: '属性名', dataIndex: 'name', width: 140, render: (v: string) => <code>{v}</code> },
                  { title: '显示名', dataIndex: 'display_name', width: 120, render: (v: string) => v || '-' },
                  { title: '类型', dataIndex: 'type', width: 80 },
                  { title: '必填', dataIndex: 'required', width: 60, render: (v: boolean) => v ? '是' : '否' },
                  { title: '说明', dataIndex: 'description', ellipsis: true },
                  {
                    title: '操作', width: 80,
                    render: (_: any, r: ProposedProperty) => {
                      if (r.action === 'delete') return <Tag color="red">待删除</Tag>
                      if (r.action === 'modify') return <Tag color="orange">待修改</Tag>
                      if (r.action === 'add') return <Tag color="green">新增</Tag>
                      return <Tag>保留</Tag>
                    },
                  },
                ]}
              />
            )}
          </Card>
        </div>

        {/* 右侧备注 */}
        <div style={{ flex: 1, minWidth: 260 }}>
          <Card title="备注" size="small">
            <TextArea rows={4} value={comment} onChange={e => setComment(e.target.value)} placeholder="添加备注..." />
            <Button type="primary" size="small" style={{ marginTop: 8 }} onClick={handleAddComment}>保存备注</Button>
          </Card>

          <Card title="操作记录" size="small" style={{ marginTop: 16 }}>
            <Text type="secondary">
              创建于 {new Date(req.created_at).toLocaleString('zh-CN')}
            </Text>
            <br />
            <Text type="secondary">
              更新于 {new Date(req.updated_at).toLocaleString('zh-CN')}
            </Text>
          </Card>
        </div>
      </div>
    </div>
  )
}
