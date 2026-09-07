import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { useLogin } from '@refinedev/core';
import { Link } from 'react-router';
import { Brand } from '@/components/Brand';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

interface LoginForm {
  email: string;
  password: string;
}

interface Challenge {
  challenge: string;
  expiresAt: string;
}

export function LoginPage() {
  useDocumentTitle('Sign in');
  const { mutate: login, isPending } = useLogin<LoginForm | { challenge: string; code: string }>();
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  const onResult = (result: { success: boolean; error?: { name?: string; message?: string } }) => {
    if (result.success) return;
    if (result.error?.name === 'totp' && result.error.message) {
      setError(null);
      setChallenge(JSON.parse(result.error.message) as Challenge);
      return;
    }
    setError(result.error?.message ?? 'Sign-in failed.');
  };

  return (
    <main id="main-content" tabIndex={-1} style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <Card style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ background: '#0B1F3A', margin: '-24px -24px 24px', padding: '16px 24px', borderRadius: '10px 10px 0 0' }}>
          <Brand />
        </div>
        <Typography.Title level={1} style={{ fontSize: 22, marginTop: 0 }}>
          {challenge ? 'Enter your verification code' : 'Sign in'}
        </Typography.Title>
        {challenge ? (
          <>
            <Typography.Paragraph type="secondary">Enter the 6-digit code from your authenticator app, or one of your recovery codes.</Typography.Paragraph>
            {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} role="alert" />}
            <Form<{ code: string }> layout="vertical" requiredMark={false} onFinish={({ code }) => login({ challenge: challenge.challenge, code: code.trim() }, { onSuccess: onResult })}>
              <Form.Item label="Verification code" name="code" rules={[{ required: true, message: 'Enter your code' }]}>
                <Input inputMode="numeric" autoComplete="one-time-code" maxLength={20} autoFocus />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={isPending} block>
                Verify and sign in
              </Button>
            </Form>
            <Typography.Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
              <Button type="link" style={{ padding: 0 }} onClick={() => { setChallenge(null); setError(null); }}>
                Start over
              </Button>
            </Typography.Paragraph>
          </>
        ) : (
          <>
        <Typography.Paragraph type="secondary">Administrator access only. Accounts are created by a Super Admin; there is no self-registration.</Typography.Paragraph>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} role="alert" />}
        <Form<LoginForm>
          layout="vertical"
          requiredMark={false}
          onFinish={(values) => login(values, { onSuccess: onResult })}
        >
          <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Enter your email address' }, { type: 'email', message: 'Enter a valid email address' }]}>
            <Input type="email" autoComplete="username" inputMode="email" maxLength={254} />
          </Form.Item>
          <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Enter your password' }]}>
            <Input.Password autoComplete="current-password" maxLength={256} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={isPending} block>
            Sign in
          </Button>
        </Form>
        <Typography.Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
          <Link to="/forgot-password">Forgotten your password?</Link>
        </Typography.Paragraph>
          </>
        )}
      </Card>
    </main>
  );
}
