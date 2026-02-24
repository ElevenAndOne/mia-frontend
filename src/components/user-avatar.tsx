interface UserAvatarProps {
  name?: string | null
  imageUrl?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  fallbackClassName?: string
}

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps['size']>, string> = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 paragraph-sm',
  md: 'w-10 h-10 paragraph-sm',
  lg: 'w-12 h-12 paragraph-bg',
  xl: 'w-16 h-16 label-lg',
}

export const UserAvatar = ({
  name,
  imageUrl,
  size = 'sm',
  className = '',
  fallbackClassName = 'bg-utility-warning-400 text-utility-warning-700',
}: UserAvatarProps) => {
  const sizeClasses = SIZE_CLASSES[size]
  const initial = name?.charAt(0)?.toUpperCase() || 'U'

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name || 'User'}
        className={`${sizeClasses} rounded-full object-cover ${className}`.trim()}
      />
    )
  }

  return (
    <div
      className={`${sizeClasses} rounded-full flex items-center justify-center font-medium ${fallbackClassName} ${className}`.trim()}
    >
      {initial}
    </div>
  )
}
