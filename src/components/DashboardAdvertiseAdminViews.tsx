import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Database,
  ExternalLink,
  Globe,
  Loader2,
  Lock,
  Megaphone,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Shield,
  Smartphone,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { useSwayPalm } from '../context/SwayPalmContext';
import { safeFetchJson } from '../lib/network';
import { getLiveAppUrl, getWebsiteBaseUrl, normalizeExternalUrl } from '../lib/urls';
import {
  AD_PLAY_PRICE_KES,
  AD_PLAY_PRICE_USD,
  PAYBILL_CONFIG,
  PAYMENT_METHODS,
  PaymentMethod,
  PlanDefinition,
  getOrderCommissionBreakdown,
} from '../types';
import { resizeSquareAvatarToDataUrl, SUBSCRIPTION_PLANS } from '../data/sampleCatalog';
import { BusinessAvatar, VerifiedBadge } from './BrandMark';
import { CardGatewayStatus, CardPaymentForm } from './CardPaymentForm';
import { PaidAdComposer, PaidAdModal } from './PaidAdStudio';
import { PlayStoreLaunchKitCard } from './PWAInstallControls';
import { PublicQrCodeCard } from './PublicQrCodeCard';

export const DashboardView: React.FC = () => {
  const {
    firebaseUser,
    userUuid,
    myBusiness,
    userProfile,
    products,
    orders,
    adverts,
    getDisplayBusinessName,
    setActivePage,
    deleteProduct,
    updateOrderStatus,
    updateMyBusiness,
    notifyToast,
    setShowAuthModal,
    setAuthMode,
  } = useSwayPalm();

  const [showAdvertModal, setShowAdvertModal] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleQuickPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const dataUrl = await resizeSquareAvatarToDataUrl(file, 360);
      await updateMyBusiness({ logoDataUrl: dataUrl });
    } catch {
      notifyToast('Could not upload profile picture.', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (!firebaseUser) {
    return (
      <div className="bg-white border border-neutral-200 rounded-xl p-10 text-center max-w-xl mx-auto">
        <h1 className="font-display font-bold text-xl text-neutral-900">
          Business Owner Dashboard
        </h1>
        <p className="text-sm text-neutral-600 mt-3">
          Sign in free to view profile analytics, manage your listed products, track incoming orders, and launch adverts.
        </p>
        <button
          type="button"
          onClick={() => {
            setAuthMode('register');
            setShowAuthModal(true);
          }}
          className="mt-5 px-5 py-2.5 rounded-lg bg-[#0A4D2E] text-white text-sm font-semibold"
        >
          Register Your Business Free
        </button>
      </div>
    );
  }

  const myUserId = userProfile?.id || userUuid || '';
  const myProducts = products.filter(
    (p) => p.user_id === myUserId || p.auth_uid === firebaseUser.uid
  );
  const myIncomingOrders = orders.filter(
    (o) => o.seller_id === myUserId || o.seller_auth_uid === firebaseUser.uid
  );
  const grossSales = myIncomingOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalPlatformFees = myIncomingOrders.reduce(
    (sum, o) => sum + getOrderCommissionBreakdown(o).platformFeeAmount,
    0
  );
  const netEarnings = myIncomingOrders.reduce(
    (sum, o) => sum + getOrderCommissionBreakdown(o).sellerNetAmount,
    0
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <BusinessAvatar
              photoUrl={myBusiness?.logoDataUrl}
              initials={myBusiness?.logoInitials || 'SP'}
              color={myBusiness?.logoColor || '#0A4D2E'}
              name={myBusiness?.name || 'Business Dashboard'}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl border border-neutral-200"
              textClassName="text-lg"
            />
            {myBusiness && (
              <label
                title={uploadingPhoto ? 'Uploading...' : 'Change profile picture'}
                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-[#0A4D2E] hover:bg-[#083D24] text-white border-2 border-white flex items-center justify-center cursor-pointer shadow-sm"
              >
                <Camera className="w-3.5 h-3.5" />
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingPhoto}
                  onChange={handleQuickPhotoUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
          <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-xl sm:text-2xl text-neutral-900">
              {myBusiness?.name || 'Business Dashboard'}
            </h1>
            {myBusiness?.verified && <VerifiedBadge plan={myBusiness.plan} className="w-5 h-5" />}
          </div>
          <p className="text-sm text-neutral-600 mt-1">
            Plan: <strong className="uppercase text-[#0A4D2E]">{userProfile?.plan || 'free'}</strong> · Manage products, adverts, and orders.
          </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {myBusiness && (
            <label className="cursor-pointer px-3 py-2 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 inline-flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-[#0A4D2E]" />
              {uploadingPhoto
                ? 'Uploading...'
                : myBusiness.logoDataUrl
                  ? 'Change Photo'
                  : 'Profile Photo'}
              <input
                type="file"
                accept="image/*"
                disabled={uploadingPhoto}
                onChange={handleQuickPhotoUpload}
                className="hidden"
              />
            </label>
          )}
          <button
            type="button"
            onClick={() => setActivePage('marketplace')}
            className="px-3.5 py-2 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            Add Product
          </button>
          <button
            type="button"
            onClick={() => setActivePage('settings')}
            className="px-3.5 py-2 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 inline-flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5 text-[#0A4D2E]" />
            Settings Kit
          </button>
          <button
            type="button"
            onClick={() => setActivePage('advertise')}
            className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#111915] text-xs font-bold hover:bg-[#c5a12f]"
          >
            Upgrade to Advertise
          </button>
        </div>
      </div>

      {/* 6-Column KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Views', value: (myBusiness?.viewsCount || 0).toLocaleString() },
          { label: 'Followers', value: (myBusiness?.followersCount || 0).toLocaleString() },
          { label: 'Orders', value: String(myIncomingOrders.length) },
          { label: 'Gross Sales', value: `$${grossSales.toFixed(2)}` },
          { label: '10% Auto-Fee', value: `-$${totalPlatformFees.toFixed(2)}` },
          { label: 'Net Earnings (90%)', value: `$${netEarnings.toFixed(2)}` },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-neutral-200 rounded-xl p-4">
            <p className="text-xs text-neutral-500">{kpi.label}</p>
            <p className="font-mono font-bold text-xl text-neutral-900 tabular-nums mt-1">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* My Products */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-base text-neutral-900">
            My Products ({myProducts.length})
          </h2>
          <button
            type="button"
            onClick={() => setActivePage('marketplace')}
            className="text-xs font-semibold text-[#0A4D2E] hover:underline"
          >
            Manage in Marketplace
          </button>
        </div>
        {myProducts.length === 0 ? (
          <p className="text-sm text-neutral-500">
            You have not listed any products yet. Visit Marketplace to publish your first product free.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500">
                  <th className="py-2 pr-4 font-semibold">Product</th>
                  <th className="py-2 px-4 font-semibold">Category</th>
                  <th className="py-2 px-4 font-semibold text-right">Price</th>
                  <th className="py-2 px-4 font-semibold text-right">Stock</th>
                  <th className="py-2 pl-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {myProducts.map((p) => (
                  <tr key={p.product_id}>
                    <td className="py-2.5 pr-4 font-semibold text-neutral-900">{p.title}</td>
                    <td className="py-2.5 px-4 text-neutral-600">{p.category}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">${p.price}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">{p.stock}</td>
                    <td className="py-2.5 pl-4 text-right">
                      <button
                        type="button"
                        onClick={() => deleteProduct(p.product_id)}
                        className="text-red-600 hover:text-red-800 inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* My Adverts & Incoming Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-base text-neutral-900">
              My Adverts ({adverts.length})
            </h2>
            <button
              type="button"
              onClick={() => setShowAdvertModal(true)}
              className="px-3 py-1.5 rounded-lg bg-[#0A4D2E] text-white text-xs font-semibold inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Post Ad (${AD_PLAY_PRICE_USD})
            </button>
          </div>
          {adverts.length === 0 ? (
            <p className="text-xs text-neutral-500">
              No active adverts yet. Every advert playing costs ${AD_PLAY_PRICE_USD} USD (KES {AD_PLAY_PRICE_KES.toLocaleString()}) — click Post Ad (${AD_PLAY_PRICE_USD}) to publish live immediately.
            </p>
          ) : (
            <div className="space-y-2.5">
              {adverts.map((ad) => (
                <div key={ad.advert_id} className="p-3 border border-neutral-200 rounded-lg flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-neutral-900 truncate">{ad.title}</p>
                    <p className="text-[11px] text-neutral-500">
                      Target: {ad.targetRegion} · {ad.status.toUpperCase()} · ${ad.priceUsd || AD_PLAY_PRICE_USD} {ad.paymentStatus === 'paid' ? 'Paid' : ''}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-[#0A4D2E] tabular-nums shrink-0">
                    {ad.impressions} plays · {ad.clicks} clicks
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <h2 className="font-display font-bold text-base text-neutral-900 mb-4">
            Recent Orders ({orders.length})
          </h2>
          {orders.length === 0 ? (
            <p className="text-xs text-neutral-500">
              Orders placed by or for your business will appear here.
            </p>
          ) : (
            <div className="space-y-2.5">
              {orders.map((ord) => {
                const isSeller =
                  ord.seller_id === myUserId || ord.seller_auth_uid === firebaseUser.uid;
                const split = getOrderCommissionBreakdown(ord);
                return (
                  <div key={ord.order_id} className="p-3 border border-neutral-200 rounded-lg flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-neutral-900 truncate">
                        {getDisplayBusinessName(ord.business_id, ord.seller_id)} · ${split.grossAmount.toFixed(2)}
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        {ord.paymentMethod} · Status: {ord.status.toUpperCase()}
                      </p>
                      <p className="text-[11px] font-mono mt-0.5 text-neutral-600 tabular-nums">
                        10% Fee: -${split.platformFeeAmount.toFixed(2)} ·{' '}
                        <span className="font-semibold text-[#0A4D2E]">
                          {isSeller ? `Net Payout: $${split.sellerNetAmount.toFixed(2)}` : `Seller Net: $${split.sellerNetAmount.toFixed(2)}`}
                        </span>{' '}
                        ({(ord.feeStatus || 'deducted').toUpperCase()})
                      </p>
                    </div>
                    {isSeller && ord.status !== 'delivered' && (
                      <button
                        type="button"
                        onClick={() =>
                          updateOrderStatus(
                            ord,
                            ord.status === 'pending'
                              ? 'confirmed'
                              : ord.status === 'confirmed'
                                ? 'shipped'
                                : 'delivered'
                          )
                        }
                        className="px-2.5 py-1 rounded bg-[#0A4D2E] text-white text-[11px] font-semibold shrink-0"
                      >
                        Advance Status
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <PaidAdModal open={showAdvertModal} onClose={() => setShowAdvertModal(false)} />
    </div>
  );
};

export const AdvertiseSubscriptionView: React.FC = () => {
  const {
    userUuid,
    userProfile,
    payments,
    adverts,
    playingAdverts,
    guestAdIds,
    getDisplayBusinessName,
    recordAdvertClick,
    subscribeToPlan,
    firebaseUser,
    myBusiness,
    setShowAuthModal,
    setAuthMode,
    notifyToast,
  } = useSwayPalm();
  const myUserId = userProfile?.id || userUuid || '';
  const [selectedPlan, setSelectedPlan] = useState<PlanDefinition | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('M-Pesa');
  const [mpesaFlow, setMpesaFlow] = useState<'stk_prompt' | 'manual_code'>('stk_prompt');
  const [payerPhone, setPayerPhone] = useState(userProfile?.phone || '');
  const [mpesaCode, setMpesaCode] = useState('');
  const [reference, setReference] = useState('');
  const [paying, setPaying] = useState(false);
  const [requestingStk, setRequestingStk] = useState(false);
  const [stkSession, setStkSession] = useState<{
    checkoutRequestId: string;
    mode: 'daraja_stk' | 'interactive_prompt';
    status: 'pending' | 'confirmed' | 'cancelled' | 'failed';
    normalizedPhone: string;
    amountKes: number;
    mpesaReceiptNumber?: string;
    settlementStatus?: 'pending' | 'direct_paybill_247247' | 'b2b_forwarded' | 'b2b_failed' | 'preview_only';
    b2bConversationId?: string;
    message: string;
  } | null>(null);
  const [stkPin, setStkPin] = useState('');
  const [confirmingStkPin, setConfirmingStkPin] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [requiresDarajaSecrets, setRequiresDarajaSecrets] = useState<string[] | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<{
    liveSimStkConnected: boolean;
    env: 'production' | 'sandbox';
    shortcode: string;
    partyB: string;
    accountNumber: string;
    callbackUrl: string;
    autoB2BEnabled: boolean;
    missingKeys: string[];
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<'paybill' | 'account' | null>(null);

  const currentPlan = userProfile?.plan || 'free';

  const fetchGatewayStatus = async () => {
    const res = await safeFetchJson<{
      liveSimStkConnected: boolean;
      env: 'production' | 'sandbox';
      shortcode: string;
      partyB: string;
      accountNumber: string;
      callbackUrl: string;
      autoB2BEnabled: boolean;
      missingKeys: string[];
    }>('/api/payments/mpesa-paybill/gateway-status', { reportErrors: false });
    if (res.ok && res.data) {
      setGatewayStatus(res.data);
    }
  };

  useEffect(() => {
    if (selectedPlan) {
      void fetchGatewayStatus();
    }
  }, [selectedPlan?.id]);

  const handleCopyPaybill = async (key: 'paybill' | 'account', text: string) => {
    try {
      await navigator.clipboard?.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // ignore clipboard fallback
    }
  };

  const openCheckoutForPlan = (plan: PlanDefinition) => {
    if (!firebaseUser) {
      setAuthMode('register');
      setShowAuthModal(true);
      return;
    }
    setSelectedPlan(plan);
    setPaymentMethod('M-Pesa');
    setMpesaFlow('stk_prompt');
    setPayerPhone(userProfile?.phone || myBusiness?.whatsapp || '');
    setMpesaCode('');
    setReference('');
    setStkSession(null);
    setStkPin('');
    setRequiresDarajaSecrets(null);
    setCheckoutError(null);
  };

  const completeSubscriptionFromStk = async (
    plan: PlanDefinition,
    checkoutRequestId: string,
    receiptCode: string,
    phone: string,
    amountKes: number
  ) => {
    setPaying(true);
    try {
      const ok = await subscribeToPlan(
        plan.id as 'basic' | 'pro' | 'premium',
        'M-Pesa',
        receiptCode,
        {
          paybillNumber: PAYBILL_CONFIG.paybillNumber,
          accountNumber: PAYBILL_CONFIG.accountNumber,
          payerPhone: phone,
          amountKes,
          mpesaCode: receiptCode,
          checkoutRequestId,
        }
      );
      if (ok) {
        setSelectedPlan(null);
        setStkSession(null);
        setStkPin('');
        setMpesaCode('');
        setCheckoutError(null);
      } else {
        setCheckoutError('Payment confirmed, but activating your subscription failed. Please retry.');
      }
    } finally {
      setPaying(false);
    }
  };

  const checkStkStatusOnce = async () => {
    if (!stkSession || !selectedPlan || selectedPlan.id === 'free') return;
    const res = await safeFetchJson<{
      status?: 'pending' | 'confirmed' | 'cancelled' | 'failed';
      mpesaReceiptNumber?: string;
      resultDesc?: string;
      normalizedPhone?: string;
      amountKes?: number;
      settlementStatus?: 'pending' | 'direct_paybill_247247' | 'b2b_forwarded' | 'b2b_failed' | 'preview_only';
      b2bConversationId?: string;
    }>(
      `/api/payments/mpesa-paybill/stk-status/${encodeURIComponent(stkSession.checkoutRequestId)}`,
      { reportErrors: false, retries: 0 }
    );
    if (!res.ok || !res.data) return;
    const data = res.data;
    if (data.status === 'confirmed' && data.mpesaReceiptNumber) {
      setStkSession((prev) =>
        prev
          ? {
              ...prev,
              status: 'confirmed',
              mpesaReceiptNumber: data.mpesaReceiptNumber,
              settlementStatus: data.settlementStatus,
              b2bConversationId: data.b2bConversationId,
              message: data.resultDesc || 'M-Pesa payment confirmed!',
            }
          : null
      );
      await completeSubscriptionFromStk(
        selectedPlan,
        stkSession.checkoutRequestId,
        data.mpesaReceiptNumber,
        data.normalizedPhone || stkSession.normalizedPhone,
        data.amountKes || stkSession.amountKes
      );
    } else if (data.status === 'cancelled' || data.status === 'failed') {
      setStkSession((prev) =>
        prev
          ? {
              ...prev,
              status: data.status!,
              settlementStatus: data.settlementStatus,
              message: data.resultDesc || 'M-Pesa prompt did not complete.',
            }
          : null
      );
      setCheckoutError(data.resultDesc || 'M-Pesa prompt was cancelled or failed.');
    }
  };

  useEffect(() => {
    if (
      !selectedPlan ||
      !stkSession ||
      stkSession.mode !== 'daraja_stk' ||
      stkSession.status !== 'pending'
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      void checkStkStatusOnce();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [selectedPlan?.id, stkSession?.checkoutRequestId, stkSession?.mode, stkSession?.status]);

  const handleSendStkPrompt = async (allowPreviewFallback = false) => {
    if (!selectedPlan || selectedPlan.id === 'free') return;
    setCheckoutError(null);
    setRequiresDarajaSecrets(null);
    setStkSession(null);
    setStkPin('');
    setRequestingStk(true);
    try {
      const res = await safeFetchJson<{
        initiated?: boolean;
        requiresDarajaSecrets?: boolean;
        missingKeys?: string[];
        mode?: 'daraja_stk' | 'interactive_prompt';
        checkoutRequestId?: string;
        normalizedPhone?: string;
        amountKes?: number;
        message?: string;
        error?: string;
      }>('/api/payments/mpesa-paybill/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan.id,
          phone: payerPhone,
          businessName: myBusiness?.name || '',
          allowPreviewFallback,
        }),
      });
      const json = res.data;
      if (res.status === 503 && json?.requiresDarajaSecrets) {
        setRequiresDarajaSecrets(
          json.missingKeys && json.missingKeys.length > 0
            ? json.missingKeys
            : ['MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_PASSKEY']
        );
        return;
      }
      if (!res.ok || !json?.initiated || !json.checkoutRequestId) {
        setCheckoutError(
          res.error || json?.error || 'Could not initiate M-Pesa SIM STK prompt. Check the phone number.'
        );
        return;
      }
      setStkSession({
        checkoutRequestId: json.checkoutRequestId,
        mode: json.mode || 'daraja_stk',
        status: 'pending',
        normalizedPhone: json.normalizedPhone || payerPhone.trim(),
        amountKes: json.amountKes || selectedPlan.price * PAYBILL_CONFIG.kesPerUsd,
        settlementStatus: json.mode === 'daraja_stk' ? 'pending' : 'preview_only',
        message:
          json.message ||
          `SIM STK prompt sent for Paybill ${PAYBILL_CONFIG.paybillNumber} · Acc ${PAYBILL_CONFIG.accountNumber}.`,
      });
      notifyToast(
        json.mode === 'daraja_stk'
          ? 'Real SIM STK prompt sent! Check your phone screen to enter your M-Pesa PIN.'
          : 'UI Sandbox test prompt opened (no real funds moved).',
        json.mode === 'daraja_stk' ? 'success' : 'info'
      );
    } finally {
      setRequestingStk(false);
    }
  };

  const handleRespondToInteractivePrompt = async (action: 'confirm' | 'cancel') => {
    if (!stkSession || !selectedPlan || selectedPlan.id === 'free') return;
    setCheckoutError(null);
    if (action === 'confirm' && !/^\d{4}$/.test(stkPin.trim())) {
      setCheckoutError('Enter your 4-digit M-Pesa PIN to confirm this prompt.');
      return;
    }

    setConfirmingStkPin(true);
    try {
      const res = await safeFetchJson<{
        status?: 'confirmed' | 'cancelled';
        mpesaReceiptNumber?: string;
        normalizedPhone?: string;
        amountKes?: number;
        resultDesc?: string;
        error?: string;
      }>('/api/payments/mpesa-paybill/stk-respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkoutRequestId: stkSession.checkoutRequestId,
          action,
          pin: stkPin.trim(),
        }),
      });
      const data = res.data;
      if (!res.ok || !data) {
        setCheckoutError(res.error || 'Could not process M-Pesa prompt response.');
        return;
      }

      if (action === 'cancel' || data.status === 'cancelled') {
        setStkSession(null);
        setStkPin('');
        setCheckoutError('M-Pesa prompt cancelled. You can send a new prompt anytime.');
        return;
      }

      if (data.status === 'confirmed' && data.mpesaReceiptNumber) {
        setStkSession((prev) =>
          prev
            ? {
                ...prev,
                status: 'confirmed',
                mpesaReceiptNumber: data.mpesaReceiptNumber,
                message: data.resultDesc || 'Payment confirmed!',
              }
            : null
        );
        await completeSubscriptionFromStk(
          selectedPlan,
          stkSession.checkoutRequestId,
          data.mpesaReceiptNumber,
          data.normalizedPhone || stkSession.normalizedPhone,
          data.amountKes || stkSession.amountKes
        );
      }
    } finally {
      setConfirmingStkPin(false);
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || selectedPlan.id === 'free') return;
    setCheckoutError(null);

    if (paymentMethod === 'M-Pesa') {
      if (mpesaFlow === 'stk_prompt') {
        if (!stkSession) {
          await handleSendStkPrompt();
        } else if (stkSession.mode === 'interactive_prompt' && stkSession.status === 'pending') {
          await handleRespondToInteractivePrompt('confirm');
        } else if (stkSession.mode === 'daraja_stk' && stkSession.status === 'pending') {
          await checkStkStatusOnce();
        }
        return;
      }

      const cleanedPhone = payerPhone.trim();
      const cleanedCode = mpesaCode.replace(/\s+/g, '').toUpperCase();
      if (!cleanedPhone) {
        setCheckoutError('Enter the M-Pesa mobile number used to send payment.');
        return;
      }
      if (!/^[A-Z0-9]{8,14}$/.test(cleanedCode) || !/[A-Z]/.test(cleanedCode) || !/\d/.test(cleanedCode)) {
        setCheckoutError(
          'Enter your valid M-Pesa transaction code (8–14 letters & digits, e.g. UA82XYZ910).'
        );
        return;
      }

      setPaying(true);
      try {
        const kesAmount = selectedPlan.price * PAYBILL_CONFIG.kesPerUsd;
        const ok = await subscribeToPlan(
          selectedPlan.id as 'basic' | 'pro' | 'premium',
          'M-Pesa',
          cleanedCode,
          {
            paybillNumber: PAYBILL_CONFIG.paybillNumber,
            accountNumber: PAYBILL_CONFIG.accountNumber,
            payerPhone: cleanedPhone,
            amountKes: kesAmount,
            mpesaCode: cleanedCode,
          }
        );
        if (ok) {
          setSelectedPlan(null);
          setMpesaCode('');
          setStkSession(null);
          setCheckoutError(null);
        } else {
          setCheckoutError('Verification failed. Confirm your phone number and M-Pesa code.');
        }
      } finally {
        setPaying(false);
      }
      return;
    }

    if (paymentMethod === 'Card' || paymentMethod === 'Stripe') {
      return;
    }

    if (reference.trim().length < 4) {
      setCheckoutError(`Enter your ${paymentMethod} billing reference or confirmation ID.`);
      return;
    }

    setPaying(true);
    try {
      const ok = await subscribeToPlan(
        selectedPlan.id as 'basic' | 'pro' | 'premium',
        paymentMethod,
        reference.trim(),
        { payerPhone: payerPhone.trim() }
      );
      if (ok) {
        setSelectedPlan(null);
        setReference('');
        setCheckoutError(null);
      }
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* $12 Pay-Per-Ad Banner */}
      <div className="bg-[#0A4D2E] text-white rounded-xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold text-[#D4AF37]">
            SwayPalm Advertising &amp; Storefront Plans
          </p>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl mt-1.5 [text-wrap:balance]">
            Post an Ad for ${AD_PLAY_PRICE_USD} Per Ad Playing — Open to Users &amp; Non-Users.
          </h1>
          <p className="text-sm text-white/85 mt-2 leading-relaxed">
            Anyone — registered members or non-user visitors — can launch a Sponsored Ad on SwayPalm for ${AD_PLAY_PRICE_USD} USD (KES {AD_PLAY_PRICE_KES.toLocaleString()}) per ad playing. Pay via M-Pesa Paybill {PAYBILL_CONFIG.paybillNumber} or Card/Stripe to go live immediately.
          </p>
        </div>

        <div className="bg-white/10 border border-white/15 rounded-xl p-4 shrink-0 min-w-[250px] space-y-2">
          <p className="text-[11px] font-semibold text-[#D4AF37]">
            {PAYBILL_CONFIG.providerLabel}
          </p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-white/80">Paybill No.</span>
            <button
              type="button"
              onClick={() => void handleCopyPaybill('paybill', PAYBILL_CONFIG.paybillNumber)}
              className="font-mono font-bold text-sm text-white inline-flex items-center gap-1.5 hover:text-[#D4AF37]"
            >
              {PAYBILL_CONFIG.paybillNumber}
              {copiedKey === 'paybill' ? (
                <Check className="w-3.5 h-3.5 text-[#D4AF37]" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-white/75" />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-white/80">Account No.</span>
            <button
              type="button"
              onClick={() => void handleCopyPaybill('account', PAYBILL_CONFIG.accountNumber)}
              className="font-mono font-bold text-sm text-white inline-flex items-center gap-1.5 hover:text-[#D4AF37]"
            >
              {PAYBILL_CONFIG.accountNumber}
              {copiedKey === 'account' ? (
                <Check className="w-3.5 h-3.5 text-[#D4AF37]" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-white/75" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Direct $12 Per-Ad Composer & Checkout (Works for Guests & Users) */}
      <PaidAdComposer />

      {/* Active Playing Ads List */}
      {(() => {
        const myAdIds = new Set([...adverts.map((a) => a.advert_id), ...guestAdIds]);
        if (playingAdverts.length === 0 && adverts.length === 0) return null;
        return (
          <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display font-bold text-base text-neutral-900 inline-flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-[#0A4D2E]" />
                Ads Playing Live ({playingAdverts.length})
              </h2>
              <span className="font-mono text-xs text-[#0A4D2E] font-semibold">
                ${AD_PLAY_PRICE_USD} / ad playing
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {playingAdverts.map((ad) => {
                const isMine =
                  myAdIds.has(ad.advert_id) ||
                  Boolean(myUserId && ad.user_id === myUserId) ||
                  Boolean(firebaseUser && ad.auth_uid === firebaseUser.uid);
                const safeCtaUrl = normalizeExternalUrl(ad.ctaUrl);
                const advertiserDisplay =
                  ad.advertiser_name ||
                  getDisplayBusinessName(ad.business_id, ad.user_id, 'Sponsored Partner');
                return (
                  <div
                    key={ad.advert_id}
                    className={`p-3.5 rounded-lg border flex items-center justify-between gap-3 text-xs ${
                      isMine ? 'border-[#0A4D2E]/40 bg-[#0A4D2E]/5' : 'border-neutral-200 bg-[#FAFBFB]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-neutral-900 truncate">
                        {ad.title} {isMine ? '(Your Ad)' : ''}
                      </p>
                      <p className="text-[11px] text-neutral-600 truncate mt-0.5">
                        {advertiserDisplay} · {ad.targetRegion} ·{' '}
                        {ad.advertiserType === 'guest' ? 'Guest' : 'Member'} · $
                        {ad.priceUsd || AD_PLAY_PRICE_USD} Paid
                      </p>
                      {safeCtaUrl && (
                        <a
                          href={safeCtaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => recordAdvertClick(ad.advert_id)}
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0A4D2E] hover:underline"
                        >
                          <span>{ad.ctaLabel || 'Visit Offer'}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      )}
                    </div>
                    <div className="text-right shrink-0 font-mono tabular-nums">
                      <p className="font-bold text-[#0A4D2E]">{ad.impressions} plays</p>
                      <p className="text-[10px] text-neutral-500">{ad.clicks} clicks</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div className="pt-2">
        <h2 className="font-display font-bold text-lg text-neutral-900">
          Optional Verified Storefront Membership Plans
        </h2>
        <p className="text-xs text-neutral-600 mt-0.5">
          Registration is always $0. Upgrade anytime to unlock unlimited product listings and your Verified Gold Badge.
        </p>
      </div>

      {/* 4 Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const isPremium = plan.id === 'premium';
          const isPro = plan.id === 'pro';
          const kesPrice = plan.price * PAYBILL_CONFIG.kesPerUsd;

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-xl p-5 flex flex-col justify-between border ${
                isPremium
                  ? 'border-[#D4AF37]'
                  : isPro
                    ? 'border-[#0A4D2E]'
                    : 'border-neutral-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display font-extrabold text-base text-neutral-900">
                    {plan.name}
                  </h2>
                  {plan.badgeText && (
                    <span
                      className={`text-[11px] font-semibold ${
                        isPremium ? 'text-[#B58E17]' : 'text-[#0A4D2E]'
                      }`}
                    >
                      {plan.badgeText}
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 mt-1">{plan.audience}</p>

                <div className="mt-4 pb-4 border-b border-neutral-100">
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono font-extrabold text-3xl text-neutral-900 tabular-nums">
                      ${plan.price}
                    </span>
                    <span className="text-xs text-neutral-500">/ {plan.cadence}</span>
                  </div>
                  {plan.price > 0 && (
                    <p className="text-[11px] font-mono font-semibold text-[#0A4D2E] mt-1 tabular-nums">
                      M-Pesa Paybill: KES {kesPrice.toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="mt-4 space-y-1.5 text-xs border-b border-neutral-100 pb-4">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Products</span>
                    <span className="font-semibold text-neutral-900">{plan.productLimitLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Groups</span>
                    <span className="font-semibold text-neutral-900">{plan.groupLimitLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Promotion</span>
                    <span className="font-semibold text-[#0A4D2E]">{plan.boostsLabel}</span>
                  </div>
                </div>

                <ul className="mt-4 space-y-2.5 text-xs text-neutral-700">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#0A4D2E] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6">
                {plan.id === 'free' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!firebaseUser) {
                        setAuthMode('register');
                        setShowAuthModal(true);
                      }
                    }}
                    className="w-full py-2.5 px-4 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
                  >
                    {isCurrent && firebaseUser ? 'Active Free Plan' : 'Start Free ($0)'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openCheckoutForPlan(plan)}
                    className={`w-full py-2.5 px-4 rounded-lg text-xs font-bold transition-colors ${
                      isCurrent
                        ? 'bg-[#F3F5F4] text-neutral-700 hover:bg-neutral-200'
                        : isPremium
                          ? 'bg-[#D4AF37] text-[#111915] hover:bg-[#c5a12f]'
                          : 'bg-[#0A4D2E] text-white hover:bg-[#083D24]'
                    }`}
                  >
                    {isCurrent ? `Renew / Upgrade ($${plan.price})` : `Subscribe — $${plan.price}/mo`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Accepted Payment Methods Strip */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <CreditCard className="w-5 h-5 text-[#0A4D2E] shrink-0" />
          <div>
            <p className="font-display font-bold text-sm text-neutral-900">
              M-Pesa Paybill {PAYBILL_CONFIG.paybillNumber} · Acc {PAYBILL_CONFIG.accountNumber}
            </p>
            <p className="text-xs text-neutral-500">
              Pay via Lipa na M-Pesa Paybill {PAYBILL_CONFIG.paybillNumber} (Account {PAYBILL_CONFIG.accountNumber}) or global payment options for instant verification.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-neutral-800">
          {PAYMENT_METHODS.map((m) => (
            <span
              key={m}
              className={`px-3 py-1.5 rounded-lg ${
                m === 'M-Pesa'
                  ? 'bg-[#0A4D2E] text-white'
                  : 'bg-[#F3F5F4] text-neutral-800'
              }`}
            >
              {m === 'M-Pesa' ? `M-Pesa · ${PAYBILL_CONFIG.paybillNumber}` : m}
            </span>
          ))}
        </div>
      </div>

      {/* User Subscription Receipts */}
      {firebaseUser && payments.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display font-bold text-sm text-neutral-900 inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#0A4D2E]" />
              Your Subscription Payment Receipts
            </h3>
            <span className="font-mono text-xs text-neutral-500 tabular-nums">
              {payments.length} completed
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {payments.map((pay) => (
              <div
                key={pay.payment_id}
                className="p-3.5 rounded-lg border border-neutral-200 bg-[#F3F5F4]/50 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-bold text-neutral-900 truncate">
                    {pay.plan.toUpperCase()} Plan · {pay.method}
                  </p>
                  <p className="text-[11px] text-neutral-600 font-mono truncate mt-0.5">
                    Ref: {pay.reference}
                    {pay.paybillNumber ? ` · Paybill ${pay.paybillNumber}` : ''}
                    {pay.accountNumber ? ` · Acc ${pay.accountNumber}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono font-bold text-[#0A4D2E] tabular-nums">
                    ${pay.amount.toFixed(2)}
                  </p>
                  {typeof pay.amountKes === 'number' && pay.amountKes > 0 && (
                    <p className="font-mono text-[10px] text-neutral-500 tabular-nums">
                      KES {pay.amountKes.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscription Checkout Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-lg overflow-hidden my-auto shadow-2xl">
            <div className="px-6 py-4 bg-[#0A4D2E] text-white flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-base">
                  Subscribe to {selectedPlan.name} (${selectedPlan.price}/mo · KES{' '}
                  {(selectedPlan.price * PAYBILL_CONFIG.kesPerUsd).toLocaleString()})
                </h3>
                <p className="text-xs text-white/80">
                  Unlocks Verified Badge &amp; Advertising immediately upon verification
                </p>
              </div>
              <button type="button" onClick={() => setSelectedPlan(null)}>
                <X className="w-5 h-5 text-white/80 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handlePay} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-2">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(method);
                        setCheckoutError(null);
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                        paymentMethod === method
                          ? 'bg-[#0A4D2E] text-white border-[#0A4D2E]'
                          : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === 'M-Pesa' ? (
                <div className="space-y-4">
                  {/* M-Pesa Flow Switcher: 1-Tap STK Prompt vs Manual Paybill Code */}
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#F3F5F4] border border-neutral-200">
                    <button
                      type="button"
                      onClick={() => {
                        setMpesaFlow('stk_prompt');
                        setCheckoutError(null);
                      }}
                      className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors ${
                        mpesaFlow === 'stk_prompt'
                          ? 'bg-[#0A4D2E] text-white'
                          : 'text-neutral-700 hover:text-neutral-900'
                      }`}
                    >
                      1-Tap M-Pesa Prompt
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMpesaFlow('manual_code');
                        setCheckoutError(null);
                      }}
                      className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors ${
                        mpesaFlow === 'manual_code'
                          ? 'bg-[#0A4D2E] text-white'
                          : 'text-neutral-700 hover:text-neutral-900'
                      }`}
                    >
                      Manual Paybill Code
                    </button>
                  </div>

                  {mpesaFlow === 'stk_prompt' ? (
                    <div className="space-y-3.5">
                      {/* Summary Strip */}
                      <div className="rounded-xl border border-[#0A4D2E]/25 bg-[#F3F5F4] p-3.5 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <p className="font-bold text-[#0A4D2E]">
                            Paybill {PAYBILL_CONFIG.paybillNumber} · Acc {PAYBILL_CONFIG.accountNumber}
                          </p>
                          <p className="text-[11px] text-neutral-600 mt-0.5">
                            Safaricom SIM Card STK Push &amp; automatic fund transfer
                          </p>
                        </div>
                        <span className="font-mono font-extrabold text-sm text-neutral-900 tabular-nums shrink-0">
                          KES {(selectedPlan.price * PAYBILL_CONFIG.kesPerUsd).toLocaleString()}
                        </span>
                      </div>

                      {/* Live Daraja SIM Gateway Connection Banner */}
                      {gatewayStatus && (
                        <div
                          className={`rounded-lg px-3 py-2 text-[11px] border flex items-start gap-2 ${
                            gatewayStatus.liveSimStkConnected
                              ? 'bg-[#0A4D2E]/10 border-[#0A4D2E]/25 text-[#0A4D2E]'
                              : 'bg-amber-50 border-amber-200 text-amber-900'
                          }`}
                        >
                          {gatewayStatus.liveSimStkConnected ? (
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#0A4D2E]" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-700" />
                          )}
                          <span>
                            {gatewayStatus.liveSimStkConnected ? (
                              <>
                                <strong>Live Safaricom SIM STK Connected ({gatewayStatus.env})</strong> —
                                Entering your M-Pesa PIN on your SIM handset automatically transfers KES{' '}
                                {(selectedPlan.price * PAYBILL_CONFIG.kesPerUsd).toLocaleString()} to Paybill{' '}
                                <strong>{gatewayStatus.partyB}</strong> · Acc{' '}
                                <strong>{gatewayStatus.accountNumber}</strong>.
                              </>
                            ) : (
                              <>
                                <strong>SIM STK Gateway awaits Daraja Secrets</strong> (
                                {gatewayStatus.missingKeys.join(', ')}). Pay now via{' '}
                                <strong>Manual Paybill Code</strong> ({gatewayStatus.partyB} /{' '}
                                {gatewayStatus.accountNumber}) or add Safaricom Daraja credentials in AI Studio
                                Secrets for live SIM prompts.
                              </>
                            )}
                          </span>
                        </div>
                      )}

                      {!stkSession ? (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-1">
                              Safaricom M-Pesa SIM Phone Number
                            </label>
                            <input
                              type="tel"
                              required
                              value={payerPhone}
                              onChange={(e) => setPayerPhone(e.target.value)}
                              placeholder="0712 345 678 or +254712345678"
                              className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0A4D2E]"
                            />
                            <p className="text-[11px] text-neutral-500 mt-1">
                              Pushes a Safaricom SIM prompt for{' '}
                              <strong className="text-neutral-800">
                                KES {(selectedPlan.price * PAYBILL_CONFIG.kesPerUsd).toLocaleString()}
                              </strong>{' '}
                              settled directly to Paybill <strong>{PAYBILL_CONFIG.paybillNumber}</strong> (Acc{' '}
                              <strong>{PAYBILL_CONFIG.accountNumber}</strong>).
                            </p>
                          </div>

                          {requiresDarajaSecrets && (
                            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 space-y-2.5 text-xs text-amber-950">
                              <p className="font-bold text-amber-900">
                                Real SIM STK requires Safaricom Daraja Credentials in Server Secrets
                              </p>
                              <p className="text-[11px] leading-relaxed text-amber-900/90">
                                Missing environment keys:{' '}
                                <span className="font-mono font-semibold">
                                  {requiresDarajaSecrets.join(', ')}
                                </span>
                                . To trigger a real SIM card popup and move live funds, add those Daraja keys
                                in AI Studio Secrets. Or pay right away from your M-Pesa menu using Paybill{' '}
                                <strong>{PAYBILL_CONFIG.paybillNumber}</strong>.
                              </p>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMpesaFlow('manual_code');
                                    setRequiresDarajaSecrets(null);
                                    setCheckoutError(null);
                                  }}
                                  className="flex-1 py-2 px-3 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-[11px] font-bold"
                                >
                                  Use Manual Paybill ({PAYBILL_CONFIG.paybillNumber})
                                </button>
                                <button
                                  type="button"
                                  disabled={requestingStk || paying}
                                  onClick={() => void handleSendStkPrompt(true)}
                                  className="py-2 px-3 rounded-lg border border-amber-400 bg-white hover:bg-amber-100 text-amber-950 text-[11px] font-semibold"
                                >
                                  UI Sandbox Test (No Real Funds)
                                </button>
                              </div>
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={requestingStk || paying}
                            className="w-full py-3 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                          >
                            {requestingStk ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Contacting Safaricom SIM Gateway…
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 text-[#D4AF37]" />
                                Send SIM STK Prompt (KES{' '}
                                {(selectedPlan.price * PAYBILL_CONFIG.kesPerUsd).toLocaleString()})
                              </>
                            )}
                          </button>
                        </>
                      ) : stkSession.mode === 'daraja_stk' ? (
                        <div className="rounded-xl border border-[#0A4D2E]/30 bg-white p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[#0A4D2E]/10 text-[#0A4D2E] flex items-center justify-center shrink-0">
                              {stkSession.status === 'confirmed' ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-neutral-900">
                                {stkSession.status === 'confirmed'
                                  ? `Confirmed (${stkSession.mpesaReceiptNumber})`
                                  : `SIM STK Prompt Sent to ${stkSession.normalizedPhone}`}
                              </p>
                              <p className="text-[11px] text-neutral-600 mt-0.5 leading-relaxed">
                                {stkSession.message}
                              </p>
                              {stkSession.status === 'confirmed' && stkSession.settlementStatus && (
                                <p className="text-[11px] font-semibold text-[#0A4D2E] mt-1">
                                  {stkSession.settlementStatus === 'b2b_forwarded'
                                    ? `Auto-transferred via Daraja B2B (${stkSession.b2bConversationId}) -> Paybill ${PAYBILL_CONFIG.paybillNumber} · Acc ${PAYBILL_CONFIG.accountNumber}`
                                    : `Settled directly to Paybill ${PAYBILL_CONFIG.paybillNumber} · Acc ${PAYBILL_CONFIG.accountNumber}`}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              disabled={paying}
                              onClick={() => void checkStkStatusOnce()}
                              className="flex-1 py-2 px-3 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              {paying ? 'Activating Plan…' : 'Check SIM Confirmation'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setStkSession(null);
                                setCheckoutError(null);
                              }}
                              className="py-2 px-3 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                            >
                              Change Phone
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Explicit UI Sandbox Test Prompt ONLY (No Real Funds Moved) */
                        <div className="rounded-xl border-2 border-amber-400 bg-[#111915] text-white p-4 space-y-3.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37] inline-flex items-center gap-1.5">
                              <Smartphone className="w-3.5 h-3.5" />
                              UI Sandbox Prompt (No Real Funds)
                            </span>
                            <span className="font-mono text-[11px] text-white/70">
                              {stkSession.normalizedPhone}
                            </span>
                          </div>

                          <div className="bg-white/10 rounded-lg p-3 text-xs space-y-1">
                            <p className="font-semibold text-white">
                              Sandbox Test: SWAYPALM ({selectedPlan.name})
                            </p>
                            <p className="text-white/80 font-mono text-[11px]">
                              Target Paybill: {PAYBILL_CONFIG.paybillNumber} · Acc: {PAYBILL_CONFIG.accountNumber}
                            </p>
                            <p className="font-mono font-bold text-sm text-[#D4AF37]">
                              KES {stkSession.amountKes.toLocaleString()} (Test Only)
                            </p>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-white/85 mb-1 inline-flex items-center gap-1">
                              <Lock className="w-3 h-3 text-[#D4AF37]" />
                              Enter 4-Digit Test PIN (Sandbox Preview)
                            </label>
                            <input
                              type="password"
                              inputMode="numeric"
                              maxLength={4}
                              value={stkPin}
                              onChange={(e) =>
                                setStkPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                              }
                              placeholder="••••"
                              className="w-full px-3 py-2 rounded-lg bg-white text-neutral-900 font-mono text-center text-base tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                            />
                            <p className="text-[10px] text-amber-300 mt-1">
                              No money is deducted in UI Sandbox mode. Add Safaricom Daraja keys in Secrets for real SIM payments.
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={confirmingStkPin || paying}
                              onClick={() => void handleRespondToInteractivePrompt('cancel')}
                              className="py-2.5 px-3 rounded-lg border border-white/25 text-white/90 hover:bg-white/10 text-xs font-semibold"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={confirmingStkPin || paying}
                              className="py-2.5 px-3 rounded-lg bg-[#D4AF37] hover:bg-[#c5a12f] text-[#111915] text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
                            >
                              {confirmingStkPin || paying ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Processing…
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  Run Test Confirm
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Manual Paybill 247247 / Acc 0460180118328 Confirmation Code Flow */
                    <div className="space-y-4">
                      <div className="rounded-xl border border-[#0A4D2E]/25 bg-[#F3F5F4] p-4 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#0A4D2E] inline-flex items-center gap-1.5">
                            <Smartphone className="w-4 h-4" />
                            Lipa na M-Pesa Paybill Instructions
                          </span>
                          <span className="font-mono text-xs font-bold text-neutral-900 tabular-nums">
                            KES {(selectedPlan.price * PAYBILL_CONFIG.kesPerUsd).toLocaleString()}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                          <div className="bg-white rounded-lg border border-neutral-200 p-2.5 flex items-center justify-between gap-2">
                            <div>
                              <p className="text-[10px] text-neutral-500">Paybill Business No.</p>
                              <p className="font-mono font-extrabold text-sm text-neutral-900">
                                {PAYBILL_CONFIG.paybillNumber}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                void handleCopyPaybill('paybill', PAYBILL_CONFIG.paybillNumber)
                              }
                              aria-label="Copy Paybill Number"
                              className="p-1.5 rounded bg-[#F3F5F4] hover:bg-neutral-200 text-neutral-700"
                            >
                              {copiedKey === 'paybill' ? (
                                <Check className="w-3.5 h-3.5 text-[#0A4D2E]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          <div className="bg-white rounded-lg border border-neutral-200 p-2.5 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[10px] text-neutral-500">Account No.</p>
                              <p className="font-mono font-extrabold text-sm text-neutral-900 truncate">
                                {PAYBILL_CONFIG.accountNumber}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                void handleCopyPaybill('account', PAYBILL_CONFIG.accountNumber)
                              }
                              aria-label="Copy Account Number"
                              className="p-1.5 rounded bg-[#F3F5F4] hover:bg-neutral-200 text-neutral-700 shrink-0"
                            >
                              {copiedKey === 'account' ? (
                                <Check className="w-3.5 h-3.5 text-[#0A4D2E]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        <ol className="text-[11px] text-neutral-700 space-y-1 list-decimal list-inside pt-1">
                          <li>
                            Open M-Pesa → <strong>Lipa na M-Pesa</strong> → <strong>Paybill</strong>
                          </li>
                          <li>
                            Enter Business No. <strong>{PAYBILL_CONFIG.paybillNumber}</strong> &amp; Account{' '}
                            <strong>{PAYBILL_CONFIG.accountNumber}</strong>
                          </li>
                          <li>
                            Send{' '}
                            <strong>
                              KES {(selectedPlan.price * PAYBILL_CONFIG.kesPerUsd).toLocaleString()}
                            </strong>{' '}
                            and enter your M-Pesa confirmation code below
                          </li>
                        </ol>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-neutral-700 mb-1">
                          M-Pesa Phone Number
                        </label>
                        <input
                          type="tel"
                          required
                          value={payerPhone}
                          onChange={(e) => setPayerPhone(e.target.value)}
                          placeholder="0712 345 678 or +254712345678"
                          className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0A4D2E]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-neutral-700 mb-1">
                          M-Pesa Confirmation Code
                        </label>
                        <input
                          type="text"
                          required
                          value={mpesaCode}
                          onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                          placeholder="e.g. UA82XYZ910"
                          maxLength={14}
                          className="w-full px-3 py-2 text-sm font-mono uppercase tracking-wider border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0A4D2E]"
                        />
                        <p className="text-[11px] text-neutral-500 mt-1">
                          Enter the 10-character transaction ID from your Safaricom M-Pesa SMS.
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={paying}
                        className="w-full py-3 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-sm font-bold transition-colors disabled:opacity-60"
                      >
                        {paying
                          ? 'Verifying Payment...'
                          : `Verify Paybill ${PAYBILL_CONFIG.paybillNumber} & Activate ${selectedPlan.name}`}
                      </button>
                    </div>
                  )}
                </div>
              ) : paymentMethod === 'Card' || paymentMethod === 'Stripe' ? (
                <CardPaymentForm
                  purpose="subscription"
                  plan={selectedPlan.id as 'basic' | 'pro' | 'premium'}
                  amountUsd={selectedPlan.price}
                  description={`SwayPalm26 ${selectedPlan.name} Subscription`}
                  methodLabel={paymentMethod}
                  defaultName={userProfile?.displayName || myBusiness?.name || ''}
                  defaultEmail={firebaseUser?.email || ''}
                  submittingExternal={paying}
                  onAuthorized={async (result) => {
                    setCheckoutError(null);
                    setPaying(true);
                    try {
                      const ok = await subscribeToPlan(
                        selectedPlan.id as 'basic' | 'pro' | 'premium',
                        result.method,
                        result.reference,
                        {
                          cardSandboxToken: result.cardSandboxToken,
                        }
                      );
                      if (ok) {
                        setSelectedPlan(null);
                        setReference('');
                        setCheckoutError(null);
                      }
                    } finally {
                      setPaying(false);
                    }
                  }}
                />
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      {paymentMethod === 'Airtel Money'
                        ? 'Airtel Money Phone Number'
                        : `${paymentMethod} Billing Reference / Transaction ID`}
                    </label>
                    <input
                      type="text"
                      required
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder={
                        paymentMethod === 'Airtel Money'
                          ? '+254 733 123 456'
                          : 'Transaction ID or confirmation reference'
                      }
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0A4D2E]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={paying}
                    className="w-full py-3 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-sm font-bold transition-colors disabled:opacity-60"
                  >
                    {paying
                      ? 'Verifying Payment...'
                      : `Confirm & Pay $${selectedPlan.price} via ${paymentMethod}`}
                  </button>
                </div>
              )}

              {checkoutError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{checkoutError}</span>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminPanelView: React.FC = () => {
  const {
    isAdmin,
    adminUsers,
    adminBusinesses,
    adminProducts,
    adminAdverts,
    adminPayments,
    adminOrders,
    migrationStatus,
    adminMigrateDatabaseToUuids,
    getDisplayBusinessName,
    getDisplayOwnerName,
    adminSetBusinessStatus,
    adminToggleVerifyBusiness,
    adminSetProductStatus,
    adminSetAdvertStatus,
    adminMarkOrderFeeSettled,
    adminSeedSampleCatalog,
    firebaseUser,
    setShowAuthModal,
    setAuthMode,
  } = useSwayPalm();

  const [tab, setTab] = useState<'users' | 'products' | 'adverts' | 'payments' | 'sales'>('users');
  const [darajaStatus, setDarajaStatus] = useState<{
    liveSimStkConnected: boolean;
    env: 'production' | 'sandbox';
    shortcode: string;
    partyB: string;
    accountNumber: string;
    callbackUrl: string;
    autoB2BEnabled: boolean;
    missingKeys: string[];
  } | null>(null);
  const [testingDaraja, setTestingDaraja] = useState(false);
  const [darajaTestMessage, setDarajaTestMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [copiedCallback, setCopiedCallback] = useState(false);
  const [copiedSitemap, setCopiedSitemap] = useState(false);
  const [copiedSiteUrl, setCopiedSiteUrl] = useState(false);
  const [seoChecks, setSeoChecks] = useState<{
    robotsOk: boolean | null;
    sitemapOk: boolean | null;
    sitemapUrlsCount?: number;
    verificationConfigured?: boolean;
    siteUrl?: string;
    websiteUrl?: string;
    publishedAppUrl?: string;
    indexableUrls?: string[];
    schemaTypes?: string[];
  }>({ robotsOk: null, sitemapOk: null });
  const [cardGatewayStatus, setCardGatewayStatus] = useState<CardGatewayStatus | null>(null);
  const [testingStripe, setTestingStripe] = useState(false);
  const [stripeTestMessage, setStripeTestMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const loadDarajaStatus = async () => {
    const res = await safeFetchJson<{
      liveSimStkConnected: boolean;
      env: 'production' | 'sandbox';
      shortcode: string;
      partyB: string;
      accountNumber: string;
      callbackUrl: string;
      autoB2BEnabled: boolean;
      missingKeys: string[];
    }>('/api/payments/mpesa-paybill/gateway-status', { reportErrors: false });
    if (res.ok && res.data) {
      setDarajaStatus(res.data);
    }
  };

  const loadCardGatewayStatus = async () => {
    const res = await safeFetchJson<CardGatewayStatus>('/api/payments/card/gateway-status', {
      reportErrors: false,
    });
    if (res.ok && res.data) {
      setCardGatewayStatus(res.data);
    }
  };

  const checkSeoEndpoints = async () => {
    const [robotsRes, sitemapRes, seoStatusRes] = await Promise.all([
      safeFetchJson('/robots.txt', { reportErrors: false }),
      safeFetchJson('/sitemap.xml', { reportErrors: false }),
      safeFetchJson<{
        sitemapUrlsCount?: number;
        verificationConfigured?: boolean;
        siteUrl?: string;
        schemaTypes?: string[];
      }>('/api/seo/status', { reportErrors: false }),
    ]);
    setSeoChecks({
      robotsOk: robotsRes.ok,
      sitemapOk: sitemapRes.ok,
      sitemapUrlsCount: seoStatusRes.data?.sitemapUrlsCount,
      verificationConfigured: seoStatusRes.data?.verificationConfigured,
      siteUrl: seoStatusRes.data?.siteUrl,
      schemaTypes: seoStatusRes.data?.schemaTypes,
    });
  };

  useEffect(() => {
    void loadDarajaStatus();
    void loadCardGatewayStatus();
    void checkSeoEndpoints();
  }, []);

  const handleTestDarajaConnection = async () => {
    setTestingDaraja(true);
    setDarajaTestMessage(null);
    try {
      const res = await safeFetchJson<{
        connected?: boolean;
        message?: string;
        error?: string;
      }>('/api/payments/mpesa-paybill/daraja-test-connection', {
        method: 'POST',
      });
      setDarajaTestMessage({
        ok: Boolean(res.ok && res.data?.connected),
        text:
          res.data?.message ||
          res.error ||
          res.data?.error ||
          'Daraja OAuth check completed.',
      });
      await loadDarajaStatus();
    } finally {
      setTestingDaraja(false);
    }
  };

  const handleTestStripeConnection = async () => {
    setTestingStripe(true);
    setStripeTestMessage(null);
    try {
      const res = await safeFetchJson<{
        connected?: boolean;
        message?: string;
        error?: string;
      }>('/api/payments/card/test-connection', {
        method: 'POST',
      });
      setStripeTestMessage({
        ok: Boolean(res.ok && res.data?.connected),
        text:
          res.data?.message ||
          res.error ||
          res.data?.error ||
          'Stripe gateway check completed.',
      });
      await loadCardGatewayStatus();
    } finally {
      setTestingStripe(false);
    }
  };

  const handleCopyCallbackUrl = async () => {
    if (!darajaStatus?.callbackUrl) return;
    try {
      await navigator.clipboard?.writeText(darajaStatus.callbackUrl);
      setCopiedCallback(true);
      setTimeout(() => setCopiedCallback(false), 1800);
    } catch {
      // ignore clipboard fallback
    }
  };

  const totalRevenue = adminPayments.reduce((s, p) => s + p.amount, 0);
  const totalGrossSales = adminOrders.reduce((s, o) => s + o.totalAmount, 0);
  const totalSalesCommission = adminOrders.reduce(
    (s, o) => s + getOrderCommissionBreakdown(o).platformFeeAmount,
    0
  );

  return (
    <div className="space-y-5">
      <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#0A4D2E]" />
            <h1 className="font-display font-bold text-xl sm:text-2xl text-neutral-900">
              SwayPalm Admin Console
            </h1>
          </div>
          <p className="text-sm text-neutral-600 mt-1">
            Platform oversight for registered businesses, products, advert approvals, subscription payments, and automatic 10% sales commissions.
          </p>
        </div>

        {isAdmin ? (
          <button
            type="button"
            onClick={adminSeedSampleCatalog}
            className="px-4 py-2 rounded-lg bg-[#0A4D2E] text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
          >
            <Database className="w-4 h-4" />
            Sync 12 Sample Businesses to Firestore
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setShowAuthModal(true);
            }}
            className="px-4 py-2 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-800 shrink-0"
          >
            {firebaseUser ? 'Admin Privileges Required for Edits' : 'Sign In as Admin'}
          </button>
        )}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Businesses', value: String(adminBusinesses.length) },
          { label: '10% Sales Commission', value: `$${totalSalesCommission.toFixed(2)}` },
          { label: 'Subscription Payments', value: `$${totalRevenue.toFixed(2)}` },
          { label: 'Total Products', value: String(adminProducts.length) },
          { label: 'Ad Campaigns', value: String(adminAdverts.length) },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-neutral-200 rounded-xl p-4">
            <p className="text-xs text-neutral-500">{kpi.label}</p>
            <p className="font-mono font-bold text-xl text-neutral-900 tabular-nums mt-1">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Database UUID Migration & Data Integrity */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-[#0A4D2E]" />
              <h2 className="font-display font-bold text-base text-neutral-900">
                Database UUID Migration &amp; Data Integrity
              </h2>
            </div>
            <p className="text-xs text-neutral-600 mt-1">
              Enforces immutable auto-generated UUID primary keys (<code className="font-mono">users.id</code>,{' '}
              <code className="font-mono">businesses.business_id</code>, <code className="font-mono">products.product_id</code>,{' '}
              <code className="font-mono">posts.post_id</code>, <code className="font-mono">orders.order_id</code>,{' '}
              <code className="font-mono">chats.chat_id</code>) and migrates any legacy records without data loss.
            </p>
          </div>
          <button
            type="button"
            disabled={!isAdmin || migrationStatus.running}
            onClick={() => void adminMigrateDatabaseToUuids()}
            className="px-4 py-2 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-xs font-semibold inline-flex items-center gap-2 shrink-0 disabled:opacity-60"
          >
            {migrationStatus.running ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Migrating Database…
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 text-[#D4AF37]" />
                Run Full Database UUID Migration
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-xs">
          {[
            { label: 'Users (id)', value: adminUsers.length },
            { label: 'Businesses (business_id)', value: adminBusinesses.length },
            { label: 'Products (product_id)', value: adminProducts.length },
            { label: 'Orders (order_id)', value: adminOrders.length },
            { label: 'Adverts (advert_id)', value: adminAdverts.length },
            { label: 'Payments (payment_id)', value: adminPayments.length },
          ].map((stat) => (
            <div key={stat.label} className="p-2.5 rounded-lg bg-[#F3F5F4] border border-neutral-200">
              <p className="text-[10px] text-neutral-500 truncate">{stat.label}</p>
              <p className="font-mono font-bold text-sm text-neutral-900 tabular-nums mt-0.5">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {migrationStatus.error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{migrationStatus.error}</span>
          </div>
        )}

        {migrationStatus.lastReport && (
          <div className="p-3.5 rounded-lg bg-[#0A4D2E]/8 border border-[#0A4D2E]/25 text-xs text-neutral-800 space-y-1">
            <p className="font-bold text-[#0A4D2E] inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Migration Completed ({migrationStatus.lastReport.completedAt})
            </p>
            <p className="text-[11px] font-mono text-neutral-700">
              Users: {migrationStatus.lastReport.migratedUsers} · AuthLinks: {migrationStatus.lastReport.migratedAuthLinks} · Businesses: {migrationStatus.lastReport.migratedBusinesses} · Products: {migrationStatus.lastReport.migratedProducts} · Posts: {migrationStatus.lastReport.migratedPosts} · Orders: {migrationStatus.lastReport.migratedOrders} · Chats: {migrationStatus.lastReport.migratedChats} · Legacy Removed: {migrationStatus.lastReport.deletedLegacyDocs}
            </p>
          </div>
        )}
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="px-4 pt-3 border-b border-neutral-200 flex items-center gap-2 overflow-x-auto">
          {(
            [
              { id: 'users', label: `Businesses & Users (${adminBusinesses.length})` },
              { id: 'products', label: `Products (${adminProducts.length})` },
              { id: 'adverts', label: `Adverts (${adminAdverts.length})` },
              { id: 'payments', label: `Subscriptions (${adminPayments.length})` },
              { id: 'sales', label: `Sales & 10% Fees (${adminOrders.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'border-[#0A4D2E] text-[#0A4D2E]'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4 overflow-x-auto">
          {tab === 'users' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500">
                  <th className="py-2 pr-4 font-semibold">Business &amp; Owner</th>
                  <th className="py-2 px-4 font-semibold">Location</th>
                  <th className="py-2 px-4 font-semibold">Plan</th>
                  <th className="py-2 px-4 font-semibold">Status</th>
                  <th className="py-2 pl-4 font-semibold text-right">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {adminBusinesses.map((biz) => {
                  const ownerLabel = getDisplayOwnerName(biz.user_id, biz.business_id, 'Owner');
                  return (
                  <tr key={biz.business_id}>
                    <td className="py-2.5 pr-4">
                      <div className="font-semibold text-neutral-900 inline-flex items-center gap-1">
                        {biz.name}
                        {biz.verified && <VerifiedBadge plan={biz.plan} className="w-3.5 h-3.5" />}
                      </div>
                      <p className="text-[10px] text-neutral-500 font-mono">
                        {ownerLabel} · biz:{biz.business_id.slice(0, 8)} · usr:{biz.user_id.slice(0, 8)}
                      </p>
                    </td>
                    <td className="py-2.5 px-4 text-neutral-600">
                      {biz.city}, {biz.country}
                    </td>
                    <td className="py-2.5 px-4 uppercase font-mono">{biz.plan}</td>
                    <td className="py-2.5 px-4 uppercase">{biz.status}</td>
                    <td className="py-2.5 pl-4 text-right space-x-2 whitespace-nowrap">
                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => adminToggleVerifyBusiness(biz)}
                            className="px-2 py-1 rounded border border-neutral-300 text-[11px] font-semibold"
                          >
                            {biz.verified ? 'Unverify' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              adminSetBusinessStatus(
                                biz,
                                biz.status === 'active' ? 'blocked' : 'active'
                              )
                            }
                            className={`px-2 py-1 rounded text-[11px] font-semibold ${
                              biz.status === 'active'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-[#0A4D2E] text-white'
                            }`}
                          >
                            {biz.status === 'active' ? 'Block' : 'Unblock'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === 'products' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500">
                  <th className="py-2 pr-4 font-semibold">Title</th>
                  <th className="py-2 px-4 font-semibold">Seller</th>
                  <th className="py-2 px-4 font-semibold text-right">Price</th>
                  <th className="py-2 px-4 font-semibold">Status</th>
                  <th className="py-2 pl-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {adminProducts.map((p) => (
                  <tr key={p.product_id}>
                    <td className="py-2.5 pr-4 font-semibold text-neutral-900">{p.title}</td>
                    <td className="py-2.5 px-4 text-neutral-600">
                      {getDisplayBusinessName(p.business_id, p.user_id)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">${p.price}</td>
                    <td className="py-2.5 px-4 uppercase">{p.status}</td>
                    <td className="py-2.5 pl-4 text-right">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() =>
                            adminSetProductStatus(p, p.status === 'active' ? 'hidden' : 'active')
                          }
                          className="px-2.5 py-1 rounded border border-neutral-300 text-[11px] font-semibold"
                        >
                          {p.status === 'active' ? 'Hide' : 'Restore'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'adverts' && (
            <div className="space-y-2.5">
              {adminAdverts.length === 0 ? (
                <p className="text-xs text-neutral-500 py-4 text-center">
                  No paid adverts submitted yet.
                </p>
              ) : (
                adminAdverts.map((ad) => (
                  <div
                    key={ad.advert_id}
                    className="p-3 border border-neutral-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-neutral-900 truncate">
                        {ad.title} · <span className="font-mono text-[#0A4D2E]">${ad.priceUsd || AD_PLAY_PRICE_USD} {(ad.paymentStatus || 'paid').toUpperCase()}</span>
                      </p>
                      <p className="text-[11px] text-neutral-500 truncate">
                        {ad.advertiser_name || getDisplayBusinessName(ad.business_id, ad.user_id, 'Guest Advertiser')} ({ad.advertiserType === 'guest' ? 'Non-User Guest' : 'Member'}) · {ad.targetRegion} · {ad.status.toUpperCase()}
                        {ad.paymentMethod ? ` · ${ad.paymentMethod}` : ''}
                        {ad.paymentReference ? ` · Ref: ${ad.paymentReference}` : ''}
                        {` · ${ad.impressions} plays · ${ad.clicks} clicks`}
                      </p>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() =>
                          adminSetAdvertStatus(ad, ad.status === 'approved' ? 'paused' : 'approved')
                        }
                        className="px-3 py-1.5 rounded bg-[#0A4D2E] text-white text-xs font-semibold shrink-0"
                      >
                        {ad.status === 'approved' ? 'Pause' : 'Approve'}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'payments' && (
            <div className="space-y-2.5">
              {adminPayments.length === 0 ? (
                <p className="text-xs text-neutral-500 py-4 text-center">
                  Subscription payments via Paybill {PAYBILL_CONFIG.paybillNumber} (Acc {PAYBILL_CONFIG.accountNumber}) and global methods will appear here in real time.
                </p>
              ) : (
                adminPayments.map((pay) => (
                  <div
                    key={pay.payment_id}
                    className="p-3 border border-neutral-200 rounded-lg flex items-center justify-between text-xs gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-neutral-900">
                        {getDisplayBusinessName(
                          pay.business_id,
                          pay.user_id,
                          pay.auth_uid === 'guest' ? 'Guest Advertiser' : 'Member'
                        )}
                      </p>
                      <p className="text-neutral-500 truncate">
                        {pay.plan.toUpperCase()} · {pay.method} · Ref: {pay.reference}
                        {pay.paybillNumber ? ` · Paybill ${pay.paybillNumber}` : ''}
                        {pay.accountNumber ? ` · Acc ${pay.accountNumber}` : ''}
                        {pay.payerPhone ? ` · ${pay.payerPhone}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-[#0A4D2E] tabular-nums block">
                        ${pay.amount.toFixed(2)}
                      </span>
                      {typeof pay.amountKes === 'number' && pay.amountKes > 0 && (
                        <span className="font-mono text-[11px] text-neutral-500 tabular-nums">
                          KES {pay.amountKes.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'sales' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-[#F3F5F4] border border-neutral-200">
                  <p className="text-neutral-500">Gross Website Sales</p>
                  <p className="font-mono font-bold text-base text-neutral-900 tabular-nums mt-0.5">
                    ${totalGrossSales.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[#0A4D2E]/8 border border-[#0A4D2E]/25">
                  <p className="text-[#0A4D2E] font-medium">Auto-Deducted 10% Commission</p>
                  <p className="font-mono font-bold text-base text-[#0A4D2E] tabular-nums mt-0.5">
                    ${totalSalesCommission.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[#F3F5F4] border border-neutral-200">
                  <p className="text-neutral-500">Seller Net Payouts (90%)</p>
                  <p className="font-mono font-bold text-base text-neutral-900 tabular-nums mt-0.5">
                    ${Math.max(0, totalGrossSales - totalSalesCommission).toFixed(2)}
                  </p>
                </div>
              </div>

              {adminOrders.length === 0 ? (
                <p className="text-xs text-neutral-500 py-4 text-center">
                  Every marketplace sale made on the website automatically deducts a 10% platform fee and logs it here.
                </p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-500">
                      <th className="py-2 pr-4 font-semibold">Order / Seller</th>
                      <th className="py-2 px-4 font-semibold">Buyer &amp; Method</th>
                      <th className="py-2 px-4 font-semibold text-right">Gross Sale</th>
                      <th className="py-2 px-4 font-semibold text-right">10% Fee</th>
                      <th className="py-2 px-4 font-semibold text-right">Seller Net</th>
                      <th className="py-2 pl-4 font-semibold text-right">Fee Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {adminOrders.map((ord) => {
                      const split = getOrderCommissionBreakdown(ord);
                      const settled = ord.feeStatus === 'settled';
                      return (
                        <tr key={ord.order_id}>
                          <td className="py-2.5 pr-4">
                            <p className="font-semibold text-neutral-900">
                              {getDisplayBusinessName(ord.business_id, ord.seller_id)}
                            </p>
                            <p className="text-[11px] font-mono text-neutral-500">{ord.order_id}</p>
                          </td>
                          <td className="py-2.5 px-4 text-neutral-600">
                            {getDisplayOwnerName(ord.buyer_id, null, 'Customer')} · {ord.paymentMethod}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                            ${split.grossAmount.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-[#0A4D2E] tabular-nums">
                            ${split.platformFeeAmount.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                            ${split.sellerNetAmount.toFixed(2)}
                          </td>
                          <td className="py-2.5 pl-4 text-right whitespace-nowrap">
                            {settled ? (
                              <span className="px-2 py-1 rounded bg-[#0A4D2E]/10 text-[#0A4D2E] text-[11px] font-semibold">
                                Settled
                              </span>
                            ) : isAdmin ? (
                              <button
                                type="button"
                                onClick={() => void adminMarkOrderFeeSettled(ord)}
                                className="px-2.5 py-1 rounded bg-[#0A4D2E] text-white text-[11px] font-semibold hover:bg-[#083D24]"
                              >
                                Mark Settled
                              </button>
                            ) : (
                              <span className="px-2 py-1 rounded bg-amber-50 text-amber-800 text-[11px] font-semibold">
                                Deducted
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Read-Only Safaricom SIM STK & Paybill 247247 Gateway Status */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-[#0A4D2E]" />
              <h2 className="font-display font-bold text-base text-neutral-900">
                Safaricom SIM Card STK &amp; Paybill {PAYBILL_CONFIG.paybillNumber} Settlement
              </h2>
            </div>
            <p className="text-xs text-neutral-600 mt-1">
              Live Daraja STK Push (`CustomerPayBillOnline`) + webhook callback &amp; optional automatic B2B transfer to Paybill {PAYBILL_CONFIG.paybillNumber} · Acc {PAYBILL_CONFIG.accountNumber}.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                darajaStatus?.liveSimStkConnected
                  ? 'bg-[#0A4D2E]/10 text-[#0A4D2E]'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              {darajaStatus?.liveSimStkConnected ? 'Live SIM STK Active' : 'Awaiting Daraja Secrets'}
            </span>
            <button
              type="button"
              onClick={() => void loadDarajaStatus()}
              className="p-1.5 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
              aria-label="Refresh Daraja gateway status"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {darajaStatus && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-lg bg-[#F3F5F4] border border-neutral-200 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-neutral-500">Environment</span>
                <span className="font-mono font-bold uppercase text-neutral-900">
                  {darajaStatus.env}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Originating Shortcode</span>
                <span className="font-mono font-bold text-neutral-900">
                  {darajaStatus.shortcode}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Settlement Paybill / Acc</span>
                <span className="font-mono font-bold text-[#0A4D2E]">
                  {darajaStatus.partyB} · {darajaStatus.accountNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Auto-B2B Forwarding</span>
                <span className="font-semibold text-neutral-900">
                  {darajaStatus.autoB2BEnabled ? 'Enabled (BusinessPayBill)' : 'Direct Paybill Settlement'}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#F3F5F4] border border-neutral-200 space-y-2">
              <p className="text-[11px] font-semibold text-neutral-700">
                Safaricom Callback Webhook URL
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-2.5 py-1.5 rounded bg-white border border-neutral-200 font-mono text-[11px] text-neutral-800 truncate">
                  {darajaStatus.callbackUrl}
                </code>
                <button
                  type="button"
                  onClick={() => void handleCopyCallbackUrl()}
                  className="px-2.5 py-1.5 rounded bg-white border border-neutral-300 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50 inline-flex items-center gap-1 shrink-0"
                >
                  {copiedCallback ? <Check className="w-3.5 h-3.5 text-[#0A4D2E]" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCallback ? 'Copied' : 'Copy'}
                </button>
              </div>
              {darajaStatus.missingKeys.length > 0 ? (
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Add in AI Studio Secrets:{' '}
                  <span className="font-mono font-semibold">{darajaStatus.missingKeys.join(', ')}</span>
                </p>
              ) : (
                <p className="text-[11px] text-[#0A4D2E] font-medium">
                  All required Safaricom Daraja environment secrets are configured.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <button
            type="button"
            disabled={testingDaraja}
            onClick={() => void handleTestDarajaConnection()}
            className="px-4 py-2 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {testingDaraja ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Testing Daraja OAuth…
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 text-[#D4AF37]" />
                Test Daraja OAuth Connection
              </>
            )}
          </button>

          {darajaTestMessage && (
            <p
              className={`text-xs font-medium ${
                darajaTestMessage.ok ? 'text-[#0A4D2E]' : 'text-red-700'
              }`}
            >
              {darajaTestMessage.text}
            </p>
          )}
        </div>
      </div>

      {/* Read-Only Card & Stripe Payment Gateway Status */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#0A4D2E]" />
              <h2 className="font-display font-bold text-base text-neutral-900">
                Card &amp; Stripe Payment Gateway (Visa · Mastercard · Amex)
              </h2>
            </div>
            <p className="text-xs text-neutral-600 mt-1">
              Supports PCI-compliant Stripe Checkout for real card charges plus Luhn-validated sandbox card testing in Subscriptions &amp; Marketplace Cart.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                cardGatewayStatus?.liveCardConnected
                  ? 'bg-[#0A4D2E]/10 text-[#0A4D2E]'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              {cardGatewayStatus?.liveCardConnected
                ? cardGatewayStatus.mode === 'live'
                  ? 'Live Stripe Active'
                  : 'Stripe Test Mode Active'
                : 'Sandbox Mode (Awaiting STRIPE_SECRET_KEY)'}
            </span>
            <button
              type="button"
              onClick={() => void loadCardGatewayStatus()}
              className="p-1.5 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
              aria-label="Refresh Card gateway status"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {cardGatewayStatus && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-lg bg-[#F3F5F4] border border-neutral-200 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-neutral-500">Provider</span>
                <span className="font-mono font-bold text-neutral-900">
                  {cardGatewayStatus.provider}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Gateway Mode</span>
                <span className="font-mono font-bold uppercase text-neutral-900">
                  {cardGatewayStatus.mode}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Card Storage Policy</span>
                <span className="font-semibold text-[#0A4D2E]">
                  Zero PAN / CVC Stored
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#F3F5F4] border border-neutral-200 flex flex-col justify-center">
              {cardGatewayStatus.missingKeys.length > 0 ? (
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Add in AI Studio Secrets for real card charges:{' '}
                  <span className="font-mono font-semibold">
                    {cardGatewayStatus.missingKeys.join(', ')}
                  </span>
                  . Until then, Luhn-validated Sandbox Card testing remains active without charging real cards.
                </p>
              ) : (
                <p className="text-[11px] text-[#0A4D2E] font-medium">
                  STRIPE_SECRET_KEY is configured. Customers can pay via hosted Stripe Checkout using Visa, Mastercard, Amex, Apple Pay, and Google Pay.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <button
            type="button"
            disabled={testingStripe}
            onClick={() => void handleTestStripeConnection()}
            className="px-4 py-2 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {testingStripe ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Testing Stripe Gateway…
              </>
            ) : (
              <>
                <CreditCard className="w-3.5 h-3.5 text-[#D4AF37]" />
                Test Stripe Connection
              </>
            )}
          </button>

          {stripeTestMessage && (
            <p
              className={`text-xs font-medium ${
                stripeTestMessage.ok ? 'text-[#0A4D2E]' : 'text-red-700'
              }`}
            >
              {stripeTestMessage.text}
            </p>
          )}
        </div>
      </div>

      {/* Domain & Google Search Console Readiness */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#0A4D2E]" />
              <h2 className="font-display font-bold text-base text-neutral-900">
                Google Search Indexing &amp; Live Website URL
              </h2>
            </div>
            <p className="text-xs text-neutral-600 mt-1">
              OpenGraph, Twitter Cards, Schema.org (<code className="font-mono">{(seoChecks.schemaTypes || ['WebSite', 'WebApplication', 'Organization', 'FAQPage']).join(', ')}</code>), per-route canonical tags, <code className="font-mono">/robots.txt</code>, and <code className="font-mono">/sitemap.xml</code> are live for Google Search indexing.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                seoChecks.robotsOk && seoChecks.sitemapOk
                  ? 'bg-[#0A4D2E]/10 text-[#0A4D2E]'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              {seoChecks.robotsOk && seoChecks.sitemapOk ? 'Googlebot Ready' : 'Checking SEO…'}
            </span>
            <a
              href="https://search.google.com/search-console/welcome"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-[11px] font-semibold inline-flex items-center gap-1"
            >
              Open Search Console
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-lg bg-[#F3F5F4] border border-neutral-200 space-y-1.5">
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500">Workable SwayPalm26 URL</span>
              <a
                href={getWebsiteBaseUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono font-semibold text-[#0A4D2E] hover:underline truncate inline-flex items-center gap-1"
              >
                <span className="truncate">{getWebsiteBaseUrl()}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
            {seoChecks.publishedAppUrl && (
              <div className="flex justify-between gap-2">
                <span className="text-neutral-500">Published SwayPalm26 URL</span>
                <a
                  href={seoChecks.publishedAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono font-semibold text-[#0A4D2E] hover:underline truncate inline-flex items-center gap-1"
                >
                  <span className="truncate">{seoChecks.publishedAppUrl}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500">/robots.txt</span>
              <a
                href={`${getLiveAppUrl()}/robots.txt`}
                target="_blank"
                rel="noopener noreferrer"
                className={`font-semibold hover:underline ${seoChecks.robotsOk ? 'text-[#0A4D2E]' : 'text-neutral-500'}`}
              >
                {seoChecks.robotsOk === null ? 'Checking…' : seoChecks.robotsOk ? 'Live (Allow: /)' : 'Unavailable'}
              </a>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500">/sitemap.xml</span>
              <a
                href={`${getLiveAppUrl()}/sitemap.xml`}
                target="_blank"
                rel="noopener noreferrer"
                className={`font-semibold hover:underline ${seoChecks.sitemapOk ? 'text-[#0A4D2E]' : 'text-neutral-500'}`}
              >
                {seoChecks.sitemapOk === null
                  ? 'Checking…'
                  : seoChecks.sitemapOk
                    ? `Live (${seoChecks.sitemapUrlsCount || 13} indexed routes)`
                    : 'Unavailable'}
              </a>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500">Google Verification</span>
              <span className={`font-semibold ${seoChecks.verificationConfigured ? 'text-[#0A4D2E]' : 'text-amber-700'}`}>
                {seoChecks.verificationConfigured ? 'Configured (GOOGLE_SITE_VERIFICATION)' : 'Add GOOGLE_SITE_VERIFICATION in Secrets'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#F3F5F4] border border-neutral-200 space-y-2.5">
            <p className="text-[11px] font-semibold text-neutral-700">
              Submit SwayPalm26 URL &amp; Sitemap to Google Search Console
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-2.5 py-1.5 rounded bg-white border border-neutral-200 font-mono text-[11px] text-neutral-800 truncate">
                {seoChecks.publishedAppUrl || getWebsiteBaseUrl()}
              </code>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard?.writeText(seoChecks.publishedAppUrl || getWebsiteBaseUrl());
                    setCopiedSiteUrl(true);
                    setTimeout(() => setCopiedSiteUrl(false), 1800);
                  } catch {
                    // ignore clipboard fallback
                  }
                }}
                className="px-2.5 py-1.5 rounded bg-white border border-neutral-300 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50 inline-flex items-center gap-1 shrink-0"
              >
                {copiedSiteUrl ? <Check className="w-3.5 h-3.5 text-[#0A4D2E]" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSiteUrl ? 'Copied' : 'Copy URL'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-2.5 py-1.5 rounded bg-white border border-neutral-200 font-mono text-[11px] text-neutral-800 truncate">
                {`${getLiveAppUrl()}/sitemap.xml`}
              </code>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard?.writeText(`${getLiveAppUrl()}/sitemap.xml`);
                    setCopiedSitemap(true);
                    setTimeout(() => setCopiedSitemap(false), 1800);
                  } catch {
                    // ignore clipboard fallback
                  }
                }}
                className="px-2.5 py-1.5 rounded bg-white border border-neutral-300 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50 inline-flex items-center gap-1 shrink-0"
              >
                {copiedSitemap ? <Check className="w-3.5 h-3.5 text-[#0A4D2E]" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSitemap ? 'Copied' : 'Copy Sitemap'}
              </button>
            </div>
            <p className="text-[11px] text-neutral-600 leading-relaxed">
              1) Open Google Search Console &rarr; choose <strong>URL prefix</strong> &amp; paste the SwayPalm26 URL above. 2) Submit <code className="font-mono">sitemap.xml</code> and click <strong>Request Indexing</strong> so <code className="font-mono">swaypalm26</code> appears in Google Search.
            </p>
          </div>
        </div>
      </div>

      <PublicQrCodeCard />
      <PlayStoreLaunchKitCard />
    </div>
  );
};
