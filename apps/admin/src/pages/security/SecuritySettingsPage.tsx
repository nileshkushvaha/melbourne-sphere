import { useEffect, useState } from 'react';
import { Alert, App, Button, Descriptions, Form, InputNumber, Space, Tag, Typography } from 'antd';
import { settingsGroupsApi, type SettingDeclaration, type SettingGroupMetadata } from '@/api/settings-groups';
import { PERMISSION } from '@/auth/permissions';
import { useCapabilities } from '@/auth/access-control';
import { PageHeader } from '@/components/ui';
import { errorMessage, fieldErrors, useAsync } from '@/shared/useAsync';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

/**
 * Security settings (SRS 1.2 SECS 001–008).
 *
 * The form is built from the server's declarations, so a setting cannot appear
 * here that the server does not enforce, and its bounds are the server's bounds.
 * Where a change has a consequence — signing people out, ending sessions — the
 * screen says so before it is saved, not after (SECS 006).
 */
export function SecuritySettingsPage() {
  useDocumentTitle('Security settings');
  const { can } = useCapabilities();
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [state, reload] = useAsync(async () => {
    const [registry, values] = await Promise.all([settingsGroupsApi.registry(), settingsGroupsApi.values('security')]);
    const group = registry.find((entry) => entry.key === 'security') ?? null;
    return { group, values };
  }, []);

  const mayUpdate = can(PERMISSION.securitySettingsUpdate);

  useEffect(() => {
    if (state.status === 'ready') form.setFieldsValue(state.data.values.values);
  }, [state, form]);

  const save = async () => {
    if (state.status !== 'ready' || !state.data.group) return;
    const values = await form.validateFields();
    const changed = state.data.group.settings.filter((setting) => values[setting.key] !== state.data.values.values[setting.key]);
    const consequences = changed.map((setting) => setting.consequence).filter((line): line is string => Boolean(line));

    const apply = async () => {
      setSaving(true);
      setFormError(null);
      try {
        await settingsGroupsApi.update('security', state.data.values.version, values);
        message.success('Security settings saved');
        reload();
      } catch (error) {
        const fields = fieldErrors(error);
        if (fields) form.setFields(Object.entries(fields).map(([name, errors]) => ({ name, errors })));
        setFormError(errorMessage(error));
      } finally {
        setSaving(false);
      }
    };

    if (consequences.length > 0) {
      modal.confirm({
        title: 'Save these security settings?',
        content: (
          <ul style={{ paddingLeft: 18 }}>
            {consequences.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ),
        okText: 'Save',
        onOk: apply,
      });
      return;
    }
    await apply();
  };

  const field = (setting: SettingDeclaration) => (
    <Form.Item
      key={setting.key}
      label={setting.label}
      name={setting.key}
      extra={
        <span>
          {setting.description}
          {setting.bounds.boundedBy && (
            <>
              {' '}
              <Typography.Text type="secondary">Bounded by {setting.bounds.boundedBy}.</Typography.Text>
            </>
          )}
        </span>
      }
      rules={[
        { required: true, message: `${setting.label} is required` },
        {
          type: 'number',
          min: setting.bounds.min,
          max: setting.bounds.max,
          message: `Between ${setting.bounds.min} and ${setting.bounds.max}`,
        },
      ]}
    >
      <InputNumber min={setting.bounds.min} max={setting.bounds.max} disabled={!mayUpdate} style={{ width: 160 }} />
    </Form.Item>
  );

  const group: SettingGroupMetadata | null = state.status === 'ready' ? state.data.group : null;

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Security' }, { label: 'Security settings' }]}
        title="Security settings"
        description="Session, password and sign-in policy. Every setting here is enforced by the server, and none of them can make the site less safe than its specification requires — the bounds are the proof."
      />

      {state.status === 'error' && (
        <Alert type="error" showIcon message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} style={{ marginBottom: 16 }} />
      )}
      {formError && <Alert type="error" showIcon message={formError} style={{ marginBottom: 16 }} />}
      {!mayUpdate && state.status === 'ready' && (
        <Alert type="info" showIcon message="You can see these settings but not change them." style={{ marginBottom: 16 }} />
      )}
      {group?.note && <Alert type="info" showIcon message={group.note} style={{ marginBottom: 16 }} />}

      {state.status === 'ready' && group && (
        <>
          <Form form={form} layout="vertical" style={{ maxWidth: 640 }} disabled={saving}>
            {group.settings.map(field)}
            {mayUpdate && (
              <Space>
                <Button type="primary" loading={saving} onClick={save}>
                  Save settings
                </Button>
                <Button onClick={() => form.setFieldsValue(state.data.values.values)} disabled={saving}>
                  Reset
                </Button>
              </Space>
            )}
          </Form>

          <Descriptions
            style={{ marginTop: 32, maxWidth: 640 }}
            size="small"
            column={1}
            bordered
            title="What applies when"
            items={[
              {
                key: 'passwords',
                label: 'Password policy',
                children: 'Applies at the next password change. Raising the minimum length never invalidates a password already in use — a stored hash cannot be re-checked against a new rule.',
              },
              {
                key: 'sessions',
                label: 'Session timeouts',
                children: 'Apply on the next request from each session, including sessions that already exist.',
              },
              { key: 'signin', label: 'Sign-in protection', children: <Tag color="green">Always on. These settings can make it stricter, never weaker or absent.</Tag> },
            ]}
          />
        </>
      )}
    </div>
  );
}
