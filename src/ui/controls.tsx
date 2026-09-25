import { X } from 'lucide-react'
import { useId, useState, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'
import { cx, PALETTE, vars } from '../lib/utils'
import s from './ui.module.css'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  icon?: ReactNode
}

export function Button({ variant = 'secondary', size = 'md', icon, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={cx(s.btn, s[variant], size === 'sm' && s.sm, className)} {...rest}>
      {icon}
      {children}
    </button>
  )
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  size?: 'sm' | 'md'
  glass?: boolean
}

export function IconButton({ label, size = 'md', glass, className, children, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(s.btn, s.icon, size === 'sm' && s.sm, glass && s.glass, className)}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx(s.field, className)}>
      <span className={s.label}>
        {label}
        {hint && <span className={s.hint}>{hint}</span>}
      </span>
      {children}
    </label>
  )
}

/** Same as Field, but a <div> – for groups of buttons where <label> would steal clicks. */
export function FieldGroup({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  const id = useId()
  return (
    <div className={s.field} role="group" aria-labelledby={id}>
      <span className={s.label} id={id}>
        {label}
        {hint && <span className={s.hint}>{hint}</span>}
      </span>
      {children}
    </div>
  )
}

export function Chip({ color, children, className }: { color?: string; children: ReactNode; className?: string }) {
  return (
    <span className={cx(s.chip, className)}>
      {color && <span className={s.dot} style={vars({ '--c': color })} />}
      {children}
    </span>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Array<{ value: T; label: string; icon?: ReactNode; color?: string }>
  onChange: (v: T) => void
}) {
  return (
    <div className={s.segmented} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={s.segment}
          onClick={() => onChange(o.value)}
        >
          {o.color && <span className={s.dot} style={vars({ '--c': o.color })} />}
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ToggleChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} className={s.segment} onClick={onClick}>
      {children}
    </button>
  )
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const custom = !PALETTE.some((p) => p.value === value)
  return (
    <div className={s.swatches} role="radiogroup" aria-label="Color">
      {PALETTE.map((p) => (
        <button
          key={p.value}
          type="button"
          role="radio"
          aria-checked={p.value === value}
          aria-label={p.name}
          title={p.name}
          className={s.swatch}
          style={vars({ '--c': p.value })}
          onClick={() => onChange(p.value)}
        />
      ))}
      <label
        className={cx(s.customSwatch)}
        title="Custom color"
        style={custom ? { background: value, boxShadow: `0 0 0 2px var(--bg), 0 0 0 4px ${value}` } : undefined}
      >
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Custom color" />
      </label>
    </div>
  )
}

export function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('')

  const commit = () => {
    const parts = draft.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
    const next = [...value, ...parts.filter((t) => !value.includes(t))]
    if (next.length !== value.length) onChange(next)
    setDraft('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className={cx(s.input, s.tagBox)}>
      {value.map((t) => (
        <span key={t} className={s.tag}>
          {t}
          <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}>
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        className={s.tagInput}
        value={draft}
        placeholder={value.length ? '' : placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
      />
    </div>
  )
}

export function EmptyState({ icon, title, body, children }: { icon: ReactNode; title: string; body?: ReactNode; children?: ReactNode }) {
  return (
    <div className={s.empty}>
      <div className={s.emptyIcon}>{icon}</div>
      <h3 className={cx('display', s.emptyTitle)}>{title}</h3>
      {body && <p className={s.emptyBody}>{body}</p>}
      {children && <div className={s.emptyActions}>{children}</div>}
    </div>
  )
}
