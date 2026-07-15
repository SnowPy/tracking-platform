import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ConfigProvider, App as AntApp, Spin } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { lazy, Suspense, useEffect } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import { useAuthStore } from './stores/authStore'
import { useProjectStore } from './stores/projectStore'
import AuthGuard from './components/AuthGuard'
import MainLayout from './components/MainLayout'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const EventListPage = lazy(() => import('./pages/events/EventListPage'))
const EventDetailPage = lazy(() => import('./pages/events/EventDetailPage'))
const UserPropertyPage = lazy(() => import('./pages/properties/UserPropertyPage'))
const CommonPropertyPage = lazy(() => import('./pages/properties/CommonPropertyPage'))
const CategoryPage = lazy(() => import('./pages/categories/CategoryPage'))
const RequirementPage = lazy(() => import('./pages/requirements/RequirementPage'))
const DocsPage = lazy(() => import('./pages/docs/DocsPage'))
const PropertyTypePage = lazy(() => import('./pages/properties/PropertyTypePage'))
const RequirementDetailPage = lazy(() => import('./pages/requirements/RequirementDetailPage'))

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
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const initializeProject = useProjectStore((s) => s.initialize)
  const resetProject = useProjectStore((s) => s.reset)

  // 认证只初始化一次；项目数据仅在登录用户变化时重新加载。
  useEffect(() => {
    void initializeAuth()
  }, [initializeAuth])

  useEffect(() => {
    if (userId) {
      void initializeProject()
    } else {
      resetProject()
    }
  }, [userId, initializeProject, resetProject])

  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#4f46e5', borderRadius: 6, fontFamily } }}>
      <AntApp>
        <BrowserRouter>
          <ErrorBoundary>
            <Suspense fallback={<div className="app-route-loading"><Spin size="large" /></div>}>
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
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  )
}
