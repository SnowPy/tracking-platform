import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ConfigProvider, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useEffect } from 'react'
import { useAuthStore } from './stores/authStore'
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

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1677ff' } }}>
      <AntApp>
        <BrowserRouter>
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
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  )
}
