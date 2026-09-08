import { App, Form, Input, Select, Typography } from 'antd';
import { useNavigate } from 'react-router';
import { adminsApi } from '@/api/admins';
import { authorizationApi } from '@/api/authorization';
import { RecordEditorPage } from '@/components/ui';
import { useAsync } from '@/shared/useAsync';
import { useRecordEditor } from '@/shared/useRecordEditor';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

interface Values {
  email: string;
  displayName: string;
  roleKeys: string[];
}

/**
 * Invite an administrator (SRS ADM 003, RBAC 004).
 *
 * The roles are chosen here rather than assumed: an account created with the
 * highest role by default is a privilege the inviter never consciously granted,
 * and RBAC 004 exists precisely so that access is deliberate. At least one role
 * is required, because an administrator with none can sign in and do nothing,
 * which reads as a broken account rather than a restricted one.
 */
export function AdminInvitePage() {
  useDocumentTitle('New administrator');
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm<Values>();
  const { saving, error, submit } = useRecordEditor<Values>(form);
  const [roles] = useAsync((signal) => authorizationApi().listRoles({ page: 1, pageSize: 50 }, signal), []);

  const save = () =>
    submit(async (values) => {
      await adminsApi.create(values);
      message.success('Administrator created; setup link sent.');
    }).then((ok) => {
      if (ok) navigate('/admins');
    });

  return (
    <RecordEditorPage<Values>
      crumbs={[{ label: 'Configuration' }, { label: 'Administrators', href: '/admins' }, { label: 'New administrator' }]}
      title="New administrator"
      description="The new administrator receives a single-use setup link, valid for 24 hours, to choose their own password. They cannot sign in before that, and you never see or set their password."
      listHref="/admins"
      listLabel="All administrators"
      form={form}
      initialValues={{ roleKeys: [] }}
      saving={saving}
      error={error ?? (roles.status === 'error' ? 'Roles could not be loaded, so this account cannot be given access yet.' : null)}
      submitLabel="Create and send setup link"
      onSubmit={save}
      aside={
        <div style={{ border: '1px solid var(--ant-color-border)', borderRadius: 8, padding: 16 }}>
          <Typography.Text strong>What happens next</Typography.Text>
          <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            The account is created in the invited state and appears in the list straight away. It becomes active only when the person follows the setup link and sets a password. You can change their roles at any time from their own page.
          </Typography.Paragraph>
        </div>
      }
    >
      <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email', message: 'Enter a valid email address' }]} extra="The setup link is sent here.">
        <Input type="email" maxLength={254} autoComplete="off" />
      </Form.Item>
      <Form.Item label="Display name" name="displayName" rules={[{ required: true, min: 2, max: 80, message: '2–80 characters' }]}>
        <Input maxLength={80} />
      </Form.Item>
      <Form.Item
        label="Roles"
        name="roleKeys"
        rules={[{ required: true, message: 'Choose at least one role' }]}
        extra="What this administrator may do. Give the least that lets them do their job; you can change it later."
        style={{ marginBottom: 0 }}
      >
        <Select
          mode="multiple"
          loading={roles.status === 'loading'}
          placeholder="Choose one or more roles"
          optionFilterProp="label"
          options={roles.status === 'ready' ? roles.data.data.filter((role) => role.isActive).map((role) => ({ value: role.key, label: `${role.name} — ${role.description}` })) : []}
        />
      </Form.Item>
    </RecordEditorPage>
  );
}
