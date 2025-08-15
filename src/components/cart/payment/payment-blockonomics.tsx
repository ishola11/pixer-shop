import { useRouter } from 'next/router';
import { useEffect, useMemo } from 'react';
import { useOrder } from '@/data/order';

const PaymentBlockonomics: React.FC = () => {
  const router = useRouter();

  // Try a couple of common query names; adjust if your route uses a different one
  const trackingNumber =
    (router.query.tracking_number as string) ||
    (router.query.tracking as string) ||
    '';

  // Load order to read payment_intent (OrderController->show attaches it)
  const { order, refetch } = useOrder({ tracking_number: trackingNumber });

  const intentInfo = useMemo(() => {
    const intents = (order as any)?.payment_intent ?? [];
    const pi = intents.find(
      (i: any) => (i.payment_gateway || '').toUpperCase() === 'BLOCKONOMICS',
    );
    return pi?.payment_intent_info || null;
  }, [order]);

  // Poll order while the user might be paying; webhook will flip status
  useEffect(() => {
    const id = setInterval(() => refetch?.(), 5000);
    return () => clearInterval(id);
  }, [refetch]);

  // We only stored BTC address in the intent; amount is optional in the URI
  const address = intentInfo?.payment_id as string | undefined;
  if (!address) {
    return <div className="text-sm">Preparing your BTC address…</div>;
  }

  const btcUri = `bitcoin:${address}`; // no amount — safe for all wallets
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    btcUri,
  )}`;

  return (
    <div className="space-y-4">
      <div className="text-sm">
        Send BTC to the address below. We’ll mark your order paid after network
        confirmations.
      </div>
      <img src={qrUrl} alt="BTC QR" className="h-40 w-40" />
      <div className="text-[12px] break-all rounded border p-2">{address}</div>
      <a
        className="inline-block rounded bg-accent px-3 py-2 text-white"
        href={btcUri}
      >
        Open in Wallet
      </a>
      <div className="text-[12px] text-gray-500">
        You can close this tab — status updates automatically.
      </div>
    </div>
  );
};

export default PaymentBlockonomics;
