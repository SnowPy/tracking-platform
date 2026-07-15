import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Dropdown, Result, Select, Spin, theme } from 'antd'
import {
  DashboardOutlined,
  ThunderboltOutlined,
  UserOutlined,
  GlobalOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  BookOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  TagOutlined,
} from '@ant-design/icons'
import PandaLogo from './PandaLogo'
import { useAuthStore } from '../stores/authStore'
import { useProjectStore } from '../stores/projectStore'

const { Header, Sider, Content } = Layout
const menuItems = [
  {
    type: 'group' as const,
    label: '核心管理',
    children: [
      { key: '/', icon: <DashboardOutlined />, label: '总览' },
      { key: '/events', icon: <ThunderboltOutlined />, label: '事件管理' },
      { key: '/categories', icon: <AppstoreOutlined />, label: '事件分类' },
    ],
  },
  {
    type: 'group' as const,
    label: '属性管理',
    children: [
      { key: '/user-properties', icon: <UserOutlined />, label: '用户属性' },
      { key: '/common-properties', icon: <GlobalOutlined />, label: '公共属性' },
      { key: '/property-types', icon: <TagOutlined />, label: '属性类型' },
    ],
  },
  {
    type: 'group' as const,
    label: '需求与文档',
    children: [
      { key: '/requirements', icon: <FileTextOutlined />, label: '埋点需求' },
      { key: '/docs', icon: <BookOutlined />, label: '埋点文档' },
    ],
  },
]

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobile, setMobile] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, signOut } = useAuthStore()
  const { projects, currentProjectId, loading, error, initialize, setCurrentProject } = useProjectStore()
  const { token } = theme.useToken()

  const selectedKeys = [location.pathname === '/' ? '/' : `/${location.pathname.split('/')[1]}`]

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleMenuClick = (key: string) => {
    navigate(key)
  }

  const userMenuItems = [
    { key: 'profile', label: `${profile?.display_name || '用户'} (${profile?.role === 'admin' ? '管理员' : '成员'})`, disabled: true },
    { type: 'divider' as const },
    { key: 'logout', label: '退出登录', icon: <LogoutOutlined />, danger: true },
  ]

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        collapsedWidth={mobile ? 0 : 72}
        breakpoint="lg"
        onBreakpoint={(broken) => {
          setMobile(broken)
          setCollapsed(broken)
        }}
        theme="light"
        style={{
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          boxShadow: '2px 0 8px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: collapsed ? 0 : 8,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          background: `linear-gradient(135deg, ${token.colorPrimaryBg} 0%, ${token.colorBgContainer} 100%)`,
        }}>
          <PandaLogo size={28} accentColor={token.colorPrimary} compact />
          {!collapsed && <span style={{ fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap', background: `linear-gradient(135deg, ${token.colorPrimary}, #7c3aed)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>埋点管理平台</span>}
        </div>
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          onClick={({ key }) => handleMenuClick(key)}
          style={{ border: 'none', marginTop: 8 }}
        />
      </Sider>
      <Layout style={{ minWidth: 0 }}>
        <Header style={{
          padding: '0 clamp(12px, 2vw, 24px)',
          background: token.colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          height: 64,
          minWidth: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? '展开导航菜单' : '收起导航菜单'}
            />
            {projects.length > 1 && currentProjectId && (
              <Select
                value={currentProjectId}
                onChange={(value) => setCurrentProject(value)}
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
                style={{ width: 'min(160px, 38vw)' }}
                size="small"
              />
            )}
          </div>
          <Dropdown menu={{ items: userMenuItems, onClick: ({ key }) => { if (key === 'logout') handleSignOut() } }}>
            <Button
              type="text"
              icon={<UserOutlined />}
              style={{
                maxWidth: 220,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <span className="app-user-name">{profile?.display_name || '用户'}</span>
            </Button>
          </Dropdown>
        </Header>
        <Content style={{ margin: 'clamp(12px, 2vw, 24px)', minWidth: 0 }}>
          {loading ? (
            <div className="app-route-loading"><Spin size="large" tip="正在加载项目…" /></div>
          ) : error ? (
            <Result
              status="error"
              title="项目加载失败"
              subTitle={error}
              extra={<Button type="primary" onClick={() => void initialize()}>重新加载</Button>}
            />
          ) : !currentProjectId ? (
            <Result status="info" title="暂无可用项目" subTitle="请联系管理员为当前账号分配项目。" />
          ) : (
            <Outlet />
          )}
        </Content>
      </Layout>
    </Layout>
  )
}
