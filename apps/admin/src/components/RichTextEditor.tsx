import { useCallback, useEffect, useState } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { Button, Divider, Form, Input, Modal, Space, Tooltip, Typography } from 'antd';
import {
  BoldOutlined,
  CodeOutlined,
  ItalicOutlined,
  LinkOutlined,
  OrderedListOutlined,
  PictureOutlined,
  RedoOutlined,
  StrikethroughOutlined,
  TableOutlined,
  UndoOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { MediaPicker } from '@/components/MediaPicker';
import { variantUrl, type MediaAsset } from '@/api/media';
import { brand } from '@/config/theme';

interface Props {
  value: string;
  onChange: (html: string) => void;
  /** Disables editing while a save is in flight. */
  disabled?: boolean;
  ariaLabel?: string;
  minHeight?: number;
}

interface ToolButtonProps {
  label: string;
  icon?: React.ReactNode;
  text?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function ToolButton({ label, icon, text, active, disabled, onClick }: ToolButtonProps) {
  return (
    <Tooltip title={label}>
      <Button
        size="small"
        type={active ? 'primary' : 'text'}
        aria-label={label}
        aria-pressed={active ?? false}
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClick}
        icon={icon}
        style={{ fontWeight: text ? 600 : undefined, minWidth: 32 }}
      >
        {text}
      </Button>
    </Tooltip>
  );
}

/** Word and reading-time counts help editors judge length while writing. */
function countWords(editor: Editor | null): number {
  const text = editor?.getText() ?? '';
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/**
 * Rich text editor for article bodies (SRS BLOG 001 "sanitized rich content").
 * It produces HTML limited to the structures the server allowlist keeps:
 * headings, emphasis, lists, quotes, code, links, images and tables. The server
 * sanitises again on save, so the editor is a convenience, never the security
 * boundary (SEC 001).
 */
export function RichTextEditor({ value, onChange, disabled = false, ariaLabel = 'Article body', minHeight = 420 }: Props) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const editor = useEditor({
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, protocols: ['http', 'https', 'mailto', 'tel'], HTMLAttributes: { rel: 'noopener noreferrer nofollow' } },
      }),
      Image.configure({ inline: false, HTMLAttributes: { loading: 'lazy' } }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || '',
    onUpdate: ({ editor: instance }) => {
      const html = instance.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
    editorProps: {
      attributes: {
        'aria-label': ariaLabel,
        role: 'textbox',
        'aria-multiline': 'true',
        class: 'ms-editor-body',
        style: `min-height:${minHeight}px;padding:16px;outline:none;`,
      },
    },
    immediatelyRender: false,
  });

  // Adopt content loaded after mount (e.g. an existing article) without
  // clobbering what the editor already has while someone is typing.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = value || '';
    if (incoming !== current && (current === '<p></p>' || current === '')) editor.commands.setContent(incoming, { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  const openLinkDialog = useCallback(() => {
    setLinkUrl(editor?.getAttributes('link').href ?? '');
    setLinkOpen(true);
  }, [editor]);

  const applyLink = () => {
    if (!editor) return;
    const href = linkUrl.trim();
    if (href === '') editor.chain().focus().extendMarkRange('link').unsetLink().run();
    else editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    setLinkOpen(false);
  };

  const insertImage = (assets: MediaAsset[]) => {
    const asset = assets[0];
    setPickerOpen(false);
    if (!asset || !editor) return;
    const src = variantUrl(asset, 800) ?? variantUrl(asset, 320);
    if (src) editor.chain().focus().setImage({ src, alt: asset.altText ?? '' }).run();
  };

  if (!editor) return null;
  const words = countWords(editor);

  return (
    <div style={{ border: `1px solid ${brand.border}`, borderRadius: 10, background: brand.surfaceRaised, overflow: 'hidden' }}>
      <div
        role="toolbar"
        aria-label="Formatting"
        aria-controls={undefined}
        style={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', padding: '6px 8px', borderBottom: `1px solid ${brand.border}`, background: brand.surfaceMuted, position: 'sticky', top: 0, zIndex: 5 }}
      >
        <ToolButton label="Paragraph" text="P" active={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()} />
        {[2, 3, 4].map((level) => (
          <ToolButton
            key={level}
            label={`Heading ${level}`}
            text={`H${level}`}
            active={editor.isActive('heading', { level })}
            onClick={() => editor.chain().focus().toggleHeading({ level: level as 2 | 3 | 4 }).run()}
          />
        ))}
        <Divider type="vertical" />
        <ToolButton label="Bold" icon={<BoldOutlined aria-hidden="true" />} active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
        <ToolButton label="Italic" icon={<ItalicOutlined aria-hidden="true" />} active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
        <ToolButton label="Strikethrough" icon={<StrikethroughOutlined aria-hidden="true" />} active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} />
        <Divider type="vertical" />
        <ToolButton label="Bulleted list" icon={<UnorderedListOutlined aria-hidden="true" />} active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <ToolButton label="Numbered list" icon={<OrderedListOutlined aria-hidden="true" />} active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
        <ToolButton label="Quote" text="❝" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
        <ToolButton label="Code block" icon={<CodeOutlined aria-hidden="true" />} active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
        <ToolButton label="Divider" text="—" onClick={() => editor.chain().focus().setHorizontalRule().run()} />
        <Divider type="vertical" />
        <ToolButton label="Link" icon={<LinkOutlined aria-hidden="true" />} active={editor.isActive('link')} onClick={openLinkDialog} />
        <ToolButton label="Insert image from the media library" icon={<PictureOutlined aria-hidden="true" />} onClick={() => setPickerOpen(true)} />
        <ToolButton label="Insert table" icon={<TableOutlined aria-hidden="true" />} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
        <Divider type="vertical" />
        <ToolButton label="Undo" icon={<UndoOutlined aria-hidden="true" />} disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} />
        <ToolButton label="Redo" icon={<RedoOutlined aria-hidden="true" />} disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} />
      </div>

      <EditorContent editor={editor} />

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 12px', borderTop: `1px solid ${brand.border}`, background: brand.surfaceMuted }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Scripts, styles and unknown tags are removed when you save.
        </Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }} aria-live="polite">
          {words} words · about {Math.max(1, Math.round(words / 200))} min read
        </Typography.Text>
      </div>

      <Modal open={linkOpen} title="Link" okText="Apply" onOk={applyLink} onCancel={() => setLinkOpen(false)} destroyOnHidden>
        <Form layout="vertical">
          <Form.Item label="Address" extra="Leave empty to remove the link. External links open in a new tab with rel=noopener.">
            <Input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://example.com/page" autoFocus onPressEnter={applyLink} />
          </Form.Item>
        </Form>
        <Space>
          <Button
            size="small"
            onClick={() => {
              setLinkUrl('');
              applyLink();
            }}
          >
            Remove link
          </Button>
        </Space>
      </Modal>

      <MediaPicker open={pickerOpen} onCancel={() => setPickerOpen(false)} onPick={insertImage} />
    </div>
  );
}
