import { ArrowRight } from '@/components/icons/arrow-right';
import { fixDynamicLink } from '@/lib/fix-dynamic-link';
import Link from 'next/link';
import React from 'react';

type GuidelineItemProps = {
  title: string;
  link?: string;
};

export default function GuidelineItem({ title, link }: GuidelineItemProps) {
  return (
    <div className="rounded-[10px] shadow-guideline p-[30px] bg-light dark:bg-dark-200 space-y-3">
      {title ? (
        <h5 className="text-base lg:text-lg font-semibold text-dark dark:text-light">
          {title}
        </h5>
      ) : null}
      {link ? (
        <Link
          {...fixDynamicLink(link)}
          className="inline-block bg-brand hover:bg-brand-dark rounded-full h-8 w-8 p-2 transition-colors duration-300"
        >
          <ArrowRight className="text-white" />
        </Link>
      ) : (
        ''
      )}
    </div>
  );
}
