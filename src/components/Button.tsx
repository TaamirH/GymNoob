import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg' | 'xl'

const variantClass: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink font-semibold shadow-[0_8px_24px_var(--accent-soft)]',
  secondary: 'bg-surface-2 text-ink',
  ghost: 'bg-transparent text-ink-2',
  danger: 'bg-danger-soft text-danger',
  outline: 'bg-transparent text-ink border border-line',
}

const sizeClass: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-xl gap-1.5',
  md: 'h-12 px-4 text-base rounded-2xl gap-2',
  lg: 'h-14 px-5 text-lg rounded-2xl gap-2',
  xl: 'h-16 px-6 text-xl rounded-3xl gap-2.5',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: IconName
  iconSize?: number
  full?: boolean
  children?: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconSize,
  full,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`pressable inline-flex items-center justify-center whitespace-nowrap select-none disabled:opacity-40 disabled:pointer-events-none ${variantClass[variant]} ${sizeClass[size]} ${full ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {icon && <Icon name={icon} size={iconSize ?? (size === 'sm' ? 16 : size === 'xl' ? 26 : 20)} />}
      {children}
    </button>
  )
}

export function IconButton({
  icon,
  label,
  size = 44,
  iconSize = 22,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string; size?: number; iconSize?: number }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`pressable inline-flex items-center justify-center rounded-full text-ink-2 hover:bg-surface-2 disabled:opacity-40 ${className}`}
      style={{ width: size, height: size }}
      {...rest}
    >
      <Icon name={icon} size={iconSize} />
    </button>
  )
}
