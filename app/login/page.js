'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  HiMail,
  HiLockClosed,
  HiArrowRight,
  HiEye,
  HiEyeOff,
  HiShieldCheck,
} from 'react-icons/hi';
import { APP_CONFIG } from '@/config/appConfig';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shopName, setShopName] = useState(APP_CONFIG.shopName);
  const { login, user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard if user is already logged in
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchShopName = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/shop/public/name`);
        const data = await response.json();
        if (data.shopName) {
          setShopName(data.shopName);
        }
      } catch (error) {
        console.error('Error fetching shop name:', error);
        // Keep default name from APP_CONFIG
      }
    };
    fetchShopName();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Don't render login form if user is already logged in (will redirect)
  if (user) {
    return null;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#f4f1ea] text-gray-900">
      <div className="grid h-full w-full lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden border-r border-[#d8d0c4] bg-[#ece4d7] lg:block">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.28),transparent_36%)]" />
          <div className="relative flex h-full flex-col justify-between px-12 py-10 xl:px-14 xl:py-12">
            <div>
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="relative h-16 w-40">
                    <Image
                      src="/digistriveLogo.png"
                      alt={shopName}
                      fill
                      className="object-contain object-left"
                      priority
                    />
                  </div>
                  <p className="font-ui mt-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#41664f]">
                    Secure business login
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#c9c1b4] bg-white/70 px-3 py-1.5 font-ui text-xs font-medium text-[#355845]">
                  <HiShieldCheck className="h-4 w-4" />
                  Verified access
                </div>
              </div>

              <div className="mt-24 max-w-lg">
                <h1 className="font-display text-[3.35rem] font-semibold leading-[1.04] text-[#1f2f27]">
                  Billing access for your business team.
                </h1>
                <p className="font-copy mt-6 max-w-md text-base leading-7 text-[#526057]">
                  Clean, controlled login for staff handling invoices, stock, and payment work.
                </p>
              </div>
            </div>

            <div className="max-w-sm rounded-[26px] border border-[#d4ccbe] bg-white/55 p-5">
              <p className="font-ui text-xs font-semibold uppercase tracking-[0.22em] text-[#6f7f74]">
                Access note
              </p>
              <p className="font-copy mt-3 text-sm leading-6 text-[#526057]">
                Accounts are created by your organization admin. Contact them if you need login details.
              </p>
              <div className="mt-4 h-px w-full bg-[#ddd5c9]" />
              <p className="font-ui mt-4 text-xs font-medium uppercase tracking-[0.18em] text-[#7b877f]">
                No public signup
              </p>
            </div>

            <p className="font-ui mt-6 text-xs text-[#607065]">
              © {APP_CONFIG.copyrightYear} {shopName}. All rights reserved.
            </p>
          </div>
        </section>

        <section className="flex h-full bg-[#f8f5ef]">
          <div className="flex w-full items-center justify-center px-6 py-8 sm:px-8 lg:px-12">
            <div className="w-full max-w-lg">
              <div className="border-b border-[#ddd5c9] pb-6">
                <p className="font-ui text-sm font-semibold uppercase tracking-[0.24em] text-[#6a7c70]">
                  Sign in
                </p>
                <h2 className="font-display mt-3 text-4xl font-semibold leading-tight text-[#1e3026] sm:text-[2.8rem]">
                  Welcome back
                </h2>
                <p className="font-copy mt-3 max-w-md text-[15px] leading-6 text-[#5b675f]">
                  Use the login details provided for <span className="font-semibold text-[#22352b]">{shopName}</span>.
                </p>
              </div>

              <div className="mt-6 grid gap-4 rounded-[30px] border border-[#ddd5c9] bg-white/75 p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-ui text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    Business-managed access
                  </div>
                  <div className="font-copy text-sm text-[#647066]">
                    Only authorized users can sign in.
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                    <p className="font-copy text-sm text-red-700">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 text-black">
                  <div>
                    <label htmlFor="email" className="font-ui mb-2 block text-sm font-semibold text-[#3f4d44]">
                      Email address
                    </label>
                    <div className="group relative rounded-2xl border border-[#d8d1c5] bg-[#fcfbf8] transition-colors duration-200 focus-within:border-emerald-500 focus-within:bg-white">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <HiMail className="h-5 w-5 text-[#93a097] transition-colors group-focus-within:text-emerald-600" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="font-copy w-full rounded-2xl bg-transparent py-3.5 pl-12 pr-4 text-[15px] text-gray-900 outline-none placeholder:text-[#a2aaa4]"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label htmlFor="password" className="font-ui block text-sm font-semibold text-[#3f4d44]">
                        Password
                      </label>
                      <span className="font-copy text-xs text-[#7b877f]">Issued by your admin</span>
                    </div>
                    <div className="group relative rounded-2xl border border-[#d8d1c5] bg-[#fcfbf8] transition-colors duration-200 focus-within:border-emerald-500 focus-within:bg-white">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <HiLockClosed className="h-5 w-5 text-[#93a097] transition-colors group-focus-within:text-emerald-600" />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="font-copy w-full rounded-2xl bg-transparent py-3.5 pl-12 pr-16 text-[15px] text-gray-900 outline-none placeholder:text-[#a2aaa4]"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="font-ui absolute inset-y-0 right-0 flex items-center pr-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#718177] transition-colors hover:text-[#284536] focus:outline-none focus:text-[#284536]"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <>
                            <HiEyeOff className="mr-1.5 h-4 w-4" />
                            Hide
                          </>
                        ) : (
                          <>
                            <HiEye className="mr-1.5 h-4 w-4" />
                            Show
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group mt-2 flex w-full items-center justify-between rounded-2xl bg-emerald-600 px-5 py-3.5 text-left text-white transition-all duration-200 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span>
                      <span className="font-ui block text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100/80">
                        Access workspace
                      </span>
                      <span className="font-copy mt-1 block text-sm text-white/90">
                        {loading ? 'Checking your account details...' : 'Continue to dashboard'}
                      </span>
                    </span>
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/14 transition-transform duration-200 group-hover:translate-x-1">
                      {loading ? (
                        <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        <HiArrowRight className="h-5 w-5" />
                      )}
                    </span>
                  </button>
                </form>

                <div className="rounded-2xl border border-[#e2dbcf] bg-[#f6f2ea] px-4 py-3.5">
                  <p className="font-ui text-xs font-semibold uppercase tracking-[0.22em] text-[#6f7f74]">
                    Need access?
                  </p>
                  <p className="font-copy mt-1 text-sm text-[#56635a]">
                    Contact your organization admin for login details.
                  </p>
                </div>
              </div>

              <p className="font-ui mt-8 text-xs text-[#748077] lg:hidden">
                © {APP_CONFIG.copyrightYear} {shopName}. All rights reserved.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
