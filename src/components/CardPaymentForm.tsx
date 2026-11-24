import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { safeFetchJson } from '../lib/network';
import { PaymentMethod } from '../types';

export interface CardGatewayStatus {
  liveCardConnected: boolean;
  provider: string;
  mode: 'live' | 'stripe_test' | 'sandbox_only';
  missingKeys: string[];
}

export interface CardAuthorizationResult {
  reference: string;
  method: PaymentMethod;
  cardBrand: string;
  last4: string;
  cardSandboxToken?: string;
}

interface CardPaymentFormProps {
  purpose: 'subscription' | 'marketplace' | 'ad_slot';
  plan?: 'ad_slot' | 'basic' | 'pro' | 'premium';
  amountUsd: number;
  description: string;
  methodLabel: 'Card' | 'Stripe';
  defaultName?: string;
  defaultEmail?: string;
  submittingExternal?: boolean;
  onBeforeStripeRedirect?: () => void;
  onAuthorized: (result: CardAuthorizationResult) => Promise<void> | void;
}

function luhnValid(digits: string): boolean {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let doubleNext = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (doubleNext) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    doubleNext = !doubleNext;
  }
  return sum % 10 === 0;
}

function detectBrand(digits: string): 'Visa' | 'Mastercard' | 'Amex' | 'Discover' | 'Card' {
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  if (/^(6011|65)/.test(digits)) return 'Discover';
  return 'Card';
}

function formatCardDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 19);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export const CardPaymentForm: React.FC<CardPaymentFormProps> = ({
  purpose,
  plan,
  amountUsd,
  description,
  methodLabel,
  defaultName = '',
  defaultEmail = '',
  submittingExternal = false,
  onBeforeStripeRedirect,
  onAuthorized,
}) => {
  const [gateway, setGateway] = useState<CardGatewayStatus | null>(null);
  const [entryMode, setEntryMode] = useState<'card_form' | 'reference'>('card_form');
  const [cardholderName, setCardholderName] = useState(defaultName);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [manualReference, setManualReference] = useState('');
  const [processing, setProcessing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [requiresStripeNotice, setRequiresStripeNotice] = useState(false);

  useEffect(() => {
    let active = true;
    void safeFetchJson<CardGatewayStatus>('/api/payments/card/gateway-status', {
      reportErrors: false,
    }).then((res) => {
      if (active && res.ok && res.data) {
        setGateway(res.data);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const cleanDigits = cardNumber.replace(/\D/g, '');
  const brand = detectBrand(cleanDigits);
  const isCardValidNumber = cleanDigits.length >= 13 && luhnValid(cleanDigits);

  const handleStripeRedirect = async () => {
    setFormError(null);
    setRequiresStripeNotice(false);
    setProcessing(true);
    try {
      const res = await safeFetchJson<{
        initiated?: boolean;
        requiresStripeSecret?: boolean;
        checkoutUrl?: string;
        error?: string;
      }>('/api/payments/card/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose,
          plan,
          amountUsd,
          description,
          customerEmail: defaultEmail,
        }),
      });
      if (res.status === 503 && res.data?.requiresStripeSecret) {
        setRequiresStripeNotice(true);
        return;
      }
      if (!res.ok || !res.data?.initiated || !res.data?.checkoutUrl) {
        setFormError(res.error || res.data?.error || 'Could not launch Stripe card checkout.');
        return;
      }
      onBeforeStripeRedirect?.();
      window.location.assign(res.data.checkoutUrl);
    } finally {
      setProcessing(false);
    }
  };

  const handleSandboxCardPay = async () => {
    setFormError(null);
    if (cardholderName.trim().length < 2) {
      setFormError('Enter the cardholder full name.');
      return;
    }
    if (!luhnValid(cleanDigits)) {
      setFormError('Enter a valid card number (Visa, Mastercard, or Amex).');
      return;
    }
    const expMatch = /^(\d{2})\/(\d{2})$/.exec(expiry.trim());
    if (!expMatch) {
      setFormError('Enter a valid expiration date in MM/YY format.');
      return;
    }
    const expMonth = Number(expMatch[1]);
    const expYear = 2000 + Number(expMatch[2]);
    const now = new Date();
    if (
      expMonth < 1 ||
      expMonth > 12 ||
      expYear < now.getUTCFullYear() ||
      (expYear === now.getUTCFullYear() && expMonth < now.getUTCMonth() + 1)
    ) {
      setFormError('This card expiration date is invalid or expired.');
      return;
    }
    if (cvc.length < 3 || cvc.length > 4) {
      setFormError('Enter a valid 3 or 4 digit CVC security code.');
      return;
    }

    setProcessing(true);
    try {
      const res = await safeFetchJson<{
        authorized?: boolean;
        cardSandboxToken?: string;
        reference?: string;
        brand?: string;
        last4?: string;
        error?: string;
      }>('/api/payments/card/sandbox-authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardholderName: cardholderName.trim(),
          cardNumber: cleanDigits,
          expiry: expiry.trim(),
          cvc,
          amountUsd,
        }),
      });
      const json = res.data;
      if (!res.ok || !json?.authorized || !json.reference || !json.cardSandboxToken) {
        setFormError(res.error || json?.error || 'Card authorization failed.');
        return;
      }
      await onAuthorized({
        reference: json.reference,
        method: methodLabel,
        cardBrand: json.brand || brand,
        last4: json.last4 || cleanDigits.slice(-4),
        cardSandboxToken: json.cardSandboxToken,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleManualReferenceSubmit = async () => {
    setFormError(null);
    const cleaned = manualReference.trim();
    if (cleaned.length < 6) {
      setFormError('Enter a valid Card / Stripe receipt or authorization ID (at least 6 characters).');
      return;
    }
    setProcessing(true);
    try {
      await onAuthorized({
        reference: cleaned,
        method: methodLabel,
        cardBrand: methodLabel,
        last4: cleaned.slice(-4),
      });
    } finally {
      setProcessing(false);
    }
  };

  const busy = processing || submittingExternal;

  return (
    <div className="space-y-3.5">
      {/* Live Gateway Status Banner */}
      {gateway && (
        <div
          className={`rounded-lg px-3 py-2 text-[11px] border flex items-start gap-2 ${
            gateway.liveCardConnected
              ? 'bg-[#0A4D2E]/10 border-[#0A4D2E]/25 text-[#0A4D2E]'
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}
        >
          {gateway.liveCardConnected ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#0A4D2E]" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-700" />
          )}
          <span>
            {gateway.liveCardConnected ? (
              <>
                <strong>Live Stripe Card Checkout Connected</strong> — Pay securely with Visa,
                Mastercard, Amex, Apple Pay, or Google Pay.
              </>
            ) : (
              <>
                <strong>Card Sandbox Mode Active (No Real Charge)</strong> — Add{' '}
                <code className="font-mono font-semibold">STRIPE_SECRET_KEY</code> in AI Studio
                Secrets to charge real Visa/Mastercard cards.
              </>
            )}
          </span>
        </div>
      )}

      {/* If Stripe IS connected, offer 1-Click Hosted PCI Checkout */}
      {gateway?.liveCardConnected && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleStripeRedirect()}
          className="w-full py-3 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
        >
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Opening Secure Card Checkout…
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 text-[#D4AF37]" />
              Pay ${amountUsd.toFixed(2)} via Stripe Card Checkout
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </>
          )}
        </button>
      )}

      {/* Mode Switcher: Card Form vs Receipt Reference */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#F3F5F4] border border-neutral-200">
        <button
          type="button"
          onClick={() => {
            setEntryMode('card_form');
            setFormError(null);
          }}
          className={`py-1.5 px-2.5 rounded-md text-xs font-semibold transition-colors ${
            entryMode === 'card_form'
              ? 'bg-[#0A4D2E] text-white'
              : 'text-neutral-700 hover:text-neutral-900'
          }`}
        >
          {gateway?.liveCardConnected ? 'Or Enter Receipt' : 'Card Details'}
        </button>
        <button
          type="button"
          onClick={() => {
            setEntryMode('reference');
            setFormError(null);
          }}
          className={`py-1.5 px-2.5 rounded-md text-xs font-semibold transition-colors ${
            entryMode === 'reference'
              ? 'bg-[#0A4D2E] text-white'
              : 'text-neutral-700 hover:text-neutral-900'
          }`}
        >
          Receipt / Auth ID
        </button>
      </div>

      {entryMode === 'card_form' ? (
        <div className="rounded-xl border border-neutral-200 bg-[#F3F5F4]/60 p-3.5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-neutral-900 inline-flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#0A4D2E]" />
              {gateway?.liveCardConnected ? 'Test / Sandbox Card Form' : 'Debit or Credit Card'}
            </span>
            <span className="font-mono text-[11px] font-semibold text-[#0A4D2E]">
              {cleanDigits.length > 0 ? brand : 'Visa · Mastercard · Amex'}
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-neutral-700 mb-1">
              Cardholder Name
            </label>
            <input
              type="text"
              autoComplete="cc-name"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              placeholder="Name on card"
              className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0A4D2E]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-neutral-700">Card Number</label>
              {cleanDigits.length >= 13 && (
                <span
                  className={`text-[10px] font-semibold ${
                    isCardValidNumber ? 'text-[#0A4D2E]' : 'text-red-600'
                  }`}
                >
                  {isCardValidNumber ? `${brand} valid` : 'Invalid card number'}
                </span>
              )}
            </div>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardDigits(e.target.value))}
              placeholder="4242 4242 4242 4242"
              className="w-full px-3 py-2 text-sm font-mono bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0A4D2E]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                Expiry (MM/YY)
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                maxLength={5}
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                placeholder="12/28"
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0A4D2E]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                CVC / CVV
              </label>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                maxLength={4}
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="123"
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0A4D2E]"
              />
            </div>
          </div>

          {requiresStripeNotice && (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
              STRIPE_SECRET_KEY is not configured on the server yet. You can complete a Luhn-validated
              sandbox card test below (no real funds charged).
            </p>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSandboxCardPay()}
            className="w-full py-2.5 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Authorizing Card…
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                {gateway?.liveCardConnected
                  ? `Authorize Card Test ($${amountUsd.toFixed(2)})`
                  : `Pay $${amountUsd.toFixed(2)} by Card (Sandbox Test)`}
              </>
            )}
          </button>

          <p className="text-[10px] text-neutral-500 text-center">
            Card numbers are never stored in SwayPalm databases. Only masked last-4 metadata and
            transaction IDs are saved.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              {methodLabel} Authorization / Receipt Reference
            </label>
            <input
              type="text"
              value={manualReference}
              onChange={(e) => setManualReference(e.target.value)}
              placeholder="e.g. pi_3Q8x... or AUTH-94821"
              className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0A4D2E]"
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleManualReferenceSubmit()}
            className="w-full py-2.5 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-xs font-bold transition-colors disabled:opacity-60"
          >
            {busy ? 'Verifying…' : `Verify Reference & Pay $${amountUsd.toFixed(2)}`}
          </button>
        </div>
      )}

      {formError && (
        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}
    </div>
  );
};
