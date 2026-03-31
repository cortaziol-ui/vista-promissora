interface VendorAvatarProps {
  foto?: string;
  avatar: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'w-6 h-6 text-sm',
  md: 'w-8 h-8 text-xl',
  lg: 'w-10 h-10 text-2xl',
};

export function VendorAvatar({ foto, avatar, size = 'md', className = '' }: VendorAvatarProps) {
  const sizeClass = sizes[size];
  if (foto) {
    return <img src={foto} alt="" className={`${sizeClass} rounded-full object-cover shrink-0 ${className}`} />;
  }
  return <span className={`${sizeClass} rounded-full bg-secondary flex items-center justify-center shrink-0 ${className}`}>{avatar}</span>;
}
