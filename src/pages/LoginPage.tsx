import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Form, Input, Button, Card, Tabs, Typography, message, theme } from 'antd'
import { MailOutlined, LockOutlined } from '@ant-design/icons'
import PandaLogo from '../components/PandaLogo'
import { useAuthStore } from '../stores/authStore'

const { Title, Text } = Typography

const getErrorMessage = (err: unknown, fallback: string) => {
  return err instanceof Error ? err.message : fallback
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  const { session, signInWithPassword, signUp } = useAuthStore()
  const navigate = useNavigate()
  const { token } = theme.useToken()

  // 已登录直接跳转
  if (session) {
    return <Navigate to="/" replace />
  }

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true)
    try {
      await signInWithPassword(values.email, values.password)
      message.success('登录成功')
      navigate('/')
    } catch (err: unknown) {
      message.error(getErrorMessage(err, '登录失败，请检查邮箱和密码'))
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (values: { email: string; password: string }) => {
    setLoading(true)
    try {
      await signUp(values.email, values.password)
      const session = useAuthStore.getState().session
      if (session) {
        message.success('注册成功，自动登录')
        navigate('/')
      } else {
        message.success('注册成功！请检查邮箱确认链接（如已关闭确认，可直接登录）')
        setActiveTab('login')
      }
    } catch (err: unknown) {
      message.error(getErrorMessage(err, '注册失败'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
      backgroundImage: `
        radial-gradient(circle at 1px 1px, rgba(79, 70, 229, 0.10) 1px, transparent 0),
        linear-gradient(135deg, ${token.colorPrimaryBg} 0%, ${token.colorBgLayout} 56%, ${token.colorSuccessBg} 100%)
      `,
      backgroundSize: '28px 28px, auto',
    }}>
      <Card
        style={{
          width: 'min(400px, calc(100vw - 32px))',
          boxShadow: '0 16px 44px rgba(15,23,42,0.10)',
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
        bordered={false}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <PandaLogo size={64} accentColor={token.colorPrimary} />
          <Title level={3} style={{ marginTop: 16, marginBottom: 4 }}>埋点管理平台</Title>
          <Text type="secondary" style={{ display: 'block', lineHeight: 1.6 }}>
            统一管理事件、属性、需求与埋点文档
          </Text>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'login' | 'register')}
          centered
          tabBarGutter={48}
          items={[
            {
              key: 'login',
              label: '登录',
              children: (
                <Form onFinish={handleLogin} size="large" autoComplete="off" style={{ marginTop: 8 }}>
                  <Form.Item name="email" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '请输入有效的邮箱' }]}>
                    <Input prefix={<MailOutlined />} placeholder="邮箱" />
                  </Form.Item>
                  <Form.Item name="password" style={{ marginBottom: 8 }} rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '密码至少6位' }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                  </Form.Item>
                  <div style={{ marginBottom: 16, color: token.colorTextTertiary, fontSize: 12 }}>
                    使用团队邮箱登录，忘记密码请联系管理员
                  </div>
                  <Form.Item style={{ marginBottom: 0 }}>
                    <Button type="primary" htmlType="submit" loading={loading} block>
                      登录
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'register',
              label: '注册',
              children: (
                <Form onFinish={handleRegister} size="large" autoComplete="off" style={{ marginTop: 8 }}>
                  <Form.Item name="email" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '请输入有效的邮箱' }]}>
                    <Input prefix={<MailOutlined />} placeholder="邮箱" />
                  </Form.Item>
                  <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '密码至少6位' }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                  </Form.Item>
                  <Form.Item name="confirmPassword" dependencies={['password']} rules={[
                    { required: true, message: '请确认密码' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) return Promise.resolve()
                        return Promise.reject(new Error('两次输入的密码不一致'))
                      },
                    }),
                  ]} style={{ marginBottom: 8 }}>
                    <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
                  </Form.Item>
                  <div style={{ marginBottom: 16, color: token.colorTextTertiary, fontSize: 12 }}>
                    注册后可能需要通过邮箱确认账号
                  </div>
                  <Form.Item style={{ marginBottom: 0 }}>
                    <Button type="primary" htmlType="submit" loading={loading} block>
                      注册
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}
