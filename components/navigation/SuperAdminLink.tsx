'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { getFounderSystemHealth } from '@/lib/founder-api';

type Props = {
  href: string;
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
};

/** Uses the existing server-side Founder authorization as the UI permission source. */
export function SuperAdminLink({ href, children, className, 'aria-label': ariaLabel }: Props) {
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;
    void getFounderSystemHealth()
      .then(() => {
        if (active) setAuthorized(true);
      })
      .catch(() => {
        if (active) setAuthorized(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!authorized) return null;
  return <Link href={href} className={className} aria-label={ariaLabel}>{children}</Link>;
}
