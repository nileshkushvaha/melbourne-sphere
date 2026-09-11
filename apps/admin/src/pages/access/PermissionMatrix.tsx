import { useMemo, useState, type ReactNode } from 'react';
import { Button, Checkbox, Empty, Input, Space, Typography } from 'antd';
import type { PermissionCatalogEntry } from '@/api/authorization';
import { brand } from '@/config/theme';

/**
 * The permission matrix, grouped by module (SRS RBAC 010). Every control is a
 * real checkbox with a real label, so the whole grid is keyboard operable and
 * each entry is announced with its description; the group controls are buttons,
 * not checkbox-like widgets, because they act on a selection rather than
 * carrying a state of their own.
 *
 * Retired permissions are shown disabled rather than hidden: an administrator
 * looking at an older role needs to see what it still carries.
 *
 * Sixty-three permissions is too many to read: the search narrows the grid to
 * what was asked for, and each group says how many of its entries are selected
 * so the shape of a role is visible without counting checkboxes.
 */
export interface PermissionAnnotation {
  /** Refuse this entry, because granting it would be refused by the server anyway. */
  disabled?: boolean;
  /** A line under the description explaining the entry's situation. */
  note?: ReactNode;
}

export function PermissionMatrix({
  catalog,
  value,
  onChange,
  disabled = false,
  annotate,
}: {
  catalog: PermissionCatalogEntry[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  /**
   * Per-permission context from the screen using the matrix — the access editor
   * uses it to say what a role already grants and to withhold what the acting
   * administrator does not hold themselves.
   */
  annotate?: (entry: PermissionCatalogEntry) => PermissionAnnotation | undefined;
}) {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = (entry: PermissionCatalogEntry) =>
      needle === '' ||
      entry.label.toLowerCase().includes(needle) ||
      entry.key.toLowerCase().includes(needle) ||
      entry.description.toLowerCase().includes(needle) ||
      entry.module.toLowerCase().includes(needle);

    const byModule = new Map<string, PermissionCatalogEntry[]>();
    for (const entry of catalog) {
      if (!matches(entry)) continue;
      const list = byModule.get(entry.module) ?? [];
      list.push(entry);
      byModule.set(entry.module, list);
    }
    return [...byModule.entries()].map(([module, entries]) => ({ module, entries }));
  }, [catalog, query]);

  const selected = new Set(value);
  const toggle = (key: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(key);
    else next.delete(key);
    onChange([...next].sort());
  };
  const setGroup = (entries: PermissionCatalogEntry[], checked: boolean) => {
    const next = new Set(selected);
    for (const entry of entries) {
      if (!entry.isActive) continue;
      // "Select all" never grants what a single checkbox refuses to grant.
      if (annotate?.(entry)?.disabled) continue;
      if (checked) next.add(entry.key);
      else next.delete(entry.key);
    }
    onChange([...next].sort());
  };

  return (
    <div>
      {/* A flex row rather than Space: a Space item is shrink-to-fit, so a fixed
          width on the field inside it cannot be capped by a percentage and the
          field pushes the page sideways at 320 px. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Input.Search
          allowClear
          aria-label="Search permissions"
          placeholder="Search permissions"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          style={{ flex: '1 1 200px', minWidth: 0, maxWidth: 300 }}
        />
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          {value.length} of {catalog.length} selected
        </Typography.Text>
      </div>

      {groups.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`No permission matches “${query}”`} />}

      {groups.map(({ module, entries }) => {
        const assignable = entries.filter((entry) => entry.isActive && !annotate?.(entry)?.disabled);
        const chosen = assignable.filter((entry) => selected.has(entry.key)).length;
        const allSelected = assignable.length > 0 && chosen === assignable.length;
        return (
          <fieldset key={module} style={{ border: `1px solid ${brand.border}`, borderRadius: 12, padding: '14px 18px 18px', marginBottom: 16, minInlineSize: 0 }}>
            <legend style={{ padding: '0 8px', fontWeight: 600, fontSize: 14 }}>
              {module}{' '}
              <Typography.Text type="secondary" style={{ fontWeight: 400, fontSize: 13 }}>
                — {chosen} of {assignable.length} selected
              </Typography.Text>
            </legend>
            {!disabled && (
              // Wraps rather than overflowing: two long group labels do not fit
              // one line at 390 px, and a horizontally scrolling form is a defect.
              <Space wrap style={{ marginBottom: 10 }}>
                {/* The visible label is short because it sits under its group
                    heading; the accessible name carries the group, because a
                    screen reader reads the button out of that context. */}
                <Button size="small" aria-label={`Select all in ${module}`} onClick={() => setGroup(assignable, true)} disabled={allSelected}>
                  Select all
                </Button>
                <Button size="small" aria-label={`Clear ${module}`} onClick={() => setGroup(assignable, false)} disabled={chosen === 0}>
                  Clear
                </Button>
              </Space>
            )}
            {/* `min()` so a 320 px screen gets one full-width column rather than a
                280 px column and a horizontal scrollbar. */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: 10 }}>
              {entries.map((entry) => {
                const annotation = annotate?.(entry);
                return (
                  <Checkbox
                    key={entry.key}
                    checked={selected.has(entry.key)}
                    disabled={disabled || !entry.isActive || annotation?.disabled === true}
                    onChange={(event) => toggle(entry.key, event.target.checked)}
                    style={{ alignItems: 'flex-start' }}
                  >
                    <span style={{ display: 'block' }}>
                      <span style={{ fontWeight: 500 }}>{entry.label}</span>
                      {!entry.isActive && <Typography.Text type="secondary"> (retired)</Typography.Text>}
                      {/* The description is on the page, not in a tooltip: a
                          tooltip is unreachable on touch and easy to miss. */}
                      <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, lineHeight: 1.45 }}>
                        {entry.description}
                      </Typography.Text>
                      {/* The caller styles its own note: "already granted by a
                          role" and "you cannot grant this" mean different things
                          and should not look the same. */}
                      {annotation?.note && <span style={{ display: 'block', fontSize: 12, lineHeight: 1.45, marginTop: 2 }}>{annotation.note}</span>}
                    </span>
                  </Checkbox>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
