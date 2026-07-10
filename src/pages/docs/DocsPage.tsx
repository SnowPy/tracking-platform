import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Collapse, Empty, Input, message, Select, Space, Tabs, Tag, Typography } from 'antd'
import { FileExcelOutlined, FileMarkdownOutlined, SearchOutlined } from '@ant-design/icons'
import { getAllEvents } from '../../api/events'
import { getEventProperties } from '../../api/eventProperties'
import type { TrackingEvent, EventProperty } from '../../types'
import StatusBadge from '../../components/StatusBadge'
import PropertyTypeTag from '../../components/PropertyTypeTag'
import EmptyState from '../../components/EmptyState'
import ResizableTable from '../../components/ResizableTable'
import { useProjectStore } from '../../stores/projectStore'

const { Title, Paragraph, Text } = Typography

export default function DocsPage() {
  const navigate = useNavigate()
  const projectId = useProjectStore((s) => s.currentProjectId)
  const [events, setEvents] = useState<TrackingEvent[]>([])
  const [propertiesMap, setPropertiesMap] = useState<Record<string, EventProperty[]>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>()

  const categoryOptions = useMemo(() => {
    const names = new Set(events.map((event) => event.categories?.name).filter((name): name is string => Boolean(name)))
    return [...names].sort().map((name) => ({ value: name, label: name }))
  }, [events])

  const visibleEvents = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return events.filter((event) => {
      const matchesSearch = !keyword || event.name.toLowerCase().includes(keyword) || event.display_name.toLowerCase().includes(keyword)
      const matchesCategory = !categoryFilter || event.categories?.name === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [categoryFilter, events, search])

  useEffect(() => {
    const load = async () => {
      if (!projectId) return
      setLoading(true)
      try {
        const data = await getAllEvents(projectId)
        const activeEvents = data.filter((event) => event.status !== 'deprecated')
        setEvents(activeEvents)

        const map: Record<string, EventProperty[]> = {}
        await Promise.all(
          activeEvents.map(async (e) => {
            try { map[e.id] = await getEventProperties(e.id) } catch { console.warn(`加载事件 ${e.id} 属性失败`); map[e.id] = [] }
          })
        )
        setPropertiesMap(map)
      } catch (err) {
        message.error('加载埋点字典失败，请刷新重试')
        console.error('Docs load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  // 导出 CSV
  const handleExportCSV = () => {
    const rows = [['事件标识', '显示名称', '分类', '状态', '属性名', '属性显示名', '属性类型', '必填', '属性说明', '示例值']]
    events.forEach((e) => {
      const props = propertiesMap[e.id] || []
      if (props.length === 0) {
        rows.push([e.name, e.display_name, e.categories?.name || '', e.status, '', '', '', '', '', ''])
      } else {
        props.forEach((p: EventProperty) => {
          rows.push([e.name, e.display_name, e.categories?.name || '', e.status, p.name, p.display_name || '', p.type, p.required ? '是' : '否', p.description || '', p.example_value || ''])
        })
      }
    })
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = '埋点字典.csv'; a.click()
    URL.revokeObjectURL(url)
    message.success('CSV 已下载')
  }

  // 导出 Markdown
  const handleExportMD = () => {
    let md = '# 埋点字典\n\n'
    const byCategory: Record<string, TrackingEvent[]> = {}
    events.forEach((e) => {
      const cat = e.categories?.name || '未分类'
      if (!byCategory[cat]) byCategory[cat] = []
      byCategory[cat].push(e)
    })

    Object.entries(byCategory).forEach(([cat, evts]) => {
      md += `## ${cat}\n\n`
      evts.forEach((e) => {
        md += `### ${e.name} — ${e.display_name}\n\n`
        md += `- **状态**: ${e.status}\n`
        if (e.description) md += `- **描述**: ${e.description}\n`
        const props = propertiesMap[e.id] || []
        if (props.length > 0) {
          md += '\n| 属性名 | 显示名 | 类型 | 必填 | 说明 | 示例值 |\n'
          md += '|--------|--------|------|------|------|--------|\n'
          props.forEach((p: EventProperty) => {
            md += `| ${p.name} | ${p.display_name || '-'} | ${p.type} | ${p.required ? '是' : '否'} | ${p.description || '-'} | ${p.example_value || '-'} |\n`
          })
        }
        md += '\n'
      })
    })

    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = '埋点字典.md'; a.click()
    URL.revokeObjectURL(url)
    message.success('Markdown 已下载')
  }

  // 埋点字典 Tab
  const dictionaryTab = (
    <div>
      <div className="management-filter-bar" style={{ justifyContent: 'space-between' }}>
        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索事件标识或显示名称"
            style={{ width: 240 }}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select
            allowClear
            placeholder="全部分类"
            style={{ width: 160 }}
            value={categoryFilter}
            options={categoryOptions}
            onChange={setCategoryFilter}
          />
          <Text type="secondary">{visibleEvents.length} / {events.length} 个事件</Text>
        </Space>
        <Space>
          <Button icon={<FileExcelOutlined />} onClick={handleExportCSV}>导出 CSV</Button>
          <Button icon={<FileMarkdownOutlined />} onClick={handleExportMD}>导出 Markdown</Button>
        </Space>
      </div>
      {loading ? (
        <Text type="secondary">加载中...</Text>
      ) : events.length === 0 ? (
        <EmptyState scene="no_data" itemName="埋点事件" onAction={() => navigate('/events')} actionLabel="创建事件" />
      ) : visibleEvents.length === 0 ? (
        <Empty description="没有匹配的事件" />
      ) : (
        <Collapse
          size="small"
          items={visibleEvents.map((e) => ({
            key: e.id,
            label: (
              <Space>
                <code style={{ fontSize: 13, fontWeight: 600 }}>{e.name}</code>
                <Text type="secondary">{e.display_name}</Text>
                <StatusBadge status={e.status} type="event" />
                {e.categories?.name && <Tag>{e.categories.name}</Tag>}
              </Space>
            ),
            children: (
              <ResizableTable
                resizeKey="docs-event-properties-v2"
                dataSource={propertiesMap[e.id] || []}
                rowKey="id"
                pagination={false}
                size="small"
                locale={{ emptyText: '无事件属性' }}
                columns={[
                  { title: '属性名', dataIndex: 'name', key: 'name', width: 130, render: (v: string) => <code>{v}</code> },
                  { title: '显示名', dataIndex: 'display_name', key: 'display_name', width: 100, render: (v: string | null) => v || '-' },
                  { title: '类型', dataIndex: 'type', key: 'type', width: 80, render: (v: string) => <PropertyTypeTag type={v} projectId={projectId!} /> },
                  { title: '必填', dataIndex: 'required', key: 'required', width: 55, render: (v: boolean) => v ? '是' : '否' },
                  { title: '说明', dataIndex: 'description', key: 'description', render: (v: string | null) => v || '-' },
                  { title: '示例值', dataIndex: 'example_value', key: 'example_value', render: (v: string | null) => v || '-' },
                ]}
              />
            ),
          }))}
        />
      )}
    </div>
  )

  // 命名规范 Tab
  const conventionTab = (
    <Card>
      <Title level={4}>事件命名规范</Title>
      <Paragraph>
        事件标识（name）采用 <Text code>snake_case</Text> 命名方式，由小写字母、数字和下划线组成，以字母开头。
      </Paragraph>

      <Title level={5}>命名结构</Title>
      <Paragraph>
        <Text code>模块_动作_对象</Text>
      </Paragraph>

      <ResizableTable
        resizeKey="docs-event-name-examples"
        dataSource={[
          { example: 'page_view', desc: '页面浏览' },
          { example: 'button_click', desc: '按钮点击' },
          { example: 'search_submit', desc: '搜索提交' },
          { example: 'order_create', desc: '订单创建' },
          { example: 'video_play_start', desc: '视频开始播放' },
          { example: 'login_success', desc: '登录成功' },
          { example: 'share_article', desc: '分享文章' },
        ]}
        columns={[
          { title: '示例', dataIndex: 'example', key: 'example', render: (v: string) => <code>{v}</code> },
          { title: '说明', dataIndex: 'desc', key: 'desc' },
        ]}
        pagination={false}
        size="small"
        style={{ maxWidth: 500 }}
      />

      <Title level={4} style={{ marginTop: 32 }}>属性命名规范</Title>
      <Paragraph>
        属性名采用 <Text code>snake_case</Text> 命名，简洁表意。
      </Paragraph>

      <Title level={5}>公共属性（每个事件自动携带，无需在事件中重复定义）</Title>
      <ResizableTable
        resizeKey="docs-common-property-examples"
        dataSource={[
          { name: 'page_url', type: 'string', desc: '当前页面 URL' },
          { name: 'timestamp', type: 'number', desc: '事件触发时间戳（毫秒）' },
          { name: 'platform', type: 'string', desc: '平台：web/ios/android/miniapp' },
          { name: 'app_version', type: 'string', desc: '应用版本号' },
          { name: 'user_id', type: 'string', desc: '用户唯一标识（登录后）' },
        ]}
        columns={[
          { title: '属性名', dataIndex: 'name', key: 'name', render: (v: string) => <code>{v}</code> },
          { title: '类型', dataIndex: 'type', key: 'type', render: (v: string) => <Tag>{v}</Tag> },
          { title: '说明', dataIndex: 'desc', key: 'desc' },
        ]}
        pagination={false}
        size="small"
        style={{ maxWidth: 600 }}
      />

      <Title level={5} style={{ marginTop: 24 }}>命名要点</Title>
      <ul>
        <li><Text strong>一致性</Text>：同类事件使用相同前缀，如 <code>button_click_*</code>、<code>page_view_*</code></li>
        <li><Text strong>可读性</Text>：名称应让非技术人员也能大致理解含义</li>
        <li><Text strong>避免缩写</Text>：除非是业界通用缩写（如 <code>url</code>, <code>id</code>），否则使用完整单词</li>
        <li><Text strong>布尔属性</Text>：以 <code>is_</code> 或 <code>has_</code> 开头，如 <code>is_login</code>、<code>has_coupon</code></li>
      </ul>
    </Card>
  )

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>埋点文档</h2>
      <Tabs
        items={[
          { key: 'dictionary', label: '埋点字典', children: dictionaryTab },
          { key: 'convention', label: '命名规范', children: conventionTab },
        ]}
      />
    </div>
  )
}
