import { cx } from '../lib/utils'
import s from './ui.module.css'

export const inputClass = s.input
export const bigInputClass = cx(s.input, s.bigInput)
export const buttonClass = (variant: 'primary' | 'secondary' | 'ghost' | 'danger' = 'secondary') => cx(s.btn, s[variant])
