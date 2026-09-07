import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { Link, useSearchParams } from 'react-router';
import { authApi } from '@/api/auth';
import { isApiError } from '@/api/errors';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

export function ResetPasswordPage() {
  useDocumentTitle('Choose a new password');
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<{ kind: 'idle' } | { kind: 'done' } | { kind: 'error'; message: string }>({ kind: 'idle' });
  const [busy, setBusy] = useState(false);

  return (
    <main id="main-content" tabIndex={-1} style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <Card style={{ width: '100%', maxWidth: 420 }}>
        <Typography.Title level={1} style={{ fontSize: 22, marginTop: 0 }}>
          Choose a new password
        </Typography.Title>
        {!token ? (
          <Alert type="error" showIcon message="This reset link is incomplete. Request a new one from the sign-in page." />
        ) : state.kind === 'done' ? (
          <Alert type="success" showIcon message="Your password has been changed and all previous sessions signed out." action={<Link to="/login">Sign in</Link>} />
        ) : (
          <>
            {state.kind === 'error' && <Alert type="error" showIcon message={state.message} style={{ marginBottom: 16 }} role="alert" />}
            <Form<{ newPassword: string; confirm: string }>
              layout="vertical"
              requiredMark={false}
              onFinish={async ({ newPassword }) => {
                setBusy(true);
                try {
                  await authApi.resetPassword(token, newPassword);
                  setState({ kind: 'done' });
                } catch (error) {
                  setState({ kind: 'error', message: isApiError(error) ? error.userMessage : 'Something went wrong. Please try again.' });
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Form.Item label="New password" name="newPassword" extra="At least 12 characters. Longer passphrases are encouraged." rules={[{ required: true, message: 'Enter a new password' }, { min: 12, message: 'Use at least 12 characters' }, { max: 256, message: 'Use at most 256 characters' }]}>
                <Input.Password autoComplete="new-password" maxLength={256} />
              </Form.Item>
              <Form.Item
                label="Confirm new password"
                name="confirm"
                dependencies={['newPassword']}
                rules={[{ required: true, message: 'Confirm the new password' }, ({ getFieldValue }) => ({ validator: (_, v) => (v === getFieldValue('newPassword') ? Promise.resolve() : Promise.reject(new Error('Passwords do not match'))) })]}
              >
                <Input.Password autoComplete="new-password" maxLength={256} />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={busy} block>
                Change password
              </Button>
            </Form>
          </>
        )}
        <Typography.Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
          <Link to="/login">Back to sign in</Link>
        </Typography.Paragraph>
      </Card>
    </main>
  );
}
