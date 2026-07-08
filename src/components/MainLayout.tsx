import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Dropdown, Select, theme } from 'antd'
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
const MAIN_MIN_WIDTH = 900

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
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, signOut } = useAuthStore()
  const { projects, currentProjectId, setCurrentProject } = useProjectStore()
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
      <Layout style={{ minWidth: MAIN_MIN_WIDTH }}>
        <Header style={{
          padding: '0 24px',
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
            />
            {projects.length > 1 && currentProjectId && (
              <Select
                value={currentProjectId}
                onChange={(value) => setCurrentProject(value)}
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
                style={{ width: 160 }}
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
              {profile?.display_name || '用户'}
            </Button>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, minWidth: 0 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
