import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { Link, useSearchParams } from 'react-router';
import { accountApi } from '@/api/admins';
import { errorMessage, fieldErrors } from '@/shared/useAsync';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

export function AcceptSetupPage() {
  useDocumentTitle('Activate your account');
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [form] = Form.useForm();
  const [state, setState] = useState<{ kind: 'idle' } | { kind: 'done' } | { kind: 'error'; message: string }>({ kind: 'idle' });
  const [busy, setBusy] = useState(false);
  return (
    <main id="main-content" tabIndex={-1} style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <Card style={{ width: '100%', maxWidth: 420 }}>
        <Typography.Title level={1} style={{ fontSize: 22, marginTop: 0 }}>
          Activate your account
        </Typography.Title>
        {!token ? (
          <Alert type="error" showIcon message="This setup link is incomplete. Ask an administrator to send a new one." />
        ) : state.kind === 'done' ? (
          <Alert type="success" showIcon message="Your account is active." action={<Link to="/login">Sign in</Link>} />
        ) : (
          <>
            {state.kind === 'error' && <Alert type="error" showIcon message={state.message} style={{ marginBottom: 16 }} role="alert" />}
            <Form
              form={form}
              layout="vertical"
              requiredMark={false}
              onFinish={async ({ password }: { password: string }) => {
                setBusy(true);
                try {
                  await accountApi.acceptSetup(token, password);
                  setState({ kind: 'done' });
                } catch (error) {
                  form.setFields(Object.entries(fieldErrors(error)).map(([name, errors]) => ({ name, errors })));
                  setState({ kind: 'error', message: errorMessage(error) });
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Form.Item label="Choose a password" name="password" extra="At least 12 characters. Longer passphrases are encouraged." rules={[{ required: true, min: 12, max: 256, message: '12–256 characters' }]}>
                <Input.Password autoComplete="new-password" maxLength={256} />
              </Form.Item>
              <Form.Item label="Confirm password" name="confirm" dependencies={['password']} rules={[{ required: true, message: 'Confirm the password' }, ({ getFieldValue }) => ({ validator: (_, v) => (v === getFieldValue('password') ? Promise.resolve() : Promise.reject(new Error('Passwords do not match'))) })]}>
                <Input.Password autoComplete="new-password" maxLength={256} />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={busy} block>
                Activate account
              </Button>
            </Form>
          </>
        )}
      </Card>
    </main>
  );
}
