import React, { useState } from 'react';
import {
  CheckCircle2,
  Lock,
  Mail,
  MailCheck,
  Phone,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useSwayPalm } from '../context/SwayPalmContext';
import { getFriendlyNetworkErrorMessage, isNetworkError } from '../lib/network';
import { BUSINESS_CATEGORIES, BusinessCategory } from '../types';
import { BrandMark } from './BrandMark';

const COUNTRIES = [
  'Kenya',
  'Tanzania',
  'Uganda',
  'Nigeria',
  'South Africa',
  'USA',
  'Dubai (UAE)',
  'UK',
  'India',
  'China',
  'Germany',
];

export const AuthModal: React.FC = () => {
  const {
    firebaseUser,
    showAuthModal,
    setShowAuthModal,
    authMode,
    setAuthMode,
    signInWithGoogle,
    registerWithEmailForm,
    loginWithEmailForm,
    pendingEmailTarget,
    emailCodeDelivery,
    emailCodePreview,
    emailCodeVerifiedInSession,
    sendEmailVerificationCode,
    verifyEmailCode,
    refreshFirebaseEmailStatus,
    pendingOtpCode,
    sendPhoneOtp,
    verifyPhoneOtp,
  } = useSwayPalm();

  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+254');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('Kenya');
  const [city, setCity] = useState('Nairobi');
  const [businessType, setBusinessType] = useState<BusinessCategory>('Services');

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [emailOtpInput, setEmailOtpInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [feedback, setFeedback] = useState<{ text: string; isGooglePrompt?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!showAuthModal) return null;

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!fullName.trim() || !businessName.trim() || !email.trim() || !phone.trim()) {
      setFeedback({ text: 'Please fill in your name, business name, email, and phone number.' });
      return;
    }
    setBusy(true);
    try {
      const res = await registerWithEmailForm({
        fullName,
        businessName,
        email,
        phone,
        password,
        country,
        city,
        businessType,
      });
      if (res.message) {
        setFeedback({ text: res.message, isGooglePrompt: res.needsGoogleFallback });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setFeedback({ text: 'Enter your email or phone and password.' });
      return;
    }
    setBusy(true);
    try {
      const res = await loginWithEmailForm(loginIdentifier, loginPassword);
      if (res.message) {
        setFeedback({ text: res.message, isGooglePrompt: res.needsGoogleFallback });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleAuth = async () => {
    setFeedback(null);
    setBusy(true);
    try {
      await signInWithGoogle(
        authMode === 'register' && (fullName || businessName || phone.length > 4 || email)
          ? {
              fullName,
              businessName,
              email,
              phone,
              country,
              city,
              businessType,
            }
          : undefined
      );
    } catch (err: any) {
      setFeedback({
        text: isNetworkError(err)
          ? getFriendlyNetworkErrorMessage(err)
          : err?.message || 'Google sign-in was cancelled.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleEmailOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setBusy(true);
    try {
      const ok = await verifyEmailCode(emailOtpInput);
      if (ok) setEmailOtpInput('');
    } catch (err) {
      setFeedback({ text: getFriendlyNetworkErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setBusy(true);
    try {
      await verifyPhoneOtp(otpInput);
    } catch (err) {
      setFeedback({ text: getFriendlyNetworkErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-lg overflow-hidden my-auto">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-[#0A4D2E] text-white">
          <div className="flex items-center gap-2.5">
            <BrandMark className="w-7 h-7" />
            <div>
              <h2 className="font-display font-bold text-base leading-tight">
                {authMode === 'email_otp'
                  ? 'Verify Your Email Code'
                  : authMode === 'otp'
                    ? 'Verify Your Phone Number'
                    : authMode === 'login'
                      ? 'Sign In to SwayPalm'
                      : 'Register Your Business — FREE'}
              </h2>
              <p className="text-xs text-white/80">
                No registration fee. Pay only if you choose to advertise.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAuthModal(false)}
            aria-label="Close authentication modal"
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {(authMode === 'register' || authMode === 'login') && (
            <>
              <div className="flex items-center gap-1 p-1 bg-[#F3F5F4] rounded-lg mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setFeedback(null);
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                    authMode === 'register'
                      ? 'bg-white text-[#0A4D2E] shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Join Free
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setFeedback(null);
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                    authMode === 'login'
                      ? 'bg-white text-[#0A4D2E] shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Sign In
                </button>
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={handleGoogleAuth}
                className="w-full py-2.5 px-4 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-sm font-semibold text-neutral-900 flex items-center justify-center gap-2.5 transition-colors mb-4"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z" />
                  <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z" />
                </svg>
                Continue with Google
              </button>

              <div className="relative flex items-center justify-center my-4">
                <div className="border-t border-neutral-200 w-full" />
                <span className="bg-white px-3 text-xs text-neutral-500 whitespace-nowrap">
                  or use business form
                </span>
              </div>
            </>
          )}

          {feedback && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <p>{feedback.text}</p>
              {feedback.isGooglePrompt && (
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0A4D2E] text-white font-semibold hover:bg-[#083D24]"
                >
                  Continue with Google Now
                </button>
              )}
            </div>
          )}

          {authMode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Amina Wanjiku"
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A4D2E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Crown Beauty Ltd"
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A4D2E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Business Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A4D2E]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Phone / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+254 712 345 678"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A4D2E]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Country
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-2.5 py-2 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0A4D2E]"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Nairobi"
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A4D2E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Business Type
                  </label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value as BusinessCategory)}
                    className="w-full px-2.5 py-2 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0A4D2E]"
                  >
                    {BUSINESS_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A4D2E]"
                  />
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-xs text-neutral-500">
                <span className="inline-flex items-center gap-1.5 text-[#0A4D2E] font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Email verification code sent upon registration
                </span>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 px-4 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {busy ? 'Creating Free Account...' : 'Create Free Business Account'}
              </button>
            </form>
          )}

          {authMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Email or Phone Number
                </label>
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="you@company.com or +2547..."
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A4D2E]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A4D2E]"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 px-4 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {busy ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          )}

          {authMode === 'email_otp' && (
            <form onSubmit={handleEmailOtpSubmit} className="space-y-4">
              <div className="p-4 rounded-lg bg-[#F3F5F4] border border-neutral-200 flex items-start gap-3">
                <MailCheck className="w-5 h-5 text-[#0A4D2E] shrink-0 mt-0.5" />
                <div className="text-xs text-neutral-700">
                  <p className="font-semibold text-neutral-900">
                    Email Verification Code Sent
                  </p>
                  <p className="mt-1">
                    {emailCodeDelivery === 'email'
                      ? `We emailed a 6-digit verification code to ${pendingEmailTarget}. Check your inbox or spam folder and enter it below.`
                      : `A 6-digit verification code was generated for ${pendingEmailTarget}.`}
                  </p>
                  {emailCodeDelivery === 'sandbox_preview' && emailCodePreview && (
                    <div className="mt-2 p-2 rounded bg-white border border-neutral-200">
                      <span className="block text-[11px] text-neutral-500">
                        Preview Code (configure SMTP or Resend secrets in .env for live inbox delivery):
                      </span>
                      <span className="font-mono font-bold text-sm text-[#0A4D2E] tracking-widest">
                        {emailCodePreview}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {!emailCodeVerifiedInSession ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      6-Digit Email Verification Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={emailOtpInput}
                      onChange={(e) => setEmailOtpInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full px-4 py-2.5 text-center font-mono text-lg tracking-[0.4em] border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A4D2E]"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setFeedback(null);
                        setBusy(true);
                        try {
                          await sendEmailVerificationCode();
                        } catch (err) {
                          setFeedback({ text: getFriendlyNetworkErrorMessage(err) });
                        } finally {
                          setBusy(false);
                        }
                      }}
                      className="px-4 py-2.5 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                    >
                      Resend Email Code
                    </button>
                    <button
                      type="submit"
                      disabled={busy || emailOtpInput.length < 6}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {busy ? 'Verifying...' : 'Confirm Email Code'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-3">
                  <p className="font-semibold">
                    6-digit code confirmed! Final step: click the Firebase verification link sent to{' '}
                    {firebaseUser?.email || pendingEmailTarget}, then click Refresh Status below.
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      setFeedback(null);
                      setBusy(true);
                      try {
                        await refreshFirebaseEmailStatus();
                      } catch (err) {
                        setFeedback({ text: getFriendlyNetworkErrorMessage(err) });
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="w-full py-2.5 px-4 rounded-lg bg-[#0A4D2E] text-white font-semibold inline-flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    I&apos;ve Verified My Email — Refresh Status
                  </button>
                </div>
              )}
            </form>
          )}

          {authMode === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="p-4 rounded-lg bg-[#F3F5F4] border border-neutral-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#0A4D2E] shrink-0 mt-0.5" />
                <div className="text-xs text-neutral-700">
                  <p className="font-semibold text-neutral-900">Phone OTP Verification</p>
                  <p className="mt-1">
                    Enter the 6-digit verification code dispatched to your phone.
                    {pendingOtpCode && (
                      <span className="block mt-1 font-mono font-semibold text-[#0A4D2E]">
                        Verification Code: {pendingOtpCode}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  6-Digit OTP Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full px-4 py-2.5 text-center font-mono text-lg tracking-[0.4em] border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A4D2E]"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const code = sendPhoneOtp(phone || '+254700000000');
                    setOtpInput(code);
                  }}
                  className="px-4 py-2.5 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Resend OTP
                </button>
                <button
                  type="submit"
                  disabled={busy || otpInput.length < 6}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  Verify Phone & Continue
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
