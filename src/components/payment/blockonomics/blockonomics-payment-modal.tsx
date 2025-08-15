type Tab = 'how' | 'troubleshoot' | 'faq';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PageLoader } from '@/components/ui/loader/spinner/spinner';
import { useOrder } from '@/data/order';
import { useModalAction } from '@/components/modal-views/context';
import NextImage from 'next/image';

/**
 * Blockonomics payment modal (enhanced)
 * - QR + address
 * - BTC & USD with robust fallbacks
 * - Live WS, polling fallback
 * - Copy buttons, “Open in wallet”, expiry countdown
 * - Under/over-payment guidance with tolerance
 * - How to Pay / Troubleshoot / FAQ tabs
 */

type IntentInfo = {
  // Core
  payment_id?: string; // BTC address (preferred)
  address?: string; // BTC address (alt)
  btc_amount?: number | string | null; // locked BTC amount
  btc_price?: number | string | null; // USD per BTC
  usd_amount?: number | string | null; // order total USD
  expires_at?: string | null; // ISO
  is_redirect?: boolean;

  // Reconciliation & tolerance
  expected_btc?: number | string | null; // if locked; defaults to btc_amount
  received_btc?: number | string | null; // sum received so far
  tolerance_pct?: number | string | null; // e.g. 2 => accept >= 98%

  // Optional telemetry
  status?: -1 | 0 | 1 | 2;
  txid?: string | null;
  last_update_at?: string | null;
};

type Props = {
  paymentIntentInfo: IntentInfo | null;
  trackingNumber: string;
  paymentGateway?: string;
  cards?: any;
};

const DEBUG = false;
const log = (...a: any[]) => {
  if (DEBUG) console.debug('[BlockonomicsModal]', ...a);
};

// ---------- helpers ---------------------------------------------------------

const asNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const formatUsd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    n,
  );
const formatBtc = (n: number) => n.toFixed(8);
const statusLabel = (s: -1 | 0 | 1 | 2 | undefined) =>
  s === 2
    ? 'Confirmed'
    : s === 1
      ? 'Pending Confirmation'
      : s === 0
        ? 'Unconfirmed'
        : s === -1
          ? 'Payment Error'
          : 'Waiting for payment';
const statusClasses = (s: -1 | 0 | 1 | 2 | undefined) =>
  s === 2
    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
    : s === 1 || s === 0
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
      : s === -1
        ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
        : 'bg-gray-100 text-gray-800 dark:bg-dark-400 dark:text-gray-200';

const copyText = async (text: string) => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
  } catch {
    /* ignore */
  }
};

// ---------- component --------------------------------------------------------

