interface UserAvatarProps {
  picture?: string | null
  initials: string
  className: string
  alt?: string
}

export function UserAvatar({ picture, initials, className, alt = '' }: UserAvatarProps) {
  if (picture) {
    return <img src={picture} alt={alt} className={`${className} object-cover`} />
  }

  return <div className={className}>{initials}</div>
}
