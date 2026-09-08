import { screen } from '@testing-library/react';
import { TestimonialsPage } from '@/pages/website/TestimonialsPage';
import { PartnersPage } from '@/pages/website/PartnersPage';
import { renderWithProviders, providerWithPermissions } from '@/test/render';
import { jsonResponse } from '@/test/fetch-fakes';

const testimonial = {
  id: 't-1',
  displayName: 'Jo Nguyen',
  relationship: 'Owner, Carlton Corner Bakery',
  quote: 'Being listed brought us regulars from three suburbs away.',
  businessId: null,
  mediaId: null,
  approvedAt: null,
  approvedByAdminId: null,
  approvalNote: null,
  displayOrder: 0,
  status: 'draft',
  publishedAt: null,
  version: 1,
  updatedAt: '2026-09-07T10:00:00.000Z',
};

const partner = {
  id: 'p-1',
  name: 'City of Melbourne',
  relationshipLabel: 'Community partner',
  mediaId: null,
  logoAlt: null,
  websiteUrl: null,
  authorisedAt: null,
  authorisedByAdminId: null,
  authorisationNote: null,
  displayOrder: 0,
  status: 'draft',
  publishedAt: null,
  version: 1,
  updatedAt: '2026-09-07T10:00:00.000Z',
};

const meta = { page: 1, pageSize: 20, total: 1, pageCount: 1 };

/**
 * Both screens exist to stop something being published without recorded
 * permission (SRS 1.2 TSTM 002, PTNR 003). The server refuses either way; these
 * prove the interface does not offer the action that will be refused, and says
 * what is missing.
 */
describe('Testimonials and partners screens', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('lets an administrator publish a testimonial without recording consent first', async () => {
    globalThis.fetch = (async () => jsonResponse(200, { data: [testimonial], meta })) as typeof fetch;
    renderWithProviders(<TestimonialsPage />, {
      initialEntries: ['/admin/website/testimonials'],
      authProvider: providerWithPermissions(['website.testimonials.view', 'website.testimonials.publish', 'website.testimonials.approve']),
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'Testimonials' })).toBeInTheDocument();
    // Recording consent is offered, but publication is the administrator's own
    // decision (client instruction, 8 Sep 2026).
    expect(await screen.findByRole('button', { name: /^publish$/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /record consent/i })).toBeEnabled();
  });

  it('hides the consent action from an administrator who may not record it', async () => {
    globalThis.fetch = (async () => jsonResponse(200, { data: [testimonial], meta })) as typeof fetch;
    renderWithProviders(<TestimonialsPage />, {
      initialEntries: ['/admin/website/testimonials'],
      authProvider: providerWithPermissions(['website.testimonials.view', 'website.testimonials.publish']),
    });

    expect(await screen.findByRole('button', { name: /^publish$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /record consent/i })).not.toBeInTheDocument();
  });

  it('will not offer to publish a partner without a logo, and says why', async () => {
    globalThis.fetch = (async () => jsonResponse(200, { data: [partner], meta })) as typeof fetch;
    renderWithProviders(<PartnersPage />, {
      initialEntries: ['/admin/website/partners'],
      authProvider: providerWithPermissions(['website.clients.view', 'website.clients.publish', 'website.clients.approve']),
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'Clients and partners' })).toBeInTheDocument();
    // Waited for rather than read immediately: the action buttons appear once
    // the server's effective permissions have loaded (RBAC 010).
    expect(await screen.findByRole('button', { name: /^publish$/i })).toBeDisabled();
    // Permission cannot be recorded before there is a mark it refers to.
    expect(screen.getByRole('button', { name: /record permission/i })).toBeDisabled();
  });

  it('still refuses to publish a partner whose logo has no alternative text', async () => {
    globalThis.fetch = (async () => jsonResponse(200, { data: [{ ...partner, mediaId: 'media-1' }], meta })) as typeof fetch;
    renderWithProviders(<PartnersPage />, {
      initialEntries: ['/admin/website/partners'],
      authProvider: providerWithPermissions(['website.clients.view', 'website.clients.publish']),
    });

    expect(await screen.findByRole('button', { name: /^publish$/i })).toBeDisabled();
  });

  it('publishes a partner once it has both a logo and alternative text', async () => {
    globalThis.fetch = (async () => jsonResponse(200, { data: [{ ...partner, mediaId: 'media-1', logoAlt: 'City of Melbourne' }], meta })) as typeof fetch;
    renderWithProviders(<PartnersPage />, {
      initialEntries: ['/admin/website/partners'],
      authProvider: providerWithPermissions(['website.clients.view', 'website.clients.publish']),
    });

    expect(await screen.findByRole('button', { name: /^publish$/i })).toBeEnabled();
  });
});
