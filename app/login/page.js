"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Invalid email or password.");
        return;
      }

      const role =
        data.user?.role ||
        data.role ||
        data.session?.role;

      if (!role) {
        throw new Error(
          "Login successful, but user role was not returned."
        );
      }

      if (role === "admin") {
        router.push("/admin");
      } else if (role === "shopowner") {
        router.push("/shopowner");
      } else if (role === "delivery") {
        router.push("/delivery");
      } else if (role === "student") {
        router.push("/");
      } else {
        throw new Error(`Unknown account role: ${role}`);
      }

      router.refresh();
    } catch (err) {
      console.error("LOGIN ERROR:", err);

      setError(
        err.message || "Unable to login. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f8f6] text-[#171717]">
      <div className="min-h-screen grid lg:grid-cols-2">

        {/* =====================================================
            LEFT SIDE — BRAND / FOOD VISUAL
        ===================================================== */}
        <section className="relative hidden overflow-hidden bg-[#171717] lg:flex">

          {/* Background decoration */}
          <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#f4a340]/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#f4a340]/10 blur-3xl" />

          <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">

            {/* Logo */}
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex w-fit items-center gap-3 text-left"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f4a340]">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#171717"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 10h18" />
                  <path d="M5 10c.8-4 3.5-6 7-6s6.2 2 7 6" />
                  <path d="M4 10v2c0 4.5 3.6 8 8 8s8-3.5 8-8v-2" />
                  <path d="M8 15h8" />
                </svg>
              </div>

              <div>
                <div className="text-xl font-bold tracking-tight text-white">
                  UniPlate
                </div>
                <div className="text-xs text-white/45">
                  Food Ordering System
                </div>
              </div>
            </button>

            {/* Main content */}
            <div className="max-w-xl">

              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f4a340]" />
                University Food Ordering
              </div>

              <h2 className="text-5xl font-bold leading-[1.08] tracking-tight text-white xl:text-6xl">
                Good food,
                <br />
                <span className="text-[#f4a340]">
                  made simple.
                </span>
              </h2>

              <p className="mt-6 max-w-md text-[16px] leading-7 text-white/55">
                Discover your favorite meals, order from campus
                restaurants, and get your food delivered without
                the hassle.
              </p>

              {/* Food visual */}
              <div className="relative mt-12 flex h-[260px] items-center justify-center">

                {/* Plate */}
                <div className="absolute h-[220px] w-[220px] rounded-full border-[14px] border-white/[0.04] bg-white/[0.03] shadow-2xl" />

                {/* Food illustration */}
                <div className="relative flex h-[165px] w-[165px] items-center justify-center rounded-full bg-[#f4a340] shadow-[0_25px_70px_rgba(244,163,64,0.22)]">

                  <div className="absolute left-[33px] top-[37px] h-[70px] w-[100px] rotate-[-8deg] rounded-[45%] bg-[#f5d39a]" />

                  <div className="absolute left-[35px] top-[48px] h-[18px] w-[96px] rotate-[-8deg] rounded-full bg-[#8a4f2c]" />

                  <div className="absolute left-[40px] top-[74px] h-[20px] w-[88px] rotate-[-8deg] rounded-full bg-[#e8a43b]" />

                  <div className="absolute left-[50px] top-[96px] h-[12px] w-[70px] rotate-[-8deg] rounded-full bg-[#4c8a48]" />

                  <div className="absolute left-[65px] top-[28px] h-7 w-7 rounded-full bg-[#d9583f]" />
                  <div className="absolute left-[98px] top-[52px] h-5 w-5 rounded-full bg-[#d9583f]" />

                  <div className="absolute left-[37px] top-[35px] h-3 w-3 rounded-full bg-white/70" />
                  <div className="absolute left-[118px] top-[78px] h-3 w-3 rounded-full bg-white/70" />
                </div>

                {/* Floating cards */}
                <div className="absolute left-2 top-8 rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 backdrop-blur-md">
                  <div className="text-[10px] text-white/40">
                    Popular today
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white">
                    🍜 Japanese Ramen
                  </div>
                </div>

                <div className="absolute bottom-5 right-2 rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6bbf59]/15 text-sm">
                      ✓
                    </div>
                    <div>
                      <div className="text-[10px] text-white/40">
                        Delivery
                      </div>
                      <div className="text-sm font-semibold text-white">
                        On the way
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="mt-8 grid grid-cols-3 gap-6 border-t border-white/10 pt-7">
                <div>
                  <div className="text-sm font-semibold text-white">
                    Easy
                  </div>
                  <div className="mt-1 text-xs text-white/40">
                    Simple ordering
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-white">
                    Fast
                  </div>
                  <div className="mt-1 text-xs text-white/40">
                    Quick delivery
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-white">
                    Secure
                  </div>
                  <div className="mt-1 text-xs text-white/40">
                    Safe account
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <p className="text-xs text-white/30">
              © {new Date().getFullYear()} UniPlate. All rights reserved.
            </p>
          </div>
        </section>

        {/* =====================================================
            RIGHT SIDE — LOGIN
        ===================================================== */}
        <section className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-10 lg:px-14 xl:px-20">

          <div className="w-full max-w-[430px]">

            {/* Mobile logo */}
            <div className="mb-12 flex justify-center lg:hidden">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="flex items-center gap-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4a340]">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#171717"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 10h18" />
                    <path d="M5 10c.8-4 3.5-6 7-6s6.2 2 7 6" />
                    <path d="M4 10v2c0 4.5 3.6 8 8 8s8-3.5 8-8v-2" />
                    <path d="M8 15h8" />
                  </svg>
                </div>

                <span className="text-xl font-bold">
                  UniPlate
                </span>
              </button>
            </div>

            {/* Heading */}
            <div className="mb-9">
              <p className="mb-3 text-sm font-semibold text-[#d78924]">
                Welcome back
              </p>

              <h1 className="text-[34px] font-bold tracking-tight text-[#171717] sm:text-[38px]">
                Sign in to your account
              </h1>

              <p className="mt-3 text-[15px] leading-6 text-[#77736d]">
                Enter your details to continue ordering your
                favorite food.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">
                  !
                </div>

                <p className="text-sm font-medium leading-5 text-red-700">
                  {error}
                </p>
              </div>
            )}

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2.5 block text-sm font-semibold text-[#292724]"
                >
                  Email address
                </label>

                <div className="relative">
                  <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8a857e]">
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect
                        x="3"
                        y="5"
                        width="18"
                        height="14"
                        rx="2"
                      />
                      <path d="m3 7 9 6 9-6" />
                    </svg>
                  </div>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={loading}
                    className="
                      w-full
                      rounded-xl
                      border
                      border-[#dedbd5]
                      bg-white
                      py-[15px]
                      pl-12
                      pr-4
                      text-[15px]
                      text-[#171717]
                      outline-none
                      transition-all
                      duration-200
                      placeholder:text-[#aaa59e]
                      hover:border-[#c7c2ba]
                      focus:border-[#d78924]
                      focus:ring-4
                      focus:ring-[#d78924]/10
                      disabled:cursor-not-allowed
                      disabled:bg-[#f5f4f1]
                    "
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="mb-2.5 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-[#292724]"
                  >
                    Password
                  </label>

                  <button
                    type="button"
                    className="text-xs font-medium text-[#8a857e] transition hover:text-[#d78924]"
                    onClick={() => {
                      setError(
                        "Please contact the administrator to reset your password."
                      );
                    }}
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="relative">
                  <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8a857e]">
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect
                        x="4"
                        y="10"
                        width="16"
                        height="11"
                        rx="2"
                      />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>
                  </div>

                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={loading}
                    className="
                      w-full
                      rounded-xl
                      border
                      border-[#dedbd5]
                      bg-white
                      py-[15px]
                      pl-12
                      pr-14
                      text-[15px]
                      text-[#171717]
                      outline-none
                      transition-all
                      duration-200
                      placeholder:text-[#aaa59e]
                      hover:border-[#c7c2ba]
                      focus:border-[#d78924]
                      focus:ring-4
                      focus:ring-[#d78924]/10
                      disabled:cursor-not-allowed
                      disabled:bg-[#f5f4f1]
                    "
                  />

                  {/* Minimalist eye button */}
                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    disabled={loading}
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    className="
                      absolute
                      right-3
                      top-1/2
                      flex
                      h-9
                      w-9
                      -translate-y-1/2
                      items-center
                      justify-center
                      rounded-lg
                      text-[#918c85]
                      transition
                      hover:bg-[#f5f2ed]
                      hover:text-[#292724]
                      disabled:cursor-not-allowed
                    "
                  >
                    {showPassword ? (
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5.2 0 8.8 4 10 8a12.5 12.5 0 0 1-3.2 5" />
                        <path d="M6.6 6.6C4.8 7.8 3.5 9.5 2 12c1.2 4 4.8 8 10 8 1.5 0 2.8-.3 4-.9" />
                      </svg>
                    ) : (
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="remember"
                  type="checkbox"
                  className="h-4 w-4 rounded border-[#d2cec7] accent-[#d78924]"
                />

                <label
                  htmlFor="remember"
                  className="cursor-pointer text-sm text-[#77736d]"
                >
                  Remember me
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="
                  mt-2
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-[#171717]
                  px-4
                  py-[15px]
                  text-[15px]
                  font-semibold
                  text-white
                  shadow-sm
                  transition-all
                  duration-200
                  hover:bg-[#2b2926]
                  hover:shadow-lg
                  active:scale-[0.99]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {loading ? (
                  <>
                    <svg
                      className="h-5 w-5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="3"
                        opacity="0.3"
                      />

                      <path
                        d="M21 12a9 9 0 0 0-9-9"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>

                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In

                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="m13 6 6 6-6 6" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-[#e5e2dc]" />
              <span className="text-xs text-[#aaa59e]">
                New to UniPlate?
              </span>
              <div className="h-px flex-1 bg-[#e5e2dc]" />
            </div>

            {/* Register */}
            <button
              type="button"
              onClick={() => router.push("/register")}
              className="
                w-full
                rounded-xl
                border
                border-[#dedbd5]
                bg-white
                px-4
                py-[14px]
                text-sm
                font-semibold
                text-[#292724]
                transition
                hover:border-[#c7c2ba]
                hover:bg-[#faf9f7]
              "
            >
              Create an account
            </button>

            {/* Back */}
            <div className="mt-7 text-center">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="
                  inline-flex
                  items-center
                  gap-2
                  text-sm
                  font-medium
                  text-[#8a857e]
                  transition
                  hover:text-[#292724]
                "
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 12H5" />
                  <path d="m12 19-7-7 7-7" />
                </svg>

                Back to home
              </button>
            </div>

            {/* Mobile footer */}
            <p className="mt-10 text-center text-xs text-[#aaa59e] lg:hidden">
              © {new Date().getFullYear()} UniPlate
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}