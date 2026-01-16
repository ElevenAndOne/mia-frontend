import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge Tailwind CSS classes
 * Uses clsx for conditional classes and tailwind-merge to resolve conflicts
 *
 * Example:
 * cn('px-4 py-2', isActive && 'bg-blue-500', 'px-6') // => 'py-2 bg-blue-500 px-6'
 * The later px-6 overrides px-4
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
