'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MenuIcon, XIcon } from 'lucide-react';

export interface NavLink {
  href: string;
  label: string;
}

interface Props {
  links: NavLink[];
  /** "Add or update a business" action, or null when no publishable contact route is configured. */
  action: { href: string; label: string } | null;
}

function isCurrent(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Main navigation (SRS UX 002, NFR 011). It is a client component only to read
 * the current path for `aria-current`; every link is a plain anchor and the
 * mobile menu is a native `<details>` disclosure, so navigation works fully
 * with JavaScript disabled and is operable by keyboard on both layouts.
 */
export function HeaderNav({ links, action }: Props) {
  const pathname = usePathname();
  return (
    <>
      <nav aria-label="Main" className="ml-6 hidden items-center gap-1 lg:flex">
        {links.map((link) => {
          const current = isCurrent(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={current ? 'page' : undefined}
              className={`relative inline-flex min-h-11 items-center whitespace-nowrap rounded-lg px-3.5 text-sm font-medium transition-colors ${
                current ? 'bg-white/12 text-white' : 'text-band-muted hover:bg-white/8 hover:text-white'
              }`}
            >
              {link.label}
              {current && <span aria-hidden="true" className="absolute inset-x-3.5 bottom-1.5 h-0.5 rounded-full bg-sky-400" />}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        {action && (
          <Link
            href={action.href}
            className="hidden min-h-11 items-center rounded-full bg-sky-500 px-5 text-sm font-semibold text-navy-950 transition-colors hover:bg-sky-400 sm:inline-flex"
          >
            {action.label}
          </Link>
        )}
        {/* Native disclosure: open state, keyboard operation and the no-JavaScript case all come free. */}
        <details className="group relative lg:hidden">
          <summary
            aria-label="Menu"
            className="inline-flex size-11 cursor-pointer list-none items-center justify-center rounded-lg border border-white/20 text-white [&::-webkit-details-marker]:hidden"
          >
            <MenuIcon aria-hidden="true" className="size-5 group-open:hidden" />
            <XIcon aria-hidden="true" className="hidden size-5 group-open:block" />
          </summary>
          <nav
            aria-label="Main (compact)"
            className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 rounded-card border border-band-border bg-band-deep p-2 shadow-lg"
          >
            <ul className="flex flex-col">
              {links.map((link) => {
                const current = isCurrent(pathname, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={current ? 'page' : undefined}
                      className={`flex min-h-11 items-center rounded-lg px-3 text-sm font-medium ${current ? 'bg-white/12 text-white' : 'text-band-muted hover:bg-white/8 hover:text-white'}`}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
              {action && (
                <li className="mt-1 border-t border-band-border pt-2">
                  <Link href={action.href} className="flex min-h-11 items-center justify-center rounded-full bg-sky-500 px-4 text-sm font-semibold text-navy-950">
                    {action.label}
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        </details>
      </div>
    </>
  );
}
