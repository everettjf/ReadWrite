import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FieldProps {
  label: string;
  description?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
  /** When true, render the label inline with the control (used for switches). */
  inline?: boolean;
}

export function Field({
  label,
  description,
  htmlFor,
  children,
  className,
  inline,
}: FieldProps): JSX.Element {
  if (inline) {
    return (
      <div className={cn('flex items-start justify-between gap-4 py-3', className)}>
        <div className="space-y-1">
          <Label htmlFor={htmlFor}>{label}</Label>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className="shrink-0">{children}</div>
      </div>
    );
  }
  return (
    <div className={cn('space-y-1.5 py-3', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <div className="pt-1">{children}</div>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <section className="space-y-1">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}
