"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "student",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed.");
      }

      setSuccess(true);
    } catch (err) {
      console.error("REGISTER ERROR:", err);

      setError(err.message || "Unable to create account.");
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // SUCCESS SCREEN
  // =========================================================

  if (success) {
    return (
      <main className="min-h-screen bg-[#f8f5ef] text-[#171717]">

        <div className="grid min-h-screen lg:grid-cols-2">

          {/* LEFT BRAND AREA */}

          <section className="relative hidden overflow-hidden bg-[#171717] lg:flex">

            <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#f4a340]/10 blur-3xl" />

            <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#f4a340]/10 blur-3xl" />

            <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">

              <button
                type="button"
                onClick={() => router.push("/")}
                className="flex w-fit items-center gap-3"
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

                <div className="text-left">
                  <div className="text-xl font-bold text-white">
                    UniPlate
                  </div>

                  <div className="text-xs text-white/40">
                    Food Ordering System
                  </div>
                </div>
              </button>

              <div className="max-w-lg">

                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#f4a340]" />
                  Account created
                </div>

                <h2 className="font-serif text-5xl font-bold leading-[1.05] tracking-tight text-white xl:text-6xl">
                  Welcome to
                  <br />
                  <span className="text-[#f4a340]">
                    UniPlate.
                  </span>
                </h2>

                <p className="mt-6 max-w-md text-[16px] leading-7 text-white/50">
                  Your account is ready. Sign in and start
                  discovering food from your university food court.
                </p>

              </div>

              <p className="text-xs text-white/30">
                © {new Date().getFullYear()} UniPlate
              </p>

            </div>
          </section>

          {/* SUCCESS */}

          <section className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-10">

            <div className="w-full max-w-[430px] text-center">

              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#f4a340]/15">

                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f4a340]">

                  <svg
                    width="25"
                    height="25"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#171717"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>

                </div>

              </div>

              <p className="mt-7 text-sm font-semibold text-[#d78924]">
                Registration complete
              </p>

              <h1 className="mt-2 font-serif text-[38px] font-bold tracking-tight">
                Account created
              </h1>

              <p className="mx-auto mt-4 max-w-[360px] text-[15px] leading-6 text-[#77736d]">
                Your UniPlate account has been created successfully.
                You can now sign in using your email and password.
              </p>

              <button
                type="button"
                onClick={() => router.push("/login")}
                className="
                  mt-8
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
                  transition
                  hover:bg-[#2c2926]
                "
              >
                Go to Login

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
              </button>

              <button
                type="button"
                onClick={() => router.push("/")}
                className="mt-6 text-sm font-medium text-[#8a857e] transition hover:text-[#171717]"
              >
                Back to home
              </button>

            </div>

          </section>

        </div>
      </main>
    );
  }

  // =========================================================
  // REGISTER PAGE
  // =========================================================

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#171717]">

      <div className="grid min-h-screen lg:grid-cols-2">

        {/* ===================================================
            LEFT BRAND / VISUAL
        =================================================== */}

        <section className="relative hidden overflow-hidden bg-[#171717] lg:flex">

          <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#f4a340]/10 blur-3xl" />

          <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#f4a340]/10 blur-3xl" />

          <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">

            {/* LOGO */}

            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex w-fit items-center gap-3"
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

              <div className="text-left">

                <div className="text-xl font-bold text-white">
                  UniPlate
                </div>

                <div className="text-xs text-white/40">
                  Food Ordering System
                </div>

              </div>

            </button>

            {/* MAIN MESSAGE */}

            <div className="max-w-xl">

              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/70">

                <span className="h-1.5 w-1.5 rounded-full bg-[#f4a340]" />

                Join UniPlate

              </div>

              <h2 className="font-serif text-5xl font-bold leading-[1.05] tracking-tight text-white xl:text-6xl">

                Your next meal
                <br />

                <span className="text-[#f4a340]">
                  starts here.
                </span>

              </h2>

              <p className="mt-6 max-w-md text-[16px] leading-7 text-white/50">
                Create your account and discover food from
                restaurants around your university campus.
              </p>

              {/* FEATURES */}

              <div className="mt-12 grid grid-cols-3 gap-5 border-t border-white/10 pt-7">

                <div>
                  <div className="text-sm font-semibold text-white">
                    Discover
                  </div>

                  <div className="mt-1 text-xs text-white/35">
                    Explore food shops
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-white">
                    Order
                  </div>

                  <div className="mt-1 text-xs text-white/35">
                    Order with ease
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-white">
                    Enjoy
                  </div>

                  <div className="mt-1 text-xs text-white/35">
                    Pick up your food
                  </div>
                </div>

              </div>

            </div>

            <p className="text-xs text-white/30">
              © {new Date().getFullYear()} UniPlate. All rights reserved.
            </p>

          </div>

        </section>

        {/* ===================================================
            REGISTER FORM
        =================================================== */}

        <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-10 lg:px-14 xl:px-20">

          <div className="w-full max-w-[440px]">

            {/* MOBILE LOGO */}

            <div className="mb-7 flex justify-center lg:hidden">

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

                <span className="font-serif text-[23px] font-bold">
                  UniPlate
                </span>

              </button>

            </div>

            {/* HEADING */}

            <div className="mb-6">

              <p className="mb-2 text-sm font-semibold text-[#d78924]">
                Get started
              </p>

              <h1 className="font-serif text-[34px] font-bold leading-tight tracking-tight sm:text-[38px]">
                Create your account
              </h1>

              <p className="mt-2.5 text-[14px] leading-6 text-[#77736d]">
                Register to start ordering your favorite food.
              </p>

            </div>

            {/* ERROR */}

            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">

                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">
                  !
                </div>

                <p className="text-sm font-medium leading-5 text-red-700">
                  {error}
                </p>

              </div>
            )}

            {/* FORM */}

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >

              {/* NAME */}

              <div>

                <label
                  htmlFor="name"
                  className="mb-2 block text-[13px] font-semibold text-[#292724]"
                >
                  Full name
                </label>

                <div className="relative">

                  <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#918b83]">

                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 21c.8-4 3.5-6 8-6s7.2 2 8 6" />
                    </svg>

                  </div>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    required
                    disabled={loading}
                    autoComplete="name"
                    className="
                      w-full
                      rounded-xl
                      border
                      border-[#dedbd5]
                      bg-white
                      py-[13px]
                      pl-11
                      pr-4
                      text-[14px]
                      outline-none
                      transition
                      placeholder:text-[#aaa59e]
                      hover:border-[#c7c2ba]
                      focus:border-[#d78924]
                      focus:ring-4
                      focus:ring-[#d78924]/10
                      disabled:bg-[#f5f4f1]
                    "
                  />

                </div>

              </div>

              {/* EMAIL */}

              <div>

                <label
                  htmlFor="email"
                  className="mb-2 block text-[13px] font-semibold text-[#292724]"
                >
                  Email address
                </label>

                <div className="relative">

                  <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#918b83]">

                    <svg
                      width="18"
                      height="18"
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
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                    disabled={loading}
                    autoComplete="email"
                    className="
                      w-full
                      rounded-xl
                      border
                      border-[#dedbd5]
                      bg-white
                      py-[13px]
                      pl-11
                      pr-4
                      text-[14px]
                      outline-none
                      transition
                      placeholder:text-[#aaa59e]
                      hover:border-[#c7c2ba]
                      focus:border-[#d78924]
                      focus:ring-4
                      focus:ring-[#d78924]/10
                      disabled:bg-[#f5f4f1]
                    "
                  />

                </div>

              </div>

              {/* PHONE */}

              <div>

                <label
                  htmlFor="phone"
                  className="mb-2 block text-[13px] font-semibold text-[#292724]"
                >
                  Phone number
                </label>

                <div className="relative">

                  <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#918b83]">

                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6.5 3h3L11 8 8.5 9.5a15 15 0 0 0 6 6L16 13l5 1.5v3a2 2 0 0 1-2 2C10.7 19.5 4.5 13.3 4.5 5a2 2 0 0 1 2-2Z" />
                    </svg>

                  </div>

                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Enter your phone number"
                    disabled={loading}
                    autoComplete="tel"
                    className="
                      w-full
                      rounded-xl
                      border
                      border-[#dedbd5]
                      bg-white
                      py-[13px]
                      pl-11
                      pr-4
                      text-[14px]
                      outline-none
                      transition
                      placeholder:text-[#aaa59e]
                      hover:border-[#c7c2ba]
                      focus:border-[#d78924]
                      focus:ring-4
                      focus:ring-[#d78924]/10
                      disabled:bg-[#f5f4f1]
                    "
                  />

                </div>

              </div>

              {/* PASSWORD */}

              <div>

                <label
                  htmlFor="password"
                  className="mb-2 block text-[13px] font-semibold text-[#292724]"
                >
                  Password
                </label>

                <div className="relative">

                  <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#918b83]">

                    <svg
                      width="18"
                      height="18"
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
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Create a password"
                    required
                    disabled={loading}
                    autoComplete="new-password"
                    className="
                      w-full
                      rounded-xl
                      border
                      border-[#dedbd5]
                      bg-white
                      py-[13px]
                      pl-11
                      pr-12
                      text-[14px]
                      outline-none
                      transition
                      placeholder:text-[#aaa59e]
                      hover:border-[#c7c2ba]
                      focus:border-[#d78924]
                      focus:ring-4
                      focus:ring-[#d78924]/10
                      disabled:bg-[#f5f4f1]
                    "
                  />

                  {/* MINIMALIST EYE */}

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    className="
                      absolute
                      right-2.5
                      top-1/2
                      flex
                      h-9
                      w-9
                      -translate-y-1/2
                      items-center
                      justify-center
                      rounded-lg
                      text-[#918b83]
                      transition
                      hover:bg-[#f5f2ed]
                      hover:text-[#292724]
                    "
                  >

                    {showPassword ? (

                      <svg
                        width="18"
                        height="18"
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
                        width="18"
                        height="18"
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

              {/* ACCOUNT TYPE */}

              <div>

                <label
                  htmlFor="role"
                  className="mb-2 block text-[13px] font-semibold text-[#292724]"
                >
                  Account type
                </label>

                <div className="relative">

                  <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#918b83]">

                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="7" r="3.5" />
                      <path d="M5 21c.8-4.2 3.1-6.3 7-6.3s6.2 2.1 7 6.3" />
                    </svg>

                  </div>

                  <select
                    id="role"
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    disabled={loading}
                    className="
                      w-full
                      appearance-none
                      rounded-xl
                      border
                      border-[#dedbd5]
                      bg-white
                      py-[13px]
                      pl-11
                      pr-10
                      text-[14px]
                      outline-none
                      transition
                      hover:border-[#c7c2ba]
                      focus:border-[#d78924]
                      focus:ring-4
                      focus:ring-[#d78924]/10
                      disabled:bg-[#f5f4f1]
                    "
                  >
                    <option value="student">
                      Student
                    </option>

                    <option value="shopowner">
                      Shop Owner
                    </option>

                    <option value="delivery">
                      Delivery Person
                    </option>
                  </select>

                  <svg
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#918b83]"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>

                </div>

              </div>

              {/* SUBMIT */}

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
                  py-[14px]
                  text-[14px]
                  font-semibold
                  text-white
                  shadow-sm
                  transition-all
                  duration-200
                  hover:bg-[#2c2926]
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

                    Creating Account...
                  </>

                ) : (

                  <>
                    Create Account

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

            {/* LOGIN */}

            <div className="mt-6 text-center">

              <p className="text-[13px] text-[#858078]">

                Already have an account?{" "}

                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="font-bold text-[#171717] transition hover:text-[#d78924] hover:underline"
                >
                  Sign in
                </button>

              </p>

            </div>

            {/* BACK HOME */}

            <div className="mt-5 text-center">

              <button
                type="button"
                onClick={() => router.push("/")}
                className="
                  inline-flex
                  items-center
                  gap-2
                  text-[12px]
                  font-medium
                  text-[#9a948c]
                  transition
                  hover:text-[#292724]
                "
              >

                <svg
                  width="15"
                  height="15"
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

          </div>

        </section>

      </div>

    </main>
  );
}