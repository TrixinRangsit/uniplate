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
        setError(
          data.message || "Invalid email or password."
        );
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
        throw new Error(
          `Unknown account role: ${role}`
        );
      }

      router.refresh();
    } catch (err) {
      console.error("LOGIN ERROR:", err);

      setError(
        err.message ||
          "Unable to login. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f4ee] text-[#171717]">

      {/* ==========================================
          PAGE
      ========================================== */}

      <div className="min-h-screen flex items-center justify-center px-5 py-10">

        {/* ========================================
            LOGIN CARD
        ======================================== */}

        <div className="w-full max-w-[500px]">

          <div className="bg-white border border-[#e5ded4] rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.08)] overflow-hidden">

            {/* ====================================
                TOP BRAND AREA
            ==================================== */}

            <div className="px-8 pt-10 pb-7 text-center">

              {/* LOGO */}

              <button
                type="button"
                onClick={() => router.push("/")}
                className="inline-flex items-center justify-center"
              >
                <span className="font-serif text-[42px] leading-none font-bold tracking-tight text-[#171717]">
                  UniPlate
                </span>
              </button>

              <p className="mt-3 text-[15px] text-[#6f6a63]">
                University Food Ordering System
              </p>

            </div>

            {/* ====================================
                FORM AREA
            ==================================== */}

            <div className="px-8 pb-9">

              {/* HEADING */}

              <div className="mb-7">

                <h1 className="text-[30px] leading-tight font-bold tracking-tight text-[#171717]">
                  Welcome back
                </h1>

                <p className="mt-2 text-[15px] text-[#716b64]">
                  Sign in to continue to your account.
                </p>

              </div>

              {/* ==================================
                  ERROR MESSAGE
              ================================== */}

              {error && (

                <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">

                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-[11px] font-bold text-white">
                    !
                  </div>

                  <p className="text-sm font-medium leading-5 text-red-700">
                    {error}
                  </p>

                </div>

              )}

              {/* ==================================
                  FORM
              ================================== */}

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >

                {/* =================================
                    EMAIL
                ================================= */}

                <div>

                  <label
                    htmlFor="email"
                    className="mb-2 block text-[14px] font-bold text-[#292521]"
                  >
                    Email
                  </label>

                  <div className="relative">

                    {/* EMAIL ICON */}

                    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#77716a]">

                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
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
                      placeholder="Enter your email"
                      autoComplete="email"
                      disabled={loading}
                      className="
                        w-full
                        rounded-xl
                        border
                        border-[#cfc7bd]
                        bg-white
                        px-4
                        py-[15px]
                        pl-12
                        text-[15px]
                        font-medium
                        text-[#171717]
                        placeholder:text-[#77716a]
                        placeholder:opacity-100
                        outline-none
                        transition-all
                        duration-200
                        hover:border-[#aaa096]
                        focus:border-[#171717]
                        focus:ring-4
                        focus:ring-[#171717]/10
                        disabled:cursor-not-allowed
                        disabled:bg-[#f5f3f0]
                        disabled:text-[#77716a]
                      "
                    />

                  </div>

                </div>

                {/* =================================
                    PASSWORD
                ================================= */}

                <div>

                  <div className="flex items-center justify-between mb-2">

                    <label
                      htmlFor="password"
                      className="block text-[14px] font-bold text-[#292521]"
                    >
                      Password
                    </label>

                  </div>

                  <div className="relative">

                    {/* LOCK ICON */}

                    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#77716a]">

                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
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
                        border-[#cfc7bd]
                        bg-white
                        px-4
                        py-[15px]
                        pl-12
                        pr-14
                        text-[15px]
                        font-medium
                        text-[#171717]
                        placeholder:text-[#77716a]
                        placeholder:opacity-100
                        outline-none
                        transition-all
                        duration-200
                        hover:border-[#aaa096]
                        focus:border-[#171717]
                        focus:ring-4
                        focus:ring-[#171717]/10
                        disabled:cursor-not-allowed
                        disabled:bg-[#f5f3f0]
                        disabled:text-[#77716a]
                      "
                    />

                    {/* SHOW PASSWORD */}

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          !showPassword
                        )
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
                        -translate-y-1/2
                        rounded-lg
                        p-2
                        text-[#77716a]
                        transition
                        hover:bg-[#f2eee9]
                        hover:text-[#171717]
                        disabled:cursor-not-allowed
                      "
                    >

                      {showPassword ? (

                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
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
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
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

                {/* =================================
                    SIGN IN BUTTON
                ================================= */}

                <button
                  type="submit"
                  disabled={loading}
                  className="
                    mt-2
                    w-full
                    rounded-xl
                    bg-[#171717]
                    px-4
                    py-[15px]
                    text-[15px]
                    font-bold
                    text-white
                    shadow-sm
                    transition-all
                    duration-200
                    hover:bg-[#2c2926]
                    hover:shadow-md
                    active:scale-[0.99]
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >

                  {loading ? (

                    <span className="flex items-center justify-center gap-2">

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

                    </span>

                  ) : (

                    "Sign In"

                  )}

                </button>

              </form>

              {/* ==================================
                  REGISTER
              ================================== */}

              <div className="mt-7 text-center">

                <p className="text-[14px] text-[#716b64]">

                  Don&apos;t have an account?{" "}

                  <button
                    type="button"
                    onClick={() =>
                      router.push("/register")
                    }
                    className="font-bold text-[#171717] hover:underline"
                  >
                    Create an account
                  </button>

                </p>

              </div>

            </div>

          </div>

          {/* ======================================
              BACK TO HOME
          ====================================== */}

          <div className="mt-6 text-center">

            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#77716a] transition hover:text-[#171717]"
            >

              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5" />
                <path d="m12 19-7-7 7-7" />
              </svg>

              Back to UniPlate

            </button>

          </div>

        </div>

      </div>

    </main>
  );
}