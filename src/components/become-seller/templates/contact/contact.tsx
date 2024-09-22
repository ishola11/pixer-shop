// import SuperAdminContactForm from '@/components/settings/super-admin-contact-form';
import ContactForm from '@/components/contact-us/form';
import SectionHeading from '@/components/ui/section-heading';
import { useContactUs } from '@/data/contact';
import { useSettings } from '@/data/settings';
import { cn } from '@/lib/cn';
import { CreateContactUsInput } from '@/types';
import React, { useEffect, useState } from 'react';
import { SubmitHandler } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

type ContactProps = {
  className?: string;
  data?: {
    title?: string;
    description?: string;
  };
};

export default function Contact({ className, data }: ContactProps) {
  const { t } = useTranslation('common');
  const { settings } = useSettings();
  const { contactDetails } = settings ?? {};
  let [reset, setReset] = useState<CreateContactUsInput | null>(null);
  const { mutate, isLoading, isSuccess } = useContactUs();
  const onSubmit: SubmitHandler<CreateContactUsInput> = (values) => {
    mutate(values);
  };
  useEffect(() => {
    if (isSuccess) {
      setReset({
        name: '',
        email: '',
        subject: '',
        description: '',
      });
    }
  }, [isSuccess]);

  return (
    <section className={cn('py-20 dark:bg-dark-100', className)}>
      <div className="mx-auto max-w-[94.75rem] px-4">
        {data?.title ? (
          <SectionHeading title={data?.title} subtitle={data?.description} />
        ) : null}
        <div className="max-w-[1000px] mx-auto">
          {/* <SuperAdminContactForm /> */}
          <ContactForm
            onSubmit={onSubmit}
            reset={reset}
            isLoading={isLoading}
          />
        </div>
      </div>
    </section>
  );
}
