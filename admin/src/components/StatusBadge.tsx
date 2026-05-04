type Variant = 'pending' | 'approved' | 'rejected' | 'waitlisted' | 'draft';

const CLASSES: Record<Variant, string> = {
  pending:    'bg-yellow-100 text-yellow-800',
  approved:   'bg-green-100 text-green-800',
  rejected:   'bg-red-100 text-red-700',
  waitlisted: 'bg-orange-100 text-orange-800',
  draft:      'bg-gray-100 text-gray-600',
};

interface Props {
  variant: Variant;
  className?: string;
  children?: React.ReactNode;
}

export function StatusBadge({ variant, className = '', children }: Props) {
  const label = children ?? (variant.charAt(0).toUpperCase() + variant.slice(1));
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CLASSES[variant]} ${className}`}>
      {label}
    </span>
  );
}
