import { useMemo } from 'react';
import { Button, Checkbox, Space, Tooltip, Typography } from 'antd';
import type { PermissionCatalogEntry } from '@/api/authorization';

/**
 * The permission matrix, grouped by module (SRS RBAC 010). Every control is a
 * real checkbox with a real label, so the whole grid is keyboard operable and
 * each entry is announced with its description; the group controls are buttons,
 * not checkbox-like widgets, because they act on a selection rather than
 * carrying a state of their own.
 *
 * Retired permissions are shown disabled rather than hidden: an administrator
 * looking at an older role needs to see what it still carries.
 */
export function PermissionMatrix({
  catalog,
  value,
  onChange,
  disabled = false,
}: {
  catalog: PermissionCatalogEntry[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const groups = useMemo(() => {
    const byModule = new Map<string, PermissionCatalogEntry[]>();
    for (const entry of catalog) {
      const list = byModule.get(entry.module) ?? [];
      list.push(entry);
      byModule.set(entry.module, list);
    }
    return [...byModule.entries()].map(([module, entries]) => ({ module, entries }));
  }, [catalog]);

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
      if (checked) next.add(entry.key);
      else next.delete(entry.key);
    }
    onChange([...next].sort());
  };

  return (
    <div>
      {groups.map(({ module, entries }) => {
        const assignable = entries.filter((entry) => entry.isActive);
        const allSelected = assignable.length > 0 && assignable.every((entry) => selected.has(entry.key));
        return (
          <fieldset key={module} style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, minInlineSize: 0 }}>
            <legend style={{ padding: '0 8px', fontWeight: 600 }}>{module}</legend>
            {!disabled && (
              // Wraps rather than overflowing: two long group labels do not fit
              // one line at 390 px, and a horizontally scrolling form is a defect.
              <Space wrap style={{ marginBottom: 8 }}>
                <Button size="small" onClick={() => setGroup(assignable, true)} disabled={allSelected}>
                  Select all in {module}
                </Button>
                <Button size="small" onClick={() => setGroup(assignable, false)} disabled={!assignable.some((entry) => selected.has(entry.key))}>
                  Clear {module}
                </Button>
              </Space>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
              {entries.map((entry) => (
                <Checkbox
                  key={entry.key}
                  checked={selected.has(entry.key)}
                  disabled={disabled || !entry.isActive}
                  onChange={(event) => toggle(entry.key, event.target.checked)}
                >
                  <Tooltip title={entry.description}>
                    <span>
                      {entry.label}{' '}
                      <Typography.Text type="secondary" code style={{ fontSize: 12 }}>
                        {entry.key}
                      </Typography.Text>
                      {!entry.isActive && <Typography.Text type="secondary"> (retired)</Typography.Text>}
                    </span>
                  </Tooltip>
                </Checkbox>
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
