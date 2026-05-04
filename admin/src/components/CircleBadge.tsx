type Size = 'sm' | 'md' | 'lg';

const SIZE: Record<Size, string> = {
  sm: 'h-5 w-5 text-xs',
  md: 'h-6 w-6 text-xs',
  lg: 'h-8 w-8 text-sm',
};

interface Props {
  value: number | string;
  size?: Size;
  className?: string;
}

export function CircleBadge({ value, size = 'md', className = '' }: Props) {
  const display = typeof value === 'number' && value > 99 ? '99+' : value;
  return (
    <span className={`inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-700 font-medium ${SIZE[size]} ${className}`}>
      {display}
    </span>
  );
}
