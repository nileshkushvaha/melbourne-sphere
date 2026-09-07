import { useEffect, useState } from 'react';
import { Alert, Button, Space, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { getLiveness } from '@/api/health';
import { isApiError } from '@/api/errors';

type Status =
  | { state: 'loading' }
  | { state: 'available'; requestId: string | null }
  | { state: 'unavailable'; message: string; reference: string | null };

/**
 * Checks API liveness once on mount and again only when the user asks.
 * No background polling (it would add load and hide real outages behind flapping).
 */
export function ApiStatus() {
  const [status, setStatus] = useState<Status>({ state: 'loading' });
  // Incrementing `attempt` re-runs the effect; the click handler also resets to loading.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getLiveness(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setStatus({ state: 'available', requestId: result.requestId });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (isApiError(error)) {
          if (error.kind === 'aborted') return;
          setStatus({ state: 'unavailable', message: error.userMessage, reference: error.requestId ? error.reference : error.code });
        } else {
          setStatus({ state: 'unavailable', message: 'The API returned an unexpected response.', reference: null });
        }
      });
    return () => controller.abort();
  }, [attempt]);

  const recheck = () => {
    setStatus({ state: 'loading' });
    setAttempt((n) => n + 1);
  };

  const retry = (
    <Button size="small" icon={<ReloadOutlined aria-hidden="true" />} onClick={recheck} disabled={status.state === 'loading'}>
      Check again
    </Button>
  );

  return (
    <section aria-labelledby="api-status-heading" aria-live="polite" aria-busy={status.state === 'loading'}>
      <Typography.Title level={2} id="api-status-heading" style={{ fontSize: 18, marginTop: 0 }}>
        API status
      </Typography.Title>
      {status.state === 'loading' && <Alert type="info" showIcon message="Checking the API…" />}
      {status.state === 'available' && (
        <Alert
          type="success"
          showIcon
          message="API reachable"
          description={
            <Space direction="vertical" size={4}>
              <span>
                <code>/api/v1/health</code> responded. This is a liveness check only; database readiness is reported by the API separately.
              </span>
              {status.requestId && <Typography.Text type="secondary">Request {status.requestId}</Typography.Text>}
              {retry}
            </Space>
          }
        />
      )}
      {status.state === 'unavailable' && (
        <Alert
          type="error"
          showIcon
          message="API unavailable"
          description={
            <Space direction="vertical" size={4}>
              <span>{status.message}</span>
              {status.reference && <Typography.Text type="secondary">Reference: {status.reference}</Typography.Text>}
              {retry}
            </Space>
          }
        />
      )}
    </section>
  );
}
