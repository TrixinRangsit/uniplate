"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import QRCode from "qrcode";

export default function ReceiptPage() {
  const params = useParams();
  const router = useRouter();

  const checkoutId = params?.checkoutId;

  const [receipt, setReceipt] =
    useState(null);

  const [qrImage, setQrImage] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function loadReceipt() {
    try {
      const response = await fetch(
        `/api/receipt/${checkoutId}`,
        {
          cache: "no-store",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to load receipt"
        );
      }

      setReceipt(data);

      /*
       * Only generate/display QR for PICKUP.
       */
      if (
        data.checkout
          ?.fulfillment_type ===
          "pickup" &&
        data.qr?.qr_token
      ) {
        const image =
          await QRCode.toDataURL(
            data.qr.qr_token,
            {
              width: 220,
              margin: 2,
            }
          );

        setQrImage(image);
      } else {
        setQrImage("");
      }

      setError("");
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to load receipt"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!checkoutId) {
      return;
    }

    loadReceipt();

    /*
     * Keep delivery status updated.
     */
    const interval =
      setInterval(() => {
        loadReceipt();
      }, 5000);

    return () =>
      clearInterval(interval);
  }, [checkoutId]);

  function getOrderStatusLabel(
    status
  ) {
    switch (status) {
      case "pending":
        return "Pending";

      case "confirmed":
        return "Confirmed";

      case "preparing":
        return "Preparing";

      case "ready":
        return "Ready";

      case "collected":
        return "Food Collected";

      case "ready_for_delivery":
        return "Ready for Delivery";

      case "delivered":
        return "Delivered";

      case "cancelled":
        return "Cancelled";

      default:
        return status;
    }
  }

  function getDeliveryStatusLabel(
    status
  ) {
    switch (status) {
      case "waiting":
        return "Waiting for Delivery Person";

      case "collecting":
        return "Collecting Food";

      case "ready_for_delivery":
        return "Ready for Delivery";

      case "out_for_delivery":
        return "Out for Delivery";

      case "delivered":
        return "Delivered";

      default:
        return status;
    }
  }

  function getStatusClass(
    status
  ) {
    switch (status) {
      case "pending":
      case "waiting":
        return "bg-slate-100 text-slate-600";

      case "confirmed":
      case "collecting":
        return "bg-yellow-50 text-yellow-700";

      case "preparing":
        return "bg-orange-50 text-orange-700";

      case "ready":
      case "ready_for_delivery":
        return "bg-blue-50 text-blue-700";

      case "collected":
        return "bg-indigo-50 text-indigo-700";

      case "out_for_delivery":
        return "bg-purple-50 text-purple-700";

      case "delivered":
        return "bg-green-50 text-green-700";

      case "cancelled":
        return "bg-red-50 text-red-700";

      default:
        return "bg-slate-100 text-slate-600";
    }
  }

  /*
   * ------------------------------------------
   * Loading
   * ------------------------------------------
   */

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">
            Loading receipt...
          </p>
        </div>
      </main>
    );
  }

  /*
   * ------------------------------------------
   * Error
   * ------------------------------------------
   */

  if (error || !receipt) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-white p-10 text-center">

          <h1 className="text-xl font-bold text-slate-900">
            Unable to load receipt
          </h1>

          <p className="mt-2 text-sm text-red-600">
            {error}
          </p>

          <button
            onClick={() =>
              router.push("/")
            }
            className="mt-6 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
          >
            Back to Home
          </button>

        </div>
      </main>
    );
  }

  const isDelivery =
    receipt.checkout
      ?.fulfillment_type ===
    "delivery";

  const delivery =
    receipt.delivery;

  /*
   * ------------------------------------------
   * DELIVERY TIMELINE
   * ------------------------------------------
   */

  const deliveryStatus =
    delivery?.delivery_status;

  const timeline = [
    {
      key: "payment",
      label: "Payment Approved",
      active:
        receipt.checkout
          ?.checkout_status !==
          "payment_pending" &&
        receipt.checkout
          ?.checkout_status !==
          "payment_submitted" &&
        receipt.checkout
          ?.checkout_status !==
          "payment_rejected",
    },

    {
      key: "confirmed",
      label: "Order Confirmed",
      active:
        receipt.orders?.some(
          (order) =>
            [
              "confirmed",
              "preparing",
              "ready",
              "collected",
              "ready_for_delivery",
              "delivered",
            ].includes(
              order.order_status
            )
        ) || false,
    },

    {
      key: "preparing",
      label: "Preparing",
      active:
        receipt.orders?.some(
          (order) =>
            [
              "preparing",
              "ready",
              "collected",
              "ready_for_delivery",
              "delivered",
            ].includes(
              order.order_status
            )
        ) || false,
    },

    {
      key: "collected",
      label: "Food Collected",
      active:
        isDelivery
          ? [
              "ready_for_delivery",
              "out_for_delivery",
              "delivered",
            ].includes(
              deliveryStatus
            )
          : receipt.orders?.every(
              (order) =>
                order.order_status ===
                "collected"
            ),
    },

    {
      key: "ready_for_delivery",
      label: "Ready for Delivery",
      active:
        isDelivery &&
        [
          "ready_for_delivery",
          "out_for_delivery",
          "delivered",
        ].includes(
          deliveryStatus
        ),
    },

    {
      key: "out_for_delivery",
      label: "Out for Delivery",
      active:
        isDelivery &&
        [
          "out_for_delivery",
          "delivered",
        ].includes(
          deliveryStatus
        ),
    },

    {
      key: "delivered",
      label: "Delivered",
      active:
        isDelivery &&
        deliveryStatus ===
          "delivered",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">

      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">

          <div>
            <h1 className="text-lg font-bold">
              UniPlate
            </h1>

            <p className="text-xs text-slate-500">
              Order Receipt
            </p>
          </div>

          <button
            onClick={() =>
              router.push("/")
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
          >
            Home
          </button>

        </div>
      </header>

      <section className="mx-auto max-w-3xl px-5 py-6">

        {/* RECEIPT HEADER */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">

          <div className="flex items-start justify-between gap-4">

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Checkout
              </p>

              <h2 className="mt-1 text-xl font-bold">
                #{receipt.checkout.checkout_id}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {new Date(
                  receipt.checkout.created_at
                ).toLocaleString()}
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                receipt.checkout
                  .checkout_status
              )}`}
            >
              {receipt.checkout.checkout_status}
            </span>

          </div>

        </div>

        {/* DELIVERY TRACKING */}
        {isDelivery && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Delivery Status
                </p>

                <h3 className="mt-1 text-lg font-bold">
                  {delivery
                    ? getDeliveryStatusLabel(
                        delivery.delivery_status
                      )
                    : "Waiting"}
                </h3>
              </div>

              {delivery && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                    delivery.delivery_status
                  )}`}
                >
                  {delivery.delivery_status}
                </span>
              )}

            </div>

            {/* TIMELINE */}
            <div className="mt-6">

              {timeline.map(
                (step, index) => (

                  <div
                    key={step.key}
                    className="flex gap-3"
                  >

                    <div className="flex flex-col items-center">

                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          step.active
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {step.active
                          ? "✓"
                          : index + 1}
                      </div>

                      {index <
                        timeline.length -
                          1 && (
                        <div
                          className={`h-8 w-px ${
                            step.active
                              ? "bg-slate-900"
                              : "bg-slate-200"
                          }`}
                        />
                      )}

                    </div>

                    <div className="pb-4">

                      <p
                        className={`text-sm font-semibold ${
                          step.active
                            ? "text-slate-900"
                            : "text-slate-400"
                        }`}
                      >
                        {step.label}
                      </p>

                    </div>

                  </div>

                )
              )}

            </div>

          </div>
        )}

        {/* DELIVERY INFORMATION */}
        {isDelivery && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">

            <h3 className="font-bold">
              Delivery Information
            </h3>

            <div className="mt-4 space-y-3">

              <div>
                <p className="text-xs text-slate-400">
                  Location
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {
                    receipt.checkout
                      .building_number
                  }
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  Phone
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {
                    receipt.checkout
                      .delivery_phone
                  }
                </p>
              </div>

              {receipt.checkout
                .delivery_note && (
                <div>
                  <p className="text-xs text-slate-400">
                    Note
                  </p>

                  <p className="mt-1 text-sm">
                    {
                      receipt.checkout
                        .delivery_note
                    }
                  </p>
                </div>
              )}

            </div>

          </div>
        )}

        {/* ORDERS */}
        <div className="mt-4 space-y-4">

          {receipt.orders.map(
            (order) => (

              <div
                key={
                  order.order_id
                }
                className="rounded-xl border border-slate-200 bg-white"
              >

                {/* SHOP */}
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">

                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Shop
                    </p>

                    <h3 className="mt-1 font-bold">
                      {
                        order.shop_name ||
                        "Food Shop"
                      }
                    </h3>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                      order.order_status
                    )}`}
                  >
                    {getOrderStatusLabel(
                      order.order_status
                    )}
                  </span>

                </div>

                {/* ITEMS */}
                <div className="px-5 py-4">

                  <div className="space-y-3">

                    {order.items.map(
                      (item) => (

                        <div
                          key={
                            item.order_item_id
                          }
                          className="flex items-center justify-between gap-4"
                        >

                          <div>

                            <p className="text-sm font-semibold">
                              {
                                item.menu_name
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Qty:{" "}
                              {
                                item.quantity
                              }
                            </p>

                            {item.customization && (
                              <p className="mt-1 text-xs text-slate-500">
                                {
                                  item.customization
                                }
                              </p>
                            )}

                          </div>

                          <p className="text-sm font-semibold">
                            ฿
                            {Number(
                              item.subtotal
                            ).toFixed(2)}
                          </p>

                        </div>

                      )
                    )}

                  </div>

                </div>

              </div>

            )
          )}

        </div>

        {/* DELIVERY PROOF */}
        {isDelivery &&
          delivery?.delivery_status ===
            "delivered" &&
          delivery?.delivery_photo && (
            <div className="mt-4 rounded-xl border border-green-200 bg-white p-5">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-xs uppercase tracking-wide text-green-600">
                    Delivery Completed
                  </p>

                  <h3 className="mt-1 text-lg font-bold">
                    Delivery Proof
                  </h3>
                </div>

                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                  Delivered
                </span>

              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">

                <img
                  src={
                    delivery.delivery_photo
                  }
                  alt="Delivery proof"
                  className="max-h-[500px] w-full object-contain"
                />

              </div>

              {delivery.delivered_at && (
                <p className="mt-3 text-xs text-slate-500">
                  Delivered at{" "}
                  {new Date(
                    delivery.delivered_at
                  ).toLocaleString()}
                </p>
              )}

            </div>
          )}

        {/* PICKUP QR ONLY */}
        {!isDelivery &&
          qrImage && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-center">

              <p className="text-xs uppercase tracking-wide text-slate-400">
                Pickup QR
              </p>

              <h3 className="mt-1 font-bold">
                Show this QR at the shop
              </h3>

              <img
                src={qrImage}
                alt="Pickup QR"
                className="mx-auto mt-4 h-52 w-52"
              />

              <p className="mt-3 text-xs text-slate-500">
                This QR is used to collect your
                pickup order.
              </p>

            </div>
          )}

        {/* DELIVERY QR MESSAGE */}
        {isDelivery && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-center">

            <h3 className="font-bold">
              Delivery QR
            </h3>

            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
              The delivery QR is handled by the
              delivery person. It is not displayed
              on the student receipt.
            </p>

          </div>
        )}

        {/* TOTAL */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">

          <div className="space-y-2 text-sm">

            <div className="flex justify-between">
              <span className="text-slate-500">
                Subtotal
              </span>

              <span>
                ฿
                {Number(
                  receipt.checkout
                    .subtotal
                ).toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">
                Delivery Fee
              </span>

              <span>
                ฿
                {Number(
                  receipt.checkout
                    .delivery_fee
                ).toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold">

              <span>
                Total
              </span>

              <span>
                ฿
                {Number(
                  receipt.checkout
                    .total_amount
                ).toFixed(2)}
              </span>

            </div>

          </div>

        </div>

      </section>

    </main>
  );
}