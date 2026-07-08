import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ConfigProvider, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useEffect } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import { useAuthStore } from './stores/authStore'
import { useProjectStore } from './stores/projectStore'
import AuthGuard from './components/AuthGuard'
import MainLayout from './components/MainLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import EventListPage from './pages/events/EventListPage'
import EventDetailPage from './pages/events/EventDetailPage'
import UserPropertyPage from './pages/properties/UserPropertyPage'
import CommonPropertyPage from './pages/properties/CommonPropertyPage'
import CategoryPage from './pages/categories/CategoryPage'
import RequirementPage from './pages/requirements/RequirementPage'
import DocsPage from './pages/docs/DocsPage'
import PropertyTypePage from './pages/properties/PropertyTypePage'
import RequirementDetailPage from './pages/requirements/RequirementDetailPage'

const fontFamily = [
  '-apple-system',
  'BlinkMacSystemFont',
  'Segoe UI',
  'Microsoft YaHei UI',
  'Microsoft YaHei',
  'PingFang SC',
  'Noto Sans SC',
  'Helvetica Neue',
  'Arial',
  'sans-serif',
].join(', ')

export default function App() {
  const initializeAuth = useAuthStore((s) => s.initialize)
  const session = useAuthStore((s) => s.session)
  const initializeProject = useProjectStore((s) => s.initialize)

  // 页面首次加载时初始化 auth 和 project
  useEffect(() => {
    initializeAuth().then(() => {
      initializeProject()
    })
  }, [initializeAuth, initializeProject])

  // 登录成功后（session 从无到有）重新初始化项目数据
  useEffect(() => {
    if (session) {
      initializeProject()
    }
  }, [session, initializeProject])

  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#4f46e5', borderRadius: 6, fontFamily } }}>
      <AntApp>
        <BrowserRouter>
          <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AuthGuard />}>
              <Route element={<MainLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/events" element={<EventListPage />} />
                <Route path="/events/:id" element={<EventDetailPage />} />
                <Route path="/user-properties" element={<UserPropertyPage />} />
                <Route path="/common-properties" element={<CommonPropertyPage />} />
                <Route path="/categories" element={<CategoryPage />} />
                <Route path="/requirements" element={<RequirementPage />} />
                <Route path="/requirements/:id" element={<RequirementDetailPage />} />
                <Route path="/property-types" element={<PropertyTypePage />} />
                <Route path="/docs" element={<DocsPage />} />
              </Route>
            </Route>
          </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  )
}
