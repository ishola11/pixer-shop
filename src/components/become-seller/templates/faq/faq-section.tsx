import Accordion from '@/components/ui/accordion';
import SectionHeading from '@/components/ui/section-heading';
import { cn } from '@/lib/cn';
import { BecomeSellerPageOptions } from '@/types';
import React from 'react';

interface FaqSectionProps
  extends Pick<
    BecomeSellerPageOptions,
    'faqTitle' | 'faqDescription' | 'faqItems'
  > {
  className?: string;
}

function prepareForAccordion(data: any[]) {
  return data.map((item) => ({
    faq_title: item?.title,
    faq_description: item?.description,
  }));
}

export default function FaqSection({
  faqTitle,
  faqDescription,
  faqItems,
  className,
}: FaqSectionProps) {
  return (
    <section
      className={cn('pt-20 pb-[70px] bg-light dark:bg-dark-200', className)}
    >
      <div className="mx-auto max-w-[94.75rem] px-4">
        <SectionHeading title={faqTitle} subtitle={faqDescription} />
        <div className="max-w-[1000px] mx-auto">
          {prepareForAccordion(faqItems)?.map((item, index) => (
            <Accordion
              items={item}
              key={index}
              // translatorNS="faq"
              // variant="shadow"
              // numberIndexing={true}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
