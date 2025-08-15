import { useModalState } from '@/components/modal-views/context';
import { useCards } from '@/data/card';
import ErrorMessage from '@/components/ui/error-message';
import StripePaymentModal from '@/components/payment/stripe/stripe-payment-modal';
import { PageLoader } from '@/components/ui/loader/spinner/spinner';
import dynamic from 'next/dynamic';
import React from 'react';

const RazorpayPaymentModal = dynamic(
  () => import('@/components/payment/razorpay/razorpay-payment-modal'),
  { ssr: false },
);

const BlockonomicsPaymentModal = dynamic(
  () => import('@/components/payment/blockonomics/blockonomics-payment-modal'),
  { ssr: false },
);

// Minimal placeholder for gateways that don't need a form
const NoopModal: React.FC<any> = () => (
  <div className="h-48 w-screen max-w-md rounded-xl bg-white p-12 dark:bg-dark-250 xs:max-w-[400px] md:max-w-[590px] md:rounded-xl lg:max-w-[736px]">
    <p className="text-sm">
      No additional details are required for this payment method.
    </p>
  </div>
);

// Map ALL gateways you might open a modal for, crypto -> NoopModal
const PAYMENTS_FORM_COMPONENTS: Record<
  string,
  { component: React.ComponentType<any>; type: 'custom' | 'default' }
> = {
  STRIPE: { component: StripePaymentModal, type: 'custom' },
  RAZORPAY: { component: RazorpayPaymentModal, type: 'default' },

  // crypto / hosted / no-form gateways
  BLOCKONOMICS: { component: BlockonomicsPaymentModal, type: 'default' },
  PAYPAL: { component: NoopModal, type: 'default' },
  MOLLIE: { component: NoopModal, type: 'default' },
  PAYSTACK: { component: NoopModal, type: 'default' },
  BITPAY: { component: NoopModal, type: 'default' },
  COINBASE: { component: NoopModal, type: 'default' },
};

const PaymentModal = () => {
  const {
    data: { paymentGateway, paymentIntentInfo, trackingNumber },
  } = useModalState();

  const { cards, isLoading, error } = useCards();

  const key = (paymentGateway || '').toUpperCase();
  const PaymentMethod = PAYMENTS_FORM_COMPONENTS[key] ?? {
    component: NoopModal,
    type: 'default',
  };

  const PaymentComponent = PaymentMethod.component;
  const paymentModalType = PaymentMethod.type;

  if (isLoading) {
    return (
      <div className="h-96 w-screen max-w-md rounded-xl bg-white p-12 dark:bg-dark-250 xs:max-w-[400px] md:max-w-[590px] md:rounded-xl lg:max-w-[736px]">
        <PageLoader showText={false} className="h-full" />
      </div>
    );
  }

  if (error) return <ErrorMessage message={error.message} />;

  return (
    <PaymentComponent
      paymentIntentInfo={paymentIntentInfo}
      trackingNumber={trackingNumber}
      paymentGateway={paymentGateway}
      cards={cards}
    />
  );
};

export default PaymentModal;