const BlockonomicsPaymentModal: React.FC<Props> = ({
  paymentIntentInfo,
  trackingNumber,
}) => {
  // normalize essentials
  const address =
    paymentIntentInfo?.payment_id || paymentIntentInfo?.address || '';

  const serverUsdAmount = asNum(paymentIntentInfo?.usd_amount); // preferred
  const serverBtcAmount = asNum(paymentIntentInfo?.btc_amount); // locked amount
  const serverBtcPrice = asNum(paymentIntentInfo?.btc_price);

  const expiresAtIso = paymentIntentInfo?.expires_at || null;
  const expiresAt = expiresAtIso ? new Date(expiresAtIso) : null;

  const { order, isLoading, refetch } = useOrder({
    tracking_number: trackingNumber,
  });
  const { closeModal } = useModalAction();

  // client price fallback if API didn’t send btc_price/btc_amount
  const [clientBtcPrice, setClientBtcPrice] = useState<number | null>(null);
  useEffect(() => {
    if (serverBtcAmount !== null || serverBtcPrice !== null) return;
    let cancelled = false;
    fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot')
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const n = asNum(j?.data?.amount);
        if (n !== null) setClientBtcPrice(n);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [serverBtcAmount, serverBtcPrice]);

  // USD total (intent preferred, else order)
  const usdTotal = useMemo(() => {
    const fromIntent = serverUsdAmount ?? null;
    const fromOrder = asNum(order?.paid_total) ?? null;
    return fromIntent ?? fromOrder ?? 0;
  }, [serverUsdAmount, order?.paid_total]);

  // BTC amount preference chain
  const btcAmount = useMemo(() => {
    if (serverBtcAmount !== null) return +formatBtc(serverBtcAmount);
    if (serverBtcPrice !== null && usdTotal)
      return +formatBtc(usdTotal / serverBtcPrice);
    if (clientBtcPrice !== null && usdTotal)
      return +formatBtc(usdTotal / clientBtcPrice);
    return null;
  }, [serverBtcAmount, serverBtcPrice, clientBtcPrice, usdTotal]);

  // live status via WS with polling fallback
  const [status, setStatus] = useState<-1 | 0 | 1 | 2 | undefined>(undefined);
  const [wsFailed, setWsFailed] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const [tab, setTab] = useState<Tab>('how');

  useEffect(() => {
    if (!address) return;
    try {
      const ws = new WebSocket(`wss://www.blockonomics.co/payment/${address}`);
      wsRef.current = ws;
      ws.onopen = () => log('WS open');
      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          log('WS message', data);
          if (typeof data.status !== 'undefined') {
            const s = Number(data.status) as -1 | 0 | 1 | 2;
            setStatus(s);
            if (s === 2) {
              setTimeout(async () => {
                await refetch();
                closeModal();
              }, 1200);
            }
          }
        } catch (e) {
          log('WS parse error', e);
        }
      };
      ws.onerror = (e) => {
        log('WS error', e);
        setWsFailed(true);
      };
      ws.onclose = () => {
        log('WS closed');
        setWsFailed(true);
      };
      return () => {
        try {
          ws.close();
        } catch {}
      };
    } catch (e) {
      log('WS construct error', e);
      setWsFailed(true);
    }
  }, [address, refetch, closeModal]);

  useEffect(() => {
    if (!wsFailed) return;
    const iv = setInterval(async () => {
      const { data } = await refetch();
      if (data?.payment_status === 'SUCCESS') {
        clearInterval(iv);
        closeModal();
      }
    }, 7000);
    return () => clearInterval(iv);
  }, [wsFailed, refetch, closeModal]);

  // expiry countdown
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const expired = useMemo(
    () => (expiresAt ? Date.now() > expiresAt.getTime() : false),
    [expiresAt],
  );
  useEffect(() => {
    if (!expiresAt) return setTimeLeft(null);
    const tick = () => {
      const now = new Date();
      const diff = Math.max(0, expiresAt.getTime() - now.getTime());
      const s = Math.floor(diff / 1000);
      const mm = Math.floor(s / 60)
        .toString()
        .padStart(2, '0');
      const ss = (s % 60).toString().padStart(2, '0');
      setTimeLeft(`${mm}:${ss}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  // tolerance/under/over calc
  const expected =
    (asNum(paymentIntentInfo?.expected_btc) ??
      asNum(paymentIntentInfo?.btc_amount) ??
      btcAmount ??
      0) ||
    0;
  const received = asNum(paymentIntentInfo?.received_btc) ?? 0;
  const tolPct = asNum(paymentIntentInfo?.tolerance_pct) ?? 2; // default 2%
  const minAccept = expected * (1 - tolPct / 100);
  const maxAccept = expected * (1 + tolPct / 100);
  const underpaid = received > 0 && received < minAccept;
  const overpaid = received > maxAccept;
  const needed = Math.max(0, minAccept - received);
  const excess = Math.max(0, received - maxAccept);

  // URI + responsive QR
  const btcUri =
    btcAmount !== null
      ? `bitcoin:${address}?amount=${btcAmount}`
      : `bitcoin:${address}`;
  const qrData = encodeURIComponent(btcUri);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${qrData}`;

  if (isLoading || !address) {
    return (
      <div className="h-72 w-screen max-w-md rounded-xl bg-white p-8 dark:bg-dark-250 xs:max-w-[400px] md:max-w-[590px] md:rounded-xl lg:max-w-[736px]">
        <PageLoader showText />
      </div>
    );
  }

  // simple tabs for guidance
  const tabBtn = (k: Tab, label: string) => (
    <button
      onClick={() => setTab(k)}
      className={`rounded-md px-3 py-2 text-xs font-medium transition ${
        tab === k
          ? 'bg-brand text-white dark:bg-brand-dark'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-400 dark:text-gray-100'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="relative w-screen max-w-md rounded-xl bg-white p-6 pt-12 pr-10 dark:bg-dark-250 xs:max-w-[400px] md:max-w-[590px] md:rounded-xl lg:max-w-[736px]">
      {/* Close button stays clickable */}
      <button
        onClick={closeModal}
        className="absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-lg leading-none text-gray-700 hover:bg-gray-200 dark:bg-dark-400 dark:text-gray-100"
        aria-label="Close"
        type="button"
      >
        ×
      </button>

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold dark:text-white">
          Pay with Bitcoin
        </h3>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses(
            status,
          )}`}
        >
          {statusLabel(status)}
        </span>
      </div>

      {/* Expired warning */}
      {expired && (
        <div className="mb-4 rounded-md bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
          This payment window has expired. If you already sent the funds, your
          order will update once the network confirms. Otherwise, please create
          a new order.
        </div>
      )}

      {/* Under/Over banners */}
      {underpaid && (
        <div className="mb-3 rounded-md bg-amber-50 p-3 text-xs text-amber-800 dark:bg-[rgba(255,200,0,0.08)] dark:text-amber-300">
          <strong>Underpaid:</strong> about{' '}
          <code className="font-mono">{formatBtc(needed)}</code> BTC more is
          required (tolerance&nbsp;±{tolPct}%). Please send the additional
          amount to the same address.
        </div>
      )}
      {overpaid && (
        <div className="mb-3 rounded-md bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
          <strong>Overpaid:</strong> you sent about{' '}
          <code className="font-mono">{formatBtc(excess)}</code> BTC more than
          required. We’ll mark the order as paid; any extra will be handled per
          our policy.
        </div>
      )}

      {/* QR + actions */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-full max-w-[min(220px,80vw)]">
          {/* ✅ Next Image (add domain to next.config.js or keep unoptimized) */}
          <NextImage
            src={qrUrl}
            alt="Bitcoin payment QR"
            width={220}
            height={220}
            className="h-auto w-full rounded bg-white p-2 shadow"
            sizes="(max-width: 640px) 80vw, 220px"
            unoptimized // remove if you add domain to next.config.js
          />
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <a
            href={btcUri}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-md bg-brand px-3 py-2 text-xs font-medium text-white transition hover:opacity-90 dark:bg-brand-dark"
          >
            Open in wallet
          </a>
          <button
            onClick={() => copyText(address)}
            className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-dark-400 dark:text-gray-100 dark:hover:bg-dark-300"
            type="button"
          >
            Copy address
          </button>
          {btcAmount !== null && (
            <button
              onClick={() => copyText(String(btcAmount))}
              className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-dark-400 dark:text-gray-100 dark:hover:bg-dark-300"
              type="button"
            >
              Copy BTC amount
            </button>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="mt-5 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-4 text-sm dark:border-dark-400">
        <div className="grid grid-cols-3 items-start gap-2">
          <div className="col-span-1 text-gray-500 dark:text-gray-400">
            Send to
          </div>
          <div className="col-span-2 break-all font-mono">{address}</div>
        </div>

        <div className="grid grid-cols-3 items-start gap-2">
          <div className="col-span-1 text-gray-500 dark:text-gray-400">
            Amount (BTC)
          </div>
          <div className="col-span-2 font-mono">
            {btcAmount !== null ? `${formatBtc(btcAmount)} BTC` : '…'}
          </div>
        </div>

        <div className="grid grid-cols-3 items-start gap-2">
          <div className="col-span-1 text-gray-500 dark:text-gray-400">
            Amount (USD)
          </div>
          <div className="col-span-2 font-mono">
            {usdTotal ? formatUsd(usdTotal) : '…'}
          </div>
        </div>

        {(serverBtcPrice ?? clientBtcPrice) !== null && (
          <div className="grid grid-cols-3 items-start gap-2">
            <div className="col-span-1 text-gray-500 dark:text-gray-400">
              BTC Price
            </div>
            <div className="col-span-2 font-mono">
              1 BTC = {formatUsd((serverBtcPrice ?? clientBtcPrice) as number)}
            </div>
          </div>
        )}

        {expiresAt && (
          <div className="grid grid-cols-3 items-start gap-2">
            <div className="col-span-1 text-gray-500 dark:text-gray-400">
              Expires in
            </div>
            <div className="col-span-2 font-mono">{timeLeft ?? '—'}</div>
          </div>
        )}

        {(paymentIntentInfo?.tolerance_pct ?? null) !== null && (
          <div className="grid grid-cols-3 items-start gap-2">
            <div className="col-span-1 text-gray-500 dark:text-gray-400">
              Tolerance
            </div>
            <div className="col-span-2">
              {tolPct}% (auto-accept within ±{tolPct}%)
            </div>
          </div>
        )}
      </div>

      {/* Tabs: How to pay / Troubleshoot / FAQ */}
      <div className="mt-5">
        <div className="mb-3 flex flex-wrap gap-2">
          {tabBtn('how', 'How to pay')}
          {tabBtn('troubleshoot', 'Troubleshoot')}
          {tabBtn('faq', 'FAQ')}
        </div>

        {tab === 'how' && (
          <ol className="space-y-2 text-[13px] leading-relaxed text-gray-700 dark:text-gray-300">
            <li>
              1. Scan the QR with your BTC wallet, or click{' '}
              <em>Open in wallet</em>.
            </li>
            <li>
              2. Ensure the <strong>amount</strong> matches what’s shown above.
            </li>
            <li>
              3. Send with a reasonable network fee; avoid “slowest/0-fee”.
            </li>
            <li>4. This modal updates automatically after confirmations.</li>
          </ol>
        )}

        {tab === 'troubleshoot' && (
          <div className="space-y-2 text-[13px] leading-relaxed text-gray-700 dark:text-gray-300">
            <p>
              If you don’t see live updates, your network may block
              WebSockets—status will refresh every few seconds automatically.
            </p>
            <p>
              Local dev: make your API webhook public (ngrok/Cloudflare Tunnel)
              so the order auto-completes on confirmation.
            </p>
            <p>
              If the timer expires <em>after</em> you sent payment, we’ll still
              mark the order paid when the network confirms.
            </p>
          </div>
        )}

        {tab === 'faq' && (
          <ul className="list-disc space-y-2 pl-5 text-[13px] leading-relaxed text-gray-700 dark:text-gray-300">
            <li>
              <strong>Tolerance:</strong> we accept within ±{tolPct}% to account
              for price movement and fees.
            </li>
            <li>
              <strong>Underpayment:</strong> if shown, send the additional BTC
              to the <em>same</em> address.
            </li>
            <li>
              <strong>Overpayment:</strong> we’ll complete the order; any extra
              is handled per our policy.
            </li>
            <li>
              <strong>Confirmations:</strong> your order is marked paid after
              the transaction confirms on the blockchain.
            </li>
          </ul>
        )}
      </div>

      {/* Footer notes / controls */}
      <div className="mt-4 space-y-2 text-[11px] leading-relaxed text-gray-600 dark:text-gray-300">
        {!wsFailed ? (
          <p>
            Waiting for payment… this modal will update automatically once the
            network confirms your transaction.
          </p>
        ) : (
          <p className="text-amber-600">
            Live updates are blocked by your network; checking status every few
            seconds…
          </p>
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={() => refetch()}
            className="text-xs underline underline-offset-2 hover:opacity-80"
            type="button"
          >
            Refresh status
          </button>
          <button
            onClick={() => {
              refetch();
              closeModal();
            }}
            className="text-xs underline underline-offset-2 hover:opacity-80"
            type="button"
          >
            Continue in background
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlockonomicsPaymentModal;
