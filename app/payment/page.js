"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function PaymentPage() {
  const router = useRouter();

  const [checkout, setCheckout] = useState(null);
  const [cart, setCart] = useState([]);

  const [slip, setSlip] = useState(null);
  const [preview, setPreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [checkingPayment, setCheckingPayment] = useState(false);

  const statusIntervalRef = useRef(null);
  const mountedRef = useRef(true);

  // ==========================================
  // STOP PAYMENT STATUS CHECK
  // ==========================================

  const stopPaymentStatusCheck = () => {
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = null;
    }
  };

  // ==========================================
  // HANDLE APPROVED PAYMENT
  // ==========================================

  const handlePaymentApproved = (checkoutId) => {
    stopPaymentStatusCheck();

    localStorage.removeItem("uniplate_cart");
    localStorage.removeItem("uniplate_checkout");
    localStorage.removeItem("uniplate_checkout_id");

    router.push(`/receipt/${checkoutId}`);
  };

  // ==========================================
  // CHECK PAYMENT STATUS
  // ==========================================

  const checkPaymentStatus = async (checkoutId) => {
    if (!checkoutId) {
      return false;
    }

    try {
      const response = await fetch(
        `/api/payment/status?checkout_id=${checkoutId}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      console.log("PAYMENT STATUS:", data);

      if (!response.ok || !data.success) {
        return false;
      }

      // ========================================
      // APPROVED
      // ========================================

      if (data.status === "payment_approved") {
        if (mountedRef.current) {
          setCheckingPayment(false);
          setMessage("Payment approved! Opening your receipt...");
        }

        handlePaymentApproved(checkoutId);

        return true;
      }

      // ========================================
      // REJECTED
      // ========================================

      if (data.status === "payment_rejected") {
        stopPaymentStatusCheck();

        if (mountedRef.current) {
          setCheckingPayment(false);

          setCheckout((previous) => ({
            ...previous,
            payment_status: "rejected",
          }));

          setError(
            data.rejection_reason ||
              "Your payment was rejected by admin. Please check your payment slip and submit again."
          );

          setMessage("");
        }

        return true;
      }

      // ========================================
      // STILL WAITING
      // ========================================

      if (data.status === "payment_submitted") {
        if (mountedRef.current) {
          setCheckingPayment(true);
        }

        return false;
      }

      if (data.status === "payment_pending") {
        if (mountedRef.current) {
          setCheckingPayment(false);
        }

        return false;
      }

      return false;
    } catch (err) {
      console.error("PAYMENT STATUS CHECK ERROR:", err);
      return false;
    }
  };

  // ==========================================
  // START PAYMENT STATUS CHECK
  // ==========================================

  const startPaymentStatusCheck = (checkoutId) => {
    if (!checkoutId) {
      return;
    }

    stopPaymentStatusCheck();

    // Check immediately
    checkPaymentStatus(checkoutId);

    // Then continue checking every 2 seconds
    statusIntervalRef.current = setInterval(() => {
      checkPaymentStatus(checkoutId);
    }, 2000);
  };

  // ==========================================
  // LOAD CHECKOUT
  // ==========================================

  useEffect(() => {
    mountedRef.current = true;

    try {
      const savedCheckout =
        localStorage.getItem("uniplate_checkout");

      const savedCart =
        localStorage.getItem("uniplate_cart");

      if (!savedCheckout) {
        router.push("/checkout");
        return;
      }

      const parsedCheckout =
        JSON.parse(savedCheckout);

      const parsedCart = savedCart
        ? JSON.parse(savedCart)
        : [];

      setCheckout(parsedCheckout);

      if (Array.isArray(parsedCart)) {
        setCart(parsedCart);
      }

      // ========================================
      // RECOVER CHECKOUT ID
      // ========================================

      const savedCheckoutId =
        localStorage.getItem("uniplate_checkout_id");

      const checkoutId =
        parsedCheckout.checkout_id ||
        savedCheckoutId;

      // ========================================
      // IMPORTANT:
      // RESUME STATUS CHECK AUTOMATICALLY
      // ========================================

      if (
        checkoutId &&
        (
          parsedCheckout.payment_status === "submitted" ||
          parsedCheckout.payment_status === "approved"
        )
      ) {
        startPaymentStatusCheck(
          Number(checkoutId)
        );
      }
    } catch (err) {
      console.error(
        "PAYMENT PAGE LOAD ERROR:",
        err
      );

      setError(
        "Unable to load your checkout information."
      );
    } finally {
      setLoading(false);
    }

    return () => {
      mountedRef.current = false;
      stopPaymentStatusCheck();
    };
  }, [router]);

  // ==========================================
  // CHECK PAYMENT WHEN PAGE BECOMES VISIBLE
  // ==========================================

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        checkout?.checkout_id
      ) {
        checkPaymentStatus(
          Number(checkout.checkout_id)
        );
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [checkout?.checkout_id]);

  // ==========================================
  // HANDLE SLIP CHANGE
  // ==========================================

  const handleSlipChange = (event) => {
    setError("");
    setMessage("");

    const file = event.target.files?.[0];

    if (!file) {
      setSlip(null);
      setPreview("");
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Please upload a JPG, PNG, or WEBP image."
      );

      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Payment slip must be smaller than 5 MB."
      );

      event.target.value = "";
      return;
    }

    // Remove previous preview URL
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setSlip(file);

    const previewUrl =
      URL.createObjectURL(file);

    setPreview(previewUrl);
  };

  // ==========================================
  // SUBMIT PAYMENT
  // ==========================================

  const handleSubmitPayment = async () => {
    setError("");
    setMessage("");

    if (!checkout) {
      setError(
        "Checkout information is missing."
      );
      return;
    }

    if (!slip) {
      setError(
        "Please upload your payment slip."
      );
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();

      formData.append("slip", slip);

      formData.append(
        "checkout",
        JSON.stringify(checkout)
      );

      formData.append(
        "cart",
        JSON.stringify(cart)
      );

      const response = await fetch(
        "/api/checkout/submit",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to submit payment."
        );
      }

      // ========================================
      // SAVE CHECKOUT ID
      // ========================================

      const checkoutId =
        Number(data.checkout_id);

      localStorage.setItem(
        "uniplate_checkout_id",
        String(checkoutId)
      );

      // ========================================
      // UPDATE LOCAL CHECKOUT
      // ========================================

      const updatedCheckout = {
        ...checkout,
        checkout_id: checkoutId,
        payment_status: "submitted",
      };

      localStorage.setItem(
        "uniplate_checkout",
        JSON.stringify(updatedCheckout)
      );

      setCheckout(updatedCheckout);

      setMessage(
        "Payment slip submitted successfully. Waiting for admin approval."
      );

      // ========================================
      // START STATUS CHECK
      // ========================================

      startPaymentStatusCheck(checkoutId);
    } catch (err) {
      console.error(
        "PAYMENT SUBMIT ERROR:",
        err
      );

      setError(
        err.message ||
          "Unable to submit payment."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // CLEANUP PREVIEW
  // ==========================================

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }

      stopPaymentStatusCheck();
    };
  }, [preview]);

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <main className="min-h-screen bg-[#faf7f2] flex items-center justify-center">
        <div className="text-center">

          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#e5ddd5] border-t-[#211e1a]" />

          <p className="mt-4 text-sm text-[#806f64]">
            Loading payment...
          </p>

        </div>
      </main>
    );
  }

  // ==========================================
  // CHECKOUT NOT FOUND
  // ==========================================

  if (!checkout) {
    return (
      <main className="min-h-screen bg-[#faf7f2] flex items-center justify-center">

        <div className="text-center">

          <h1 className="text-2xl font-bold">
            Checkout not found
          </h1>

          <button
            onClick={() =>
              router.push("/checkout")
            }
            className="mt-5 rounded-xl bg-[#e54826] px-6 py-3 font-semibold text-white"
          >
            Back to Checkout
          </button>

        </div>

      </main>
    );
  }

  // ==========================================
  // VALUES
  // ==========================================

  const subtotal =
    Number(checkout.subtotal) || 0;

  const deliveryFee =
    Number(checkout.delivery_fee) || 0;

  const total =
    Number(checkout.total) ||
    subtotal + deliveryFee;

  const isDelivery =
    checkout.delivery_method ===
    "delivery";

  const isSubmitted =
    checkout.payment_status ===
    "submitted";

  const isRejected =
    checkout.payment_status ===
    "rejected";

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <main className="min-h-screen bg-[#faf7f2] text-[#211e1a]">

      <div className="mx-auto max-w-6xl px-6 py-8">

        {/* =====================================
            HEADER
        ===================================== */}

        <div className="mb-8">

          <button
            onClick={() =>
              router.push("/checkout")
            }
            className="mb-5 text-sm font-semibold text-[#806f64] hover:text-[#211e1a]"
          >
            ← Back to Checkout
          </button>

          <h1 className="font-serif text-5xl font-bold">
            Payment
          </h1>

          <p className="mt-2 text-[#806f64]">
            Scan the QR code and upload your payment slip.
          </p>

        </div>

        {/* =====================================
            SUCCESS MESSAGE
        ===================================== */}

        {message && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-green-700">

            <div className="flex items-center gap-3">

              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">

                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>

              </div>

              <span className="text-sm font-medium">
                {message}
              </span>

            </div>

          </div>
        )}

        {/* =====================================
            ERROR
        ===================================== */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-600">

            <div className="flex items-start gap-3">

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">

                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 6l12 12" />
                  <path d="M18 6L6 18" />
                </svg>

              </div>

              <span className="text-sm font-medium">
                {error}
              </span>

            </div>

          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">

          {/* =====================================
              LEFT
          ===================================== */}

          <div className="space-y-6">

            {/* =====================================
                QR PAYMENT
            ===================================== */}

            <section className="rounded-2xl border border-[#e5ddd5] bg-white p-6">

              <div className="text-center">

                <h2 className="text-2xl font-bold">
                  Pay with QR
                </h2>

                <p className="mt-2 text-[#806f64]">
                  Scan this QR code using your banking app.
                </p>

                <div className="mx-auto mt-6 flex h-[330px] w-[330px] items-center justify-center rounded-2xl border border-[#e5ddd5] bg-white p-4">

                  <img
                    src="/qr-payment.png"
                    alt="UniPlate Payment QR Code"
                    className="h-full w-full object-contain"
                  />

                </div>

                <div className="mt-6">

                  <p className="text-sm text-[#806f64]">
                    Amount to pay
                  </p>

                  <p className="mt-1 text-4xl font-bold text-[#e54826]">
                    ฿{total.toFixed(2)}
                  </p>

                </div>

              </div>

            </section>

            {/* =====================================
                UPLOAD SLIP
            ===================================== */}

            <section className="rounded-2xl border border-[#e5ddd5] bg-white p-6">

              <h2 className="text-2xl font-bold">
                Upload Payment Slip
              </h2>

              <p className="mt-2 text-[#806f64]">
                After completing the payment, upload your payment slip for admin verification.
              </p>

              <div className="mt-6">

                <label
                  htmlFor="payment-slip"
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
                    isSubmitted
                      ? "cursor-not-allowed border-gray-200 bg-gray-100"
                      : "border-[#d8cec5] bg-[#faf7f2] hover:border-[#211e1a]"
                  }`}
                >

                  <svg
                    width="38"
                    height="38"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="text-[#806f64]"
                  >
                    <path
                      d="M12 16V4"
                      strokeLinecap="round"
                    />

                    <path
                      d="M7 9l5-5 5 5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    <path
                      d="M5 20h14"
                      strokeLinecap="round"
                    />
                  </svg>

                  <span className="mt-3 font-semibold">
                    {isSubmitted
                      ? "Payment Submitted"
                      : "Choose payment slip"}
                  </span>

                  <span className="mt-1 text-sm text-[#806f64]">
                    {isSubmitted
                      ? "Waiting for administrator approval"
                      : "JPG, PNG or WEBP · Maximum 5 MB"}
                  </span>

                  <input
                    id="payment-slip"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleSlipChange}
                    disabled={isSubmitted}
                    className="hidden"
                  />

                </label>

              </div>

              {/* =================================
                  PREVIEW
              ================================= */}

              {preview && (
                <div className="mt-6">

                  <p className="mb-3 font-semibold">
                    Payment Slip Preview
                  </p>

                  <div className="overflow-hidden rounded-2xl border border-[#e5ddd5] bg-[#faf7f2]">

                    <img
                      src={preview}
                      alt="Payment slip preview"
                      className="max-h-[500px] w-full object-contain"
                    />

                  </div>

                  {slip && (
                    <p className="mt-3 text-sm text-[#806f64]">
                      {slip.name}
                    </p>
                  )}

                </div>
              )}

            </section>

          </div>

          {/* =====================================
              RIGHT
          ===================================== */}

          <aside className="h-fit lg:sticky lg:top-6">

            <section className="rounded-2xl border border-[#e5ddd5] bg-white p-6">

              <h2 className="text-2xl font-bold">
                Order Summary
              </h2>

              <div className="mt-6 space-y-4">

                <div className="flex justify-between text-[#806f64]">

                  <span>
                    Items
                  </span>

                  <span className="font-medium text-[#211e1a]">
                    ฿{subtotal.toFixed(2)}
                  </span>

                </div>

                <div className="flex justify-between text-[#806f64]">

                  <span>
                    Shops
                  </span>

                  <span className="font-medium text-[#211e1a]">
                    {checkout.shop_count || 0}
                  </span>

                </div>

                <div className="flex justify-between text-[#806f64]">

                  <span>
                    {isDelivery
                      ? "Delivery"
                      : "Pickup fee"}
                  </span>

                  <span className="font-medium text-[#211e1a]">
                    ฿{deliveryFee.toFixed(2)}
                  </span>

                </div>

                <div className="border-t border-[#e5ddd5] pt-5">

                  <div className="flex items-center justify-between">

                    <span className="text-xl font-bold">
                      Total
                    </span>

                    <span className="text-3xl font-bold text-[#e54826]">
                      ฿{total.toFixed(2)}
                    </span>

                  </div>

                </div>

              </div>

              {/* =================================
                  DELIVERY INFORMATION
              ================================= */}

              {isDelivery && (
                <div className="mt-6 border-t border-[#e5ddd5] pt-5">

                  <h3 className="font-bold">
                    Delivery Information
                  </h3>

                  <div className="mt-4 space-y-3 text-sm">

                    <div>

                      <p className="text-[#806f64]">
                        Building / Room
                      </p>

                      <p className="font-medium">
                        {checkout.building_number ||
                          "-"}
                      </p>

                    </div>

                    <div>

                      <p className="text-[#806f64]">
                        Phone
                      </p>

                      <p className="font-medium">
                        {checkout.phone || "-"}
                      </p>

                    </div>

                    {checkout.delivery_note && (
                      <div>

                        <p className="text-[#806f64]">
                          Note
                        </p>

                        <p className="font-medium">
                          {checkout.delivery_note}
                        </p>

                      </div>
                    )}

                  </div>

                </div>
              )}

              {/* =================================
                  PAYMENT STATUS
              ================================= */}

              {isSubmitted && (
                <div className="mt-7 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-4">

                  <div className="flex items-center gap-3">

                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-yellow-300 border-t-yellow-700" />

                    <div>

                      <p className="text-sm font-semibold text-yellow-800">
                        Waiting for Approval
                      </p>

                      <p className="mt-1 text-xs text-yellow-700">
                        Checking payment status automatically...
                      </p>

                    </div>

                  </div>

                </div>
              )}

              {checkingPayment &&
                !isSubmitted && (
                  <div className="mt-7 rounded-xl border border-blue-200 bg-blue-50 px-4 py-4">

                    <p className="text-sm font-medium text-blue-700">
                      Checking payment status...
                    </p>

                  </div>
                )}

              {/* =================================
                  SUBMIT BUTTON
              ================================= */}

              {!isSubmitted && (
                <button
                  type="button"
                  onClick={handleSubmitPayment}
                  disabled={
                    submitting ||
                    !slip
                  }
                  className="mt-7 w-full rounded-xl bg-[#e54826] px-6 py-4 font-semibold text-white transition hover:bg-[#c93d20] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? "Submitting..."
                    : isRejected
                    ? "Submit Payment Again"
                    : "Submit Payment"}
                </button>
              )}

              {/* =================================
                  WAITING MESSAGE
              ================================= */}

              {isSubmitted && (
                <p className="mt-4 text-center text-xs leading-5 text-[#806f64]">
                  Your payment slip is being reviewed by an administrator.
                  This page will automatically continue when your payment is approved.
                </p>
              )}

              {!isSubmitted && !isRejected && (
                <p className="mt-4 text-center text-xs leading-5 text-[#806f64]">
                  Your payment slip will be reviewed by an administrator before your order is confirmed.
                </p>
              )}

            </section>

          </aside>

        </div>

      </div>

    </main>
  );
}