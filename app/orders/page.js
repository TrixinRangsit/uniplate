"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function OrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // ==========================================
  // LOAD STUDENT ORDERS
  // ==========================================

  async function loadOrders() {
    try {
      const response = await fetch(
        "/api/student/orders",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      // Not logged in
      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      // Wrong account type
      if (response.status === 403) {
        setMessage(
          "Student account required."
        );
        setLoading(false);
        return;
      }

      if (!response.ok || !data.success) {
        setMessage(
          data.message ||
            "Unable to load your orders."
        );
        return;
      }

      setOrders(data.orders || []);
      setMessage("");

    } catch (error) {
      console.error(
        "LOAD STUDENT ORDERS ERROR:",
        error
      );

      setMessage(
        "Unable to connect to order system."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // INITIAL LOAD + AUTO REFRESH
  // ==========================================

  useEffect(() => {
    loadOrders();

    const interval = setInterval(() => {
      loadOrders();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // ==========================================
  // STATUS LABEL
  // ==========================================

  function getStatusLabel(order) {
    if (
      order.order_status ===
      "cancelled"
    ) {
      return "Cancelled";
    }

    if (
      order.fulfillment_type ===
      "delivery"
    ) {
      switch (
        order.delivery_status
      ) {
        case "waiting":
          return "Waiting for Delivery";

        case "collecting":
          return "Collecting Food";

        case "ready_for_delivery":
          return "Ready for Delivery";

        case "out_for_delivery":
          return "Out for Delivery";

        case "delivered":
          return "Delivered";

        default:
          break;
      }
    }

    switch (
      order.order_status
    ) {
      case "pending":
        return "Waiting for Confirmation";

      case "confirmed":
        return "Confirmed";

      case "preparing":
        return "Preparing";

      case "ready":
        return "Ready for Pickup";

      case "collected":
        return "Collected";

      case "delivered":
        return "Delivered";

      case "cancelled":
        return "Cancelled";

      default:
        return order.order_status || "Pending";
    }
  }

  // ==========================================
  // STATUS STYLE
  // ==========================================

  function getStatusStyle(order) {
    const status =
      getStatusLabel(order);

    if (
      status === "Delivered" ||
      status === "Collected"
    ) {
      return "bg-green-50 text-green-700 border-green-200";
    }

    if (
      status === "Cancelled"
    ) {
      return "bg-red-50 text-red-700 border-red-200";
    }

    if (
      status ===
      "Ready for Delivery"
    ) {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }

    if (
      status ===
      "Out for Delivery"
    ) {
      return "bg-purple-50 text-purple-700 border-purple-200";
    }

    return "bg-orange-50 text-orange-700 border-orange-200";
  }

  // ==========================================
  // PAYMENT STATUS
  // ==========================================

  function getPaymentText(order) {
    switch (
      order.payment_status
    ) {
      case "approved":
        return "Payment Approved";

      case "submitted":
        return "Payment Being Reviewed";

      case "rejected":
        return "Payment Rejected";

      default:
        return "Payment Pending";
    }
  }

  // ==========================================
  // PAYMENT STYLE
  // ==========================================

  function getPaymentStyle(order) {
    switch (
      order.payment_status
    ) {
      case "approved":
        return "text-green-700";

      case "rejected":
        return "text-red-600";

      case "submitted":
        return "text-orange-600";

      default:
        return "text-gray-600";
    }
  }

  // ==========================================
  // GET ITEM NAME
  // ==========================================

  function getItemNames(order) {
    if (
      !order.items ||
      order.items.length === 0
    ) {
      return "Food Order";
    }

    return order.items
      .map(
        (item) =>
          `${item.menu_name}${
            Number(item.quantity) > 1
              ? ` × ${item.quantity}`
              : ""
          }`
      )
      .join(", ");
  }

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <main className="min-h-screen bg-[#faf7f2] text-[#171717]">

      {/* =====================================
          HEADER
      ===================================== */}

      <header className="border-b border-[#e5ddd2] bg-[#faf7f2]">

        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

          <button
            type="button"
            onClick={() =>
              router.push("/")
            }
            className="font-serif text-2xl font-bold"
          >
            UniPlate
          </button>

          <button
            type="button"
            onClick={() =>
              router.push("/")
            }
            className="rounded-full border border-[#211e1a] bg-white px-5 py-2.5 text-sm font-semibold transition hover:bg-[#211e1a] hover:text-white"
          >
            ← Back to Food Shops
          </button>

        </div>

      </header>

      {/* =====================================
          CONTENT
      ===================================== */}

      <section className="mx-auto max-w-4xl px-5 py-8">

        {/* PAGE TITLE */}

        <div className="mb-7">

          <p className="mb-1 text-sm font-semibold text-[#d94825]">
            📦 Orders
          </p>

          <h1 className="font-serif text-3xl font-bold">
            My Orders
          </h1>

          <p className="mt-1.5 text-sm text-gray-500">
            View your current orders and payment information.
          </p>

        </div>

        {/* =====================================
            MESSAGE
        ===================================== */}

        {message && (

          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {message}
          </div>

        )}

        {/* =====================================
            LOADING
        ===================================== */}

        {loading ? (

          <div className="rounded-2xl border border-[#e5ddd2] bg-white p-10 text-center">

            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-4 border-gray-200 border-t-[#d94825]" />

            <p className="mt-3 text-sm text-gray-500">
              Loading your orders...
            </p>

          </div>

        ) : orders.length === 0 ? (

          /* ===================================
             NO ORDERS
          =================================== */

          <div className="rounded-2xl border border-dashed border-[#d8d0c6] bg-white p-10 text-center">

            <div className="mb-3 text-4xl">
              🍜
            </div>

            <h2 className="text-lg font-bold">
              No orders yet
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Your orders will appear here after you place an order.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push("/")
              }
              className="mt-4 rounded-xl bg-[#d94825] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#bd3c1d]"
            >
              Browse Food Shops
            </button>

          </div>

        ) : (

          /* ===================================
             ORDERS
          =================================== */

          <div className="space-y-4">

            {orders.map((order) => (

              <div
                key={order.order_id}
                className="rounded-2xl border border-[#e5ddd2] bg-white shadow-sm"
              >

                {/* =================================
                    ORDER TOP
                ================================= */}

                <div className="flex items-start justify-between gap-4 px-5 py-4">

                  <div className="min-w-0">

                    {/* FOOD NAME */}

                    <h2 className="truncate text-lg font-bold">
                      {getItemNames(order)}
                    </h2>

                    {/* FOOD COURT */}

                    <p className="mt-0.5 text-sm text-gray-500">
                      {order.shop_name ||
                        "Food Court"}
                    </p>

                    {/* ORDER NUMBER */}

                    <p className="mt-1 text-xs text-gray-400">
                      Order #{order.order_id}
                    </p>

                  </div>

                  {/* STATUS */}

                  <div className="shrink-0 text-right">

                    <span
                      className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${getStatusStyle(
                        order
                      )}`}
                    >
                      {getStatusLabel(
                        order
                      )}
                    </span>

                    <p className="mt-1.5 text-xs font-medium text-gray-500">
                      {order.fulfillment_type ===
                      "delivery"
                        ? "🚚 Delivery"
                        : "🛍️ Pickup"}
                    </p>

                  </div>

                </div>

                {/* =================================
                    DELIVERY INFORMATION
                ================================= */}

                {order.fulfillment_type ===
                  "delivery" && (

                  <div className="border-t border-[#eee8e0] px-5 py-4">

                    <h3 className="mb-3 text-sm font-bold">
                      Delivery Information
                    </h3>

                    <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">

                      {/* BUILDING */}

                      <div>
                        <p className="text-xs text-gray-400">
                          Building
                        </p>

                        <p className="mt-0.5 font-medium">
                          {order.building_number ||
                            "-"}
                        </p>
                      </div>

                      {/* PHONE */}

                      <div>
                        <p className="text-xs text-gray-400">
                          Phone
                        </p>

                        <p className="mt-0.5 font-medium">
                          {order.delivery_phone ||
                            "-"}
                        </p>
                      </div>

                      {/* NOTE */}

                      <div>
                        <p className="text-xs text-gray-400">
                          Note
                        </p>

                        <p className="mt-0.5 font-medium break-words">
                          {order.delivery_note ||
                            "-"}
                        </p>
                      </div>

                    </div>

                  </div>

                )}

                {/* =================================
                    PAYMENT
                ================================= */}

                <div className="border-t border-[#eee8e0] px-5 py-4">

                  <div className="flex items-center justify-between gap-4">

                    <div>

                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Payment
                      </p>

                      <p
                        className={`mt-1 text-sm font-semibold ${getPaymentStyle(
                          order
                        )}`}
                      >
                        {getPaymentText(
                          order
                        )}
                      </p>

                    </div>

                    <div className="text-right">

                      <p className="text-xs text-gray-400">
                        Total
                      </p>

                      <p className="mt-0.5 text-lg font-bold">
                        ฿
                        {Number(
                          order.total_amount
                        ).toFixed(2)}
                      </p>

                    </div>

                  </div>

                </div>

                {/* =================================
                    DELIVERY CONFIRMATION PHOTO
                ================================= */}

                {order.fulfillment_type === "delivery" &&
                  order.delivery_status === "delivered" &&
                  order.delivery_photo && (
                    <div className="border-t border-[#eee8e0] px-5 py-5">

                      <h3 className="mb-2 text-sm font-bold">
                        Delivery Confirmation
                      </h3>

                      <p className="mb-4 text-xs text-gray-500">
                        Photo taken by the delivery person at the
                        delivery location.
                      </p>

                      <div className="overflow-hidden rounded-xl border border-[#e5ddd2] bg-[#faf7f2]">

                        <img
                          src={order.delivery_photo}
                          alt="Delivery confirmation"
                          className="max-h-[450px] w-full cursor-pointer object-contain"
                          onClick={() =>
                            window.open(
                              order.delivery_photo,
                              "_blank"
                            )
                          }
                        />

                      </div>

                      {order.delivered_at && (
                        <p className="mt-2 text-xs text-gray-400">
                          Delivered{" "}
                          {new Date(
                            order.delivered_at
                          ).toLocaleString()}
                        </p>
                      )}

                    </div>
                  )}

                {/* =================================
                    ORDER DATE
                ================================= */}

                <div className="border-t border-[#eee8e0] px-5 py-3">

                  <p className="text-xs text-gray-400">
                    Ordered{" "}
                    {new Date(
                      order.created_at
                    ).toLocaleString()}
                  </p>

                </div>

              </div>

            ))}

          </div>

        )}

      </section>

    </main>
  );
}