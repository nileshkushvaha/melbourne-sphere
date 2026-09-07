import { describe, expect, it } from 'vitest';
import { MIN_BODY_CHARACTERS, STATIC_PAGE_SLUGS, staticPageBlockers, staticPageDefinition } from './static-pages.js';

const realBody = 'Melbourne Sphere is an independent directory. '.repeat(6);

describe('static page definitions', () => {
  it('exposes exactly the five information pages the SRS names', () => {
    expect([...STATIC_PAGE_SLUGS]).toEqual(['about', 'contact', 'privacy', 'terms', 'review-guidelines']);
    expect(staticPageDefinition('contact')?.routesContact).toBe(true);
    expect(staticPageDefinition('anything-else')).toBeUndefined();
  });
});

describe('staticPageBlockers', () => {
  it('accepts a complete page', () => {
    expect(staticPageBlockers({ title: 'Privacy', plainBody: realBody })).toEqual([]);
  });

  it('refuses stub content, placeholder wording and short titles', () => {
    expect(staticPageBlockers({ title: 'Privacy', plainBody: 'Too short' })).toContain(`Page content must be at least ${MIN_BODY_CHARACTERS} characters of real copy`);
    expect(staticPageBlockers({ title: 'Privacy', plainBody: `Lorem ipsum dolor sit amet. ${realBody}` })).toContain('Remove placeholder or sample wording before publishing');
    expect(staticPageBlockers({ title: 'X', plainBody: realBody })).toContain('Title must be at least 3 characters');
  });

  it('validates contact routing before the contact page can go live', () => {
    expect(staticPageBlockers({ title: 'Contact us', plainBody: realBody, routesContact: true })).toContain('A contact address is required before the contact page can be published');
    expect(staticPageBlockers({ title: 'Contact us', plainBody: realBody, routesContact: true, contactEmail: 'nope' })).toContain('The contact address is not a valid email address');
    expect(staticPageBlockers({ title: 'Contact us', plainBody: realBody, routesContact: true, contactEmail: 'hello@example.com' })).toContain('The contact address must not be an example domain');
    expect(staticPageBlockers({ title: 'Contact us', plainBody: realBody, routesContact: true, contactEmail: 'editors@melbournesphere.au' })).toEqual([]);
  });
});
