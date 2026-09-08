import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Avatar, Button, Drawer, Dropdown, Grid, Layout, Menu, Tag, Tooltip, Typography } from 'antd';
import {
  AlertOutlined,
  AppstoreOutlined,
  CommentOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  EditOutlined,
  EnvironmentOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  LinkOutlined,
  LogoutOutlined,
  MailOutlined,
  MenuOutlined,
  PictureOutlined,
  QuestionCircleOutlined,
  ReadOutlined,
  SafetyOutlined,
  LayoutOutlined,
  SettingOutlined,
  ShopOutlined,
  StarOutlined,
  TagsOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  KeyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useGetIdentity, useLogout, usePermissions } from '@refinedev/core';
import type { AdminSummary } from '@/api/auth';
import { Link, useLocation } from 'react-router';
import { Brand } from '@/components/Brand';
import { brand, layoutDimensions } from '@/config/theme';

const { Header, Sider, Content, Footer } = Layout;

interface NavItem {
  key: string;
  label: string;
  icon: ReactNode;
  permission?: string;
}

interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

/**
 * Navigation grouped the way the work is grouped (SRS ADM 002). Hiding an entry
 * is a courtesy only; the API enforces permissions on every request (RBAC 001).
 */
const NAV_GROUPS: NavGroup[] = [
  {
    key: 'overview',
    label: 'Overview',
    items: [{ key: '/', label: 'Dashboard', icon: <DashboardOutlined aria-hidden="true" /> }],
  },
  {
    key: 'business',
    label: 'Business',
    items: [
      { key: '/businesses', label: 'Businesses', icon: <ShopOutlined aria-hidden="true" />, permission: 'listings.read' },
      { key: '/businesses/featured', label: 'Featured listings', icon: <StarOutlined aria-hidden="true" />, permission: 'listings.read' },
      { key: '/categories', label: 'Categories', icon: <AppstoreOutlined aria-hidden="true" />, permission: 'taxonomy.manage' },
      { key: '/services', label: 'Services', icon: <TagsOutlined aria-hidden="true" />, permission: 'taxonomy.manage' },
      { key: '/areas', label: 'Local areas', icon: <EnvironmentOutlined aria-hidden="true" />, permission: 'taxonomy.manage' },
    ],
  },
  {
    key: 'editorial',
    label: 'Editorial',
    items: [
      { key: '/posts', label: 'Articles', icon: <ReadOutlined aria-hidden="true" />, permission: 'posts.write' },
      { key: '/authors', label: 'Authors', icon: <UserOutlined aria-hidden="true" />, permission: 'posts.write' },
      { key: '/blog-categories', label: 'Blog categories', icon: <EditOutlined aria-hidden="true" />, permission: 'posts.write' },
      { key: '/blog-tags', label: 'Blog tags', icon: <TagsOutlined aria-hidden="true" />, permission: 'posts.write' },
      { key: '/media', label: 'Media library', icon: <PictureOutlined aria-hidden="true" />, permission: 'media.manage' },
    ],
  },
  {
    key: 'community',
    label: 'Community',
    items: [
      { key: '/enquiries', label: 'Enquiries', icon: <MailOutlined aria-hidden="true" />, permission: 'enquiries.read' },
      { key: '/reviews', label: 'Reviews', icon: <StarOutlined aria-hidden="true" />, permission: 'reviews.moderate' },
      { key: '/comments', label: 'Comments', icon: <CommentOutlined aria-hidden="true" />, permission: 'comments.moderate' },
      { key: '/reports', label: 'Abuse reports', icon: <AlertOutlined aria-hidden="true" />, permission: 'reports.manage' },
    ],
  },
  {
    key: 'configuration',
    label: 'Configuration',
    items: [
      { key: '/settings/general', label: 'General settings', icon: <SettingOutlined aria-hidden="true" />, permission: 'settings.manage' },
      { key: '/settings', label: 'Home page settings', icon: <LayoutOutlined aria-hidden="true" />, permission: 'settings.manage' },
      { key: '/redirects', label: 'SEO redirects', icon: <LinkOutlined aria-hidden="true" />, permission: 'redirects.manage' },
      { key: '/admins', label: 'Administrators', icon: <TeamOutlined aria-hidden="true" />, permission: 'admins.manage' },
      { key: '/roles', label: 'Roles', icon: <SafetyCertificateOutlined aria-hidden="true" />, permission: 'roles.view' },
      { key: '/permissions', label: 'Permissions', icon: <KeyOutlined aria-hidden="true" />, permission: 'permissions.view' },
      { key: '/audit', label: 'Activity log', icon: <FileSearchOutlined aria-hidden="true" />, permission: 'audit.read' },
    ],
  },
  {
    key: 'website',
    label: 'Website',
    items: [
      { key: '/website/pages', label: 'Pages', icon: <FileTextOutlined aria-hidden="true" />, permission: 'settings.manage' },
      { key: '/website/faqs', label: 'FAQs', icon: <QuestionCircleOutlined aria-hidden="true" />, permission: 'website.faqs.view' },
      { key: '/website/service-alerts', label: 'Service alerts', icon: <AlertOutlined aria-hidden="true" />, permission: 'website.alerts.view' },
      { key: '/website/testimonials', label: 'Testimonials', icon: <CommentOutlined aria-hidden="true" />, permission: 'website.testimonials.view' },
      { key: '/website/partners', label: 'Clients and partners', icon: <ShopOutlined aria-hidden="true" />, permission: 'website.clients.view' },
    ],
  },
  {
    key: 'security',
    label: 'Security',
    items: [
      { key: '/security/settings', label: 'Security settings', icon: <SafetyOutlined aria-hidden="true" />, permission: 'security.settings.view' },
    ],
  },
  {
    key: 'system',
    label: 'System',
    items: [
      { key: '/system/email-logs', label: 'Email logs', icon: <MailOutlined aria-hidden="true" />, permission: 'system.email_logs.view' },
      { key: '/system/cache', label: 'Cache manager', icon: <DatabaseOutlined aria-hidden="true" />, permission: 'system.cache.view' },
      { key: '/system/queues', label: 'Queue monitor', icon: <ThunderboltOutlined aria-hidden="true" />, permission: 'system.queues.view' },
      { key: '/system/schedules', label: 'Scheduled tasks', icon: <ClockCircleOutlined aria-hidden="true" />, permission: 'system.schedules.view' },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

interface AdminShellProps {
  children: ReactNode;
}

/**
 * Application frame: brand header with the account menu, grouped side
 * navigation on desktop, drawer navigation on small screens, skip link and
 * landmarks.
 */
export function AdminShell({ children }: AdminShellProps) {
  const screens = Grid.useBreakpoint();
  const isMobile = screens.lg === false; // undefined during first render → treat as desktop
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const navId = useId();
  const { data: identity } = useGetIdentity<AdminSummary>();
  const { data: permissions } = usePermissions<string[]>({});
  const { mutate: logout, isPending: loggingOut } = useLogout();

  // `undefined` means the server has not answered yet. Nothing permission-gated
  // is rendered until it has, so no entry appears and is then withdrawn
  // (SRS RBAC 010); the shell shows the navigation as a quiet waiting state.
  const capabilitiesKnown = permissions !== undefined;
  const groups = useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => !item.permission || (capabilitiesKnown && (permissions ?? []).includes(item.permission))),
      })).filter((group) => group.items.length > 0),
    [permissions, capabilitiesKnown],
  );

  // Escape closes the mobile drawer wherever focus is (WCAG 2.1.2 / dialog convention).
  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  // Longest matching path wins, so /posts/new highlights Articles, not Dashboard.
  const active = ALL_ITEMS.filter((item) => item.key !== '/' && location.pathname.startsWith(item.key)).sort((a, b) => b.key.length - a.key.length)[0];
  const selectedKeys = [active?.key ?? (location.pathname === '/' ? '/' : '')];

  const menu = (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={selectedKeys}
      // Navigating from the drawer closes it; focus returns to the toggle via afterOpenChange.
      onClick={() => setDrawerOpen(false)}
      items={groups.map((group) => ({
        key: group.key,
        type: 'group' as const,
        label: collapsed && !isMobile ? undefined : group.label,
        children: group.items.map((item) => ({
          key: item.key,
          icon: item.icon,
          label: <Link to={item.key}>{item.label}</Link>,
        })),
      }))}
      style={{ borderInlineEnd: 0, background: 'transparent', paddingBlock: 8 }}
    />
  );

  const initials = (identity?.displayName ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Header role="banner" style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 0 rgba(255,255,255,0.06)' }}>
        <Button
          ref={toggleRef}
          type="text"
          icon={<MenuOutlined aria-hidden="true" />}
          aria-label={isMobile ? (drawerOpen ? 'Close navigation' : 'Open navigation') : collapsed ? 'Expand navigation' : 'Collapse navigation'}
          aria-expanded={isMobile ? drawerOpen : !collapsed}
          aria-controls={navId}
          onClick={() => (isMobile ? setDrawerOpen((open) => !open) : setCollapsed((c) => !c))}
          style={{ color: '#FFFFFF' }}
        />
        <Link to="/" aria-label="Melbourne Sphere Admin home" style={{ display: 'inline-flex' }}>
          <Brand />
        </Link>
        <span style={{ flex: 1 }} />
        <Tooltip title="Open the public site in a new tab">
          <Button type="text" href={import.meta.env.VITE_PUBLIC_SITE_URL ?? '/'} target="_blank" rel="noreferrer noopener" icon={<LinkOutlined aria-hidden="true" />} style={{ color: brand.navyText }}>
            {isMobile ? null : 'View site'}
          </Button>
        </Tooltip>
        {identity && (
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                { key: 'who', disabled: true, label: <span style={{ display: 'block', maxWidth: 240 }}>{identity.email}</span> },
                { type: 'divider' as const },
                { key: 'account', icon: <SafetyOutlined aria-hidden="true" />, label: <Link to="/account">Account security</Link> },
                { key: 'signout', icon: <LogoutOutlined aria-hidden="true" />, danger: true, label: 'Sign out', onClick: () => logout() },
              ],
            }}
          >
            <Button type="text" loading={loggingOut} style={{ color: '#FFFFFF', height: 40, paddingInline: 8 }} aria-label={`Account menu for ${identity.displayName}`}>
              <Avatar size={28} style={{ background: brand.primary, fontSize: 12, fontWeight: 600 }}>
                {initials || <UserOutlined aria-hidden="true" />}
              </Avatar>
              {!isMobile && <span style={{ marginInlineStart: 8 }}>{identity.displayName}</span>}
            </Button>
          </Dropdown>
        )}
      </Header>
      <Layout>
        {isMobile ? (
          <Drawer
            id={navId}
            placement="left"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            afterOpenChange={(open) => {
              if (!open) toggleRef.current?.focus();
            }}
            width={layoutDimensions.siderWidth}
            styles={{ body: { padding: 0, background: brand.navy }, header: { background: brand.navy, color: '#fff' } }}
            title={<span style={{ color: '#FFFFFF' }}>Navigation</span>}
            closeIcon={
              <span aria-hidden="true" style={{ color: '#FFFFFF', fontSize: 20 }}>
                ×
              </span>
            }
          >
            <nav aria-label="Admin navigation">{menu}</nav>
          </Drawer>
        ) : (
          <Sider
            id={navId}
            width={layoutDimensions.siderWidth}
            collapsedWidth={layoutDimensions.siderCollapsedWidth}
            collapsed={collapsed}
            trigger={null}
            style={{ position: 'sticky', top: layoutDimensions.headerHeight, height: `calc(100vh - ${layoutDimensions.headerHeight}px)`, overflowY: 'auto' }}
          >
            <nav aria-label="Admin navigation">{menu}</nav>
            {!collapsed && (
              <div style={{ padding: '12px 20px 20px' }}>
                <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                  Melbourne only
                </Tag>
              </div>
            )}
          </Sider>
        )}
        <Layout>
          <Content id="main-content" tabIndex={-1} role="main" style={{ padding: isMobile ? 16 : '24px 28px', maxWidth: layoutDimensions.contentMaxWidth, width: '100%', margin: '0 auto' }}>
            {children}
          </Content>
          <Footer role="contentinfo" style={{ background: 'transparent', padding: '8px 28px 20px' }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Melbourne Sphere Admin · sessions expire after 30 minutes of inactivity
            </Typography.Text>
          </Footer>
        </Layout>
      </Layout>
    </Layout>
  );
}
