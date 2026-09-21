"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";

export default function DeliveryPage() {
  const router = useRouter();

  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  const [claimingId, setClaimingId] = useState(null);
  const [collectingId, setCollectingId] = useState(null);
  const [startingId, setStartingId] = useState(null);
  const [completing, setCompleting] = useState(false);

  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [qrImage, setQrImage] = useState("");

  // =====================================================
  // LOAD DELIVERIES
  // =====================================================

  async function loadDeliveries(showLoading = true) {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const response = await fetch("/api/delivery/orders", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessage(
          data.message || "Unable to load deliveries."
        );

        setDeliveries([]);
        return;
      }

      const list =
        data.deliveries ||
        data.orders ||
        data.data ||
        [];

      const nextDeliveries = Array.isArray(list)
        ? list
        : [];

      setDeliveries(nextDeliveries);

      // Keep modal updated when polling
      setSelectedDelivery((current) => {
        if (!current) {
          return null;
        }

        const updated = nextDeliveries.find(
          (item) =>
            Number(item.delivery_id) ===
            Number(current.delivery_id)
        );

        return updated || current;
      });

      setMessage("");
    } catch (error) {
      console.error(
        "LOAD DELIVERIES ERROR:",
        error
      );

      setDeliveries([]);

      setMessage(
        "Unable to connect to delivery system."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // INITIAL LOAD + AUTO REFRESH
  // =====================================================

  useEffect(() => {
    loadDeliveries();

    const interval = setInterval(() => {
      loadDeliveries(false);
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // =====================================================
  // OPEN DELIVERY
  // =====================================================

  async function openDelivery(delivery) {
    setSelectedDelivery(delivery);

    setPhoto(null);
    setPhotoPreview("");
    setQrImage("");

    // Generate pickup QR
    if (delivery.qr_token) {
      try {
        const image = await QRCode.toDataURL(
          String(delivery.qr_token),
          {
            width: 320,
            margin: 2,
            errorCorrectionLevel: "M",
          }
        );

        setQrImage(image);
      } catch (error) {
        console.error(
          "QR GENERATION ERROR:",
          error
        );
      }
    }
  }

  // =====================================================
  // CLAIM DELIVERY
  // =====================================================

  async function claimDelivery(delivery) {
    setClaimingId(delivery.delivery_id);
    setMessage("");

    try {
      const response = await fetch(
        "/api/delivery/claim",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            delivery_id:
              delivery.delivery_id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to claim delivery."
        );
      }

      await loadDeliveries(false);

      const claimedDelivery = {
        ...delivery,
        delivery_person_id:
          data.delivery_person_id ||
          true,
        delivery_status:
          data.delivery_status ||
          "collecting",
      };

      await openDelivery(
        claimedDelivery
      );

      setMessage(
        "Delivery claimed successfully."
      );
    } catch (error) {
      console.error(
        "CLAIM DELIVERY ERROR:",
        error
      );

      await loadDeliveries(false);

      setMessage(
        error.message ||
          "This delivery is no longer available."
      );
    } finally {
      setClaimingId(null);
    }
  }

  // =====================================================
  // COLLECT FOOD
  // =====================================================

  async function collectFood(delivery) {
    setCollectingId(
      delivery.delivery_id
    );

    setMessage("");

    try {
      const response = await fetch(
        "/api/delivery/collect",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            delivery_id:
              delivery.delivery_id,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to confirm food collection."
        );
      }

      await loadDeliveries(false);

      setSelectedDelivery(
        (current) =>
          current
            ? {
                ...current,
                delivery_status:
                  data.delivery_status ||
                  "ready_for_delivery",
              }
            : null
      );

      setMessage(
        "Food collected successfully. You can now start the delivery."
      );
    } catch (error) {
      console.error(
        "COLLECT FOOD ERROR:",
        error
      );

      alert(
        error.message ||
          "Unable to confirm food collection."
      );
    } finally {
      setCollectingId(null);
    }
  }

  // =====================================================
  // START DELIVERY
  // =====================================================

  async function startDelivery(delivery) {
    setStartingId(
      delivery.delivery_id
    );

    setMessage("");

    try {
      const response = await fetch(
        "/api/delivery/start",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            delivery_id:
              delivery.delivery_id,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to start delivery."
        );
      }

      setMessage(
        "Delivery started. You are now out for delivery."
      );

      await loadDeliveries(false);

      setSelectedDelivery(
        (previous) =>
          previous
            ? {
                ...previous,
                delivery_status:
                  "out_for_delivery",
              }
            : null
      );
    } catch (error) {
      console.error(
        "START DELIVERY ERROR:",
        error
      );

      alert(
        error.message ||
          "Unable to start delivery."
      );
    } finally {
      setStartingId(null);
    }
  }

  // =====================================================
  // PHOTO
  // =====================================================

  function handlePhotoChange(event) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert(
        "Please select an image."
      );

      event.target.value = "";
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      alert(
        "Delivery photo must be smaller than 5 MB."
      );

      event.target.value = "";
      return;
    }

    setPhoto(file);

    const preview =
      URL.createObjectURL(file);

    setPhotoPreview(preview);
  }

  // =====================================================
  // COMPLETE DELIVERY
  // =====================================================

  async function completeDelivery() {
    if (!selectedDelivery) {
      return;
    }

    if (!photo) {
      alert(
        "Please take or upload a delivery photo first."
      );

      return;
    }

    setCompleting(true);

    try {
      const formData =
        new FormData();

      formData.append(
        "delivery_id",
        String(
          selectedDelivery.delivery_id
        )
      );

      formData.append(
        "photo",
        photo
      );

      const response =
        await fetch(
          "/api/delivery/complete",
          {
            method: "POST",
            body: formData,
          }
        );

      // IMPORTANT:
      // Read as text first.
      // This prevents:
      // Unexpected end of JSON input
      const text =
        await response.text();

      let data = {};

      try {
        data = text
          ? JSON.parse(text)
          : {};
      } catch {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Unable to complete delivery."
        );
      }

      setMessage(
        "Delivery completed successfully."
      );

      setSelectedDelivery(null);

      setPhoto(null);
      setPhotoPreview("");
      setQrImage("");

      await loadDeliveries(false);
    } catch (error) {
      console.error(
        "COMPLETE DELIVERY ERROR:",
        error
      );

      alert(
        error.message ||
          "Unable to complete delivery."
      );
    } finally {
      setCompleting(false);
    }
  }

  // =====================================================
  // STATUS LABEL
  // =====================================================

  function getStatusLabel(status) {
    switch (status) {
      case "waiting":
        return "Waiting";

      case "collecting":
        return "Collecting Food";

      case "ready_for_delivery":
        return "Ready for Delivery";

      case "out_for_delivery":
        return "Out for Delivery";

      case "delivered":
        return "Delivered";

      case "cancelled":
        return "Cancelled";

      default:
        return status || "Unknown";
    }
  }

  // =====================================================
  // STATUS STYLE
  // =====================================================

  function getStatusStyle(status) {
    switch (status) {
      case "ready_for_delivery":
        return "bg-indigo-50 text-indigo-600";

      case "collecting":
        return "bg-amber-50 text-amber-600";

      case "out_for_delivery":
        return "bg-purple-50 text-purple-600";

      case "delivered":
        return "bg-green-50 text-green-600";

      case "cancelled":
        return "bg-red-50 text-red-600";

      default:
        return "bg-gray-100 text-gray-600";
    }
  }

  // =====================================================
  // CLOSE MODAL
  // =====================================================

  function closeDelivery() {
    setSelectedDelivery(null);
    setPhoto(null);
    setPhotoPreview("");
    setQrImage("");
  }

  // =====================================================
  // GET ALL SHOPS
  // =====================================================

  function getShops(delivery) {
    if (
      Array.isArray(delivery?.shops) &&
      delivery.shops.length > 0
    ) {
      return delivery.shops;
    }

    if (
      Array.isArray(delivery?.orders) &&
      delivery.orders.length > 0
    ) {
      return delivery.orders.map(
        (order) => ({
          order_id:
            order.order_id,

          shop_name:
            order.shop_name ||
            order.food_court_name ||
            "Food Court",

          shop_location:
            order.shop_location ||
            "",

          order_status:
            order.order_status ||
            "ready",

          pickup_status:
            order.pickup_status ||
            "pending",

          total_amount:
            Number(
              order.total_amount || 0
            ),

          items:
            order.items || [],
        })
      );
    }

    return [
      {
        order_id:
          delivery?.order_id,

        shop_name:
          delivery?.shop_name ||
          delivery?.food_court_name ||
          "Food Court",

        shop_location:
          delivery?.shop_location ||
          "",

        order_status:
          delivery?.order_status ||
          "ready",

        pickup_status:
          delivery?.pickup_status ||
          "pending",

        total_amount:
          Number(
            delivery?.total_amount || 0
          ),

        items:
          delivery?.items || [],
      },
    ];
  }

  // =====================================================
  // DELIVERY CARD
  // =====================================================

  function DeliveryCard({
    delivery,
  }) {
    const status =
      delivery.delivery_status;

    const isReady =
      status ===
      "ready_for_delivery";

    const isCollecting =
      status === "collecting";

    const isOutForDelivery =
      status ===
      "out_for_delivery";

    const isUnclaimed =
      !delivery.delivery_person_id;

    const isStarting =
      startingId ===
      delivery.delivery_id;

    const shops =
      getShops(delivery);

    return (
      <div className="bg-white rounded-2xl border border-[#e1e5eb] shadow-sm overflow-hidden">

        {/* HEADER */}

        <div className="px-7 pt-6">
          <div className="flex items-start justify-between gap-4">

            <div>
              <div className="text-sm text-[#8ba0bd] uppercase">
                Delivery
              </div>

              <div className="text-2xl font-bold mt-1">
                #
                {delivery.delivery_id}
              </div>
            </div>

            <span
              className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusStyle(
                status
              )}`}
            >
              {getStatusLabel(status)}
            </span>

          </div>
        </div>

        <div className="px-7 py-5">

          <div className="border-t border-[#edf0f4] pt-5">

            {/* CUSTOMER */}

            <div className="mb-5">

              <div className="text-sm text-[#8ba0bd] mb-1">
                Customer
              </div>

              <div className="text-lg text-[#55708d]">
                {delivery.student_name ||
                  delivery.customer_name ||
                  "Customer"}
              </div>

              <div className="text-lg text-[#55708d]">
                {delivery.delivery_phone ||
                  delivery.student_phone ||
                  "No phone number"}
              </div>

            </div>

            {/* LOCATION */}

            <div className="mb-5">

              <div className="text-sm text-[#8ba0bd] mb-1">
                Delivery Location
              </div>

              <div className="text-lg">
                {delivery.building_number ||
                  "No location"}
              </div>

            </div>

            {/* ALL SHOPS */}

            <div>

              <div className="text-sm font-bold text-[#8ba0bd] uppercase mb-2">
                Pickup From
              </div>

              <div className="space-y-2">

                {shops.map(
                  (shop, index) => (
                    <div
                      key={
                        shop.order_id ||
                        `${delivery.delivery_id}-${index}`
                      }
                      className="rounded-xl border border-[#dce3ec] bg-[#f8fafc] p-4"
                    >

                      <div className="text-xs text-[#8ba0bd] uppercase">
                        Shop {index + 1}
                      </div>

                      <div className="font-bold text-lg">
                        {shop.shop_name}
                      </div>

                    </div>
                  )
                )}

              </div>

            </div>

          </div>

          {/* TOTAL */}

          <div className="border-t border-[#edf0f4] mt-6 pt-5 flex justify-between">

            <span className="text-lg text-[#55708d]">
              Total
            </span>

            <span className="text-2xl font-bold">
              ฿
              {Number(
                delivery.total_amount ||
                  delivery.total ||
                  0
              ).toFixed(2)}
            </span>

          </div>

          {/* NOTE */}

          {delivery.delivery_note && (
            <div className="mt-4 rounded-xl bg-[#faf7f2] p-4">

              <div className="text-xs font-bold text-gray-400 uppercase">
                Delivery Note
              </div>

              <div className="text-sm mt-1">
                {delivery.delivery_note}
              </div>

            </div>
          )}

        </div>

        {/* ACTIONS */}

        <div className="px-7 pb-7 space-y-3">

          {/* UNCLAIMED */}

          {isReady &&
            isUnclaimed && (
              <button
                type="button"
                onClick={() =>
                  openDelivery(
                    delivery
                  )
                }
                className="w-full rounded-xl bg-[#111827] text-white py-3.5 font-semibold hover:bg-[#1f2937]"
              >
                View Delivery
              </button>
            )}

          {/* CLAIMED */}

          {isCollecting && (
            <button
              type="button"
              onClick={() =>
                openDelivery(
                  delivery
                )
              }
              className="w-full rounded-xl bg-[#111827] text-white py-3.5 font-semibold hover:bg-[#1f2937]"
            >
              View Pickup & QR
            </button>
          )}

          {/* READY AFTER COLLECTION */}

          {isReady &&
            !isUnclaimed && (
              <>
                <button
                  type="button"
                  disabled={
                    isStarting
                  }
                  onClick={() =>
                    startDelivery(
                      delivery
                    )
                  }
                  className="w-full rounded-xl bg-[#111827] text-white py-3.5 font-semibold hover:bg-[#1f2937] disabled:opacity-50"
                >
                  {isStarting
                    ? "Starting Delivery..."
                    : "🚚 Start Delivery"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openDelivery(
                      delivery
                    )
                  }
                  className="w-full rounded-xl border border-[#ccd6e2] bg-white py-3.5 font-semibold hover:bg-gray-50"
                >
                  View Delivery
                </button>
              </>
            )}

          {/* OUT FOR DELIVERY */}

          {isOutForDelivery && (
            <button
              type="button"
              onClick={() =>
                openDelivery(
                  delivery
                )
              }
              className="w-full rounded-xl border border-[#ccd6e2] bg-white py-3.5 font-semibold hover:bg-gray-50"
            >
              View Delivery & Proof
            </button>
          )}

        </div>

      </div>
    );
  }

  const selectedShops =
    selectedDelivery
      ? getShops(selectedDelivery)
      : [];

  // =====================================================
  // MAIN PAGE
  // =====================================================

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-[#111827]">

      {/* HEADER */}

      <header className="bg-white border-b border-[#e1e5eb]">

        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">

          <div>

            <h1 className="text-3xl font-bold">
              Delivery Dashboard
            </h1>

            <p className="text-[#55708d] mt-1">
              Manage your assigned food deliveries
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/")
            }
            className="rounded-xl border border-[#ccd6e2] bg-white px-6 py-3 font-semibold hover:bg-gray-50"
          >
            Home
          </button>

        </div>

      </header>

      {/* CONTENT */}

      <section className="mx-auto max-w-6xl px-6 py-10">

        {message && (
          <div className="mb-8 rounded-xl border border-green-200 bg-green-50 px-6 py-4 text-green-700">
            {message}
          </div>
        )}

        <div className="mb-8">

          <h2 className="text-4xl font-bold">
            My Deliveries
          </h2>

          <p className="text-[#55708d] text-lg mt-2">
            Available and assigned delivery orders
          </p>

        </div>

        {loading ? (

          <div className="bg-white rounded-2xl border p-12 text-center">

            <div className="animate-spin mx-auto w-8 h-8 border-4 border-gray-200 border-t-[#111827] rounded-full" />

            <p className="mt-4 text-gray-500">
              Loading deliveries...
            </p>

          </div>

        ) : deliveries.length === 0 ? (

          <div className="bg-white rounded-2xl border p-12 text-center">

            <div className="text-5xl mb-4">
              🚚
            </div>

            <h3 className="text-xl font-bold">
              No deliveries available
            </h3>

            <p className="text-gray-500 mt-2">
              New delivery orders will appear here.
            </p>

          </div>

        ) : (

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {deliveries.map(
              (delivery) => (
                <DeliveryCard
                  key={
                    delivery.delivery_id
                  }
                  delivery={
                    delivery
                  }
                />
              )
            )}

          </div>

        )}

      </section>

      {/* =====================================================
          DELIVERY MODAL
      ===================================================== */}

      {selectedDelivery && (

        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

          <div className="bg-white w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl">

            {/* HEADER */}

            <div className="sticky top-0 z-20 bg-white border-b px-7 py-5 flex items-center justify-between">

              <div>

                <div className="text-sm text-[#8ba0bd] uppercase">
                  Delivery
                </div>

                <h2 className="text-3xl font-bold">
                  Checkout #
                  {
                    selectedDelivery.checkout_id
                  }
                </h2>

              </div>

              <button
                type="button"
                onClick={
                  closeDelivery
                }
                className="text-3xl text-gray-400 hover:text-black"
              >
                ×
              </button>

            </div>

            <div className="p-7 space-y-7">

              {/* STATUS */}

              <div className="rounded-2xl border border-[#dce3ec] p-6">

                <div className="text-sm text-[#8ba0bd] uppercase mb-3">
                  Delivery Status
                </div>

                <span
                  className={`inline-block px-5 py-2 rounded-full font-bold ${getStatusStyle(
                    selectedDelivery.delivery_status
                  )}`}
                >
                  {getStatusLabel(
                    selectedDelivery.delivery_status
                  )}
                </span>

              </div>

              {/* CUSTOMER */}

              <div className="rounded-2xl bg-[#f7f9fc] p-6">

                <div className="text-sm text-[#8ba0bd] uppercase">
                  Deliver To
                </div>

                <div className="text-xl mt-2 font-semibold">
                  {
                    selectedDelivery.student_name ||
                    selectedDelivery.customer_name ||
                    "Customer"
                  }
                </div>

                <div className="text-xl text-[#55708d] mt-1">
                  {
                    selectedDelivery.delivery_phone ||
                    selectedDelivery.student_phone ||
                    "No phone number"
                  }
                </div>

                <div className="border-t border-[#dce3ec] mt-5 pt-5">

                  <div className="text-sm text-[#8ba0bd]">
                    Location
                  </div>

                  <div className="text-2xl font-bold mt-2">
                    {
                      selectedDelivery.building_number ||
                      "No location"
                    }
                  </div>

                </div>

                {selectedDelivery.delivery_note && (
                  <div className="mt-5">

                    <div className="text-sm text-[#8ba0bd]">
                      Delivery Note
                    </div>

                    <div className="text-lg text-[#55708d] mt-1">
                      {
                        selectedDelivery.delivery_note
                      }
                    </div>

                  </div>
                )}

              </div>

              {/* ALL SHOPS */}

              <div>

                <div className="text-sm font-bold text-[#8ba0bd] uppercase mb-4">
                  Pickup From
                </div>

                <div className="space-y-5">

                  {selectedShops.map(
                    (shop, index) => (

                      <div
                        key={
                          shop.order_id ||
                          `${selectedDelivery.delivery_id}-${index}`
                        }
                        className="rounded-2xl border border-[#dce3ec] bg-[#f8fafc] p-6"
                      >

                        <div className="flex items-start justify-between gap-4">

                          <div>

                            <div className="text-xs text-[#8ba0bd] uppercase">
                              Shop{" "}
                              {index + 1}
                            </div>

                            <div className="text-2xl font-bold mt-1">
                              {
                                shop.shop_name
                              }
                            </div>

                            {shop.shop_location && (
                              <div className="text-sm text-[#64748b] mt-1">
                                {
                                  shop.shop_location
                                }
                              </div>
                            )}

                          </div>

                          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-[#dce3ec]">
                            {
                              shop.pickup_status ===
                              "collected"
                                ? "Collected"
                                : shop.order_status ||
                                  "Ready"
                            }
                          </span>

                        </div>

                        <div className="mt-5">

                          {shop.items?.map(
                            (item) => (

                              <div
                                key={
                                  item.order_item_id
                                }
                                className="flex justify-between gap-4 py-3 border-t border-[#dce3ec]"
                              >

                                <div>

                                  <div className="font-bold">
                                    {
                                      item.menu_name
                                    }
                                  </div>

                                  <div className="text-sm text-gray-500">
                                    Quantity:{" "}
                                    {
                                      item.quantity
                                    }
                                  </div>

                                </div>

                                <div className="font-bold">
                                  ฿
                                  {Number(
                                    item.subtotal ||
                                      0
                                  ).toFixed(2)}
                                </div>

                              </div>

                            )
                          )}

                        </div>

                        <div className="flex justify-between border-t border-[#dce3ec] pt-4 mt-2">

                          <span className="text-[#64748b]">
                            Shop Total
                          </span>

                          <span className="font-bold">
                            ฿
                            {Number(
                              shop.total_amount ||
                                0
                            ).toFixed(2)}
                          </span>

                        </div>

                      </div>

                    )
                  )}

                </div>

              </div>

              {/* QR CODE */}

              {selectedDelivery.qr_token &&
                selectedDelivery.delivery_status ===
                  "collecting" && (

                <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6 text-center">

                  <div className="text-sm font-bold text-indigo-700 uppercase">
                    Pickup QR Code
                  </div>

                  <h3 className="text-xl font-bold text-indigo-900 mt-2">
                    Show this QR code to the shop
                  </h3>

                  <p className="text-sm text-indigo-700 mt-2">
                    Use the same QR code when collecting
                    the food from each shop.
                  </p>

                  {qrImage ? (

                    <div className="mt-5 flex justify-center">

                      <div className="bg-white rounded-2xl p-4 border border-indigo-100">

                        <img
                          src={qrImage}
                          alt="Pickup QR Code"
                          className="w-[280px] h-[280px]"
                        />

                      </div>

                    </div>

                  ) : (

                    <div className="mt-5 rounded-xl bg-white p-6 text-gray-500">
                      Creating QR code...
                    </div>

                  )}

                  <div className="mt-5 bg-white rounded-xl p-4 text-left">

                    <div className="font-bold text-gray-800">
                      Pickup instructions
                    </div>

                    <ol className="mt-2 space-y-1 text-sm text-gray-600">

                      <li>
                        1. Go to the shop shown above.
                      </li>

                      <li>
                        2. Show this QR code to the shop owner.
                      </li>

                      <li>
                        3. Shop owner scans the QR.
                      </li>

                      <li>
                        4. Shop owner confirms the pickup.
                      </li>

                      <li>
                        5. Repeat for every shop.
                      </li>

                    </ol>

                  </div>

                </div>

              )}

              {/* CLAIM */}

              {selectedDelivery.delivery_status ===
                "ready_for_delivery" &&
                !selectedDelivery.delivery_person_id && (

                <button
                  type="button"
                  disabled={
                    claimingId ===
                    selectedDelivery.delivery_id
                  }
                  onClick={() =>
                    claimDelivery(
                      selectedDelivery
                    )
                  }
                  className="w-full rounded-xl bg-[#111827] text-white py-4 font-bold text-lg hover:bg-[#1f2937] disabled:opacity-50"
                >
                  {claimingId ===
                  selectedDelivery.delivery_id
                    ? "Claiming..."
                    : "✓ Claim This Delivery"}
                </button>

              )}

              {/* COLLECTING */}

              {selectedDelivery.delivery_status ===
                "collecting" && (

                <div className="space-y-4">

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">

                    <h3 className="text-xl font-bold text-amber-800">
                      Collecting Food
                    </h3>

                    <p className="text-amber-700 mt-2">
                      Visit every shop above and show the
                      QR code to the shop owner.
                    </p>

                  </div>

                  <button
                    type="button"
                    disabled={
                      collectingId ===
                      selectedDelivery.delivery_id
                    }
                    onClick={() =>
                      collectFood(
                        selectedDelivery
                      )
                    }
                    className="w-full rounded-xl bg-[#111827] text-white py-4 font-bold text-lg hover:bg-[#1f2937] disabled:opacity-50"
                  >
                    {collectingId ===
                    selectedDelivery.delivery_id
                      ? "Confirming..."
                      : "✓ Food Collected"}
                  </button>

                </div>

              )}

              {/* READY AFTER COLLECTION */}

              {selectedDelivery.delivery_status ===
                "ready_for_delivery" &&
                selectedDelivery.delivery_person_id && (

                <div className="space-y-4">

                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6">

                    <h3 className="text-xl font-bold text-indigo-800">
                      Food Collected
                    </h3>

                    <p className="text-indigo-700 mt-2">
                      All food has been collected. You
                      can now start the delivery.
                    </p>

                  </div>

                  <button
                    type="button"
                    disabled={
                      startingId ===
                      selectedDelivery.delivery_id
                    }
                    onClick={() =>
                      startDelivery(
                        selectedDelivery
                      )
                    }
                    className="w-full rounded-xl bg-[#111827] text-white py-4 font-bold text-lg hover:bg-[#1f2937] disabled:opacity-50"
                  >
                    {startingId ===
                    selectedDelivery.delivery_id
                      ? "Starting Delivery..."
                      : "🚚 Start Delivery"}
                  </button>

                </div>

              )}

              {/* OUT FOR DELIVERY */}

              {selectedDelivery.delivery_status ===
                "out_for_delivery" && (

                <>

                  <div className="rounded-2xl border border-purple-200 bg-purple-50 p-6">

                    <h3 className="text-xl font-bold text-purple-800">
                      Out for Delivery
                    </h3>

                    <p className="text-purple-700 mt-2">
                      Take the order to the customer's
                      delivery location.
                    </p>

                  </div>

                  {/* DELIVERY PROOF */}

                  <div className="rounded-2xl border border-[#dce3ec] p-6">

                    <div className="text-sm font-bold text-[#8ba0bd] uppercase mb-2">
                      Delivery Proof
                    </div>

                    <h3 className="text-xl font-bold">
                      Take a photo
                    </h3>

                    <p className="text-gray-500 text-sm mt-1 mb-4">
                      Take a photo of the parcel at the
                      customer's delivery location.
                    </p>

                    <label className="block cursor-pointer">

                      <div className="rounded-xl border-2 border-dashed border-[#cbd5e1] bg-[#f8fafc] p-6 text-center hover:bg-gray-50">

                        <div className="text-4xl mb-2">
                          📸
                        </div>

                        <div className="font-semibold">
                          Choose / Take Photo
                        </div>

                        <div className="text-xs text-gray-500 mt-1">
                          JPG, PNG or WEBP · Max 5 MB
                        </div>

                      </div>

                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={
                          handlePhotoChange
                        }
                        className="hidden"
                      />

                    </label>

                    {photoPreview && (

                      <div className="mt-5">

                        <div className="text-sm font-semibold mb-2">
                          Photo Preview
                        </div>

                        <img
                          src={photoPreview}
                          alt="Delivery preview"
                          className="w-full max-h-80 object-contain rounded-xl bg-gray-100"
                        />

                      </div>

                    )}

                    <button
                      type="button"
                      disabled={
                        completing ||
                        !photo
                      }
                      onClick={
                        completeDelivery
                      }
                      className="w-full mt-5 rounded-xl bg-green-600 text-white py-4 font-bold text-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {completing
                        ? "Confirming Delivery..."
                        : "✓ Confirm Delivered"}
                    </button>

                  </div>

                </>

              )}

            </div>

            <div className="border-t px-7 py-5">

              <button
                type="button"
                onClick={
                  closeDelivery
                }
                className="w-full rounded-xl border border-[#ccd6e2] bg-white py-3.5 font-semibold hover:bg-gray-50"
              >
                Close
              </button>

            </div>

          </div>

        </div>

      )}

    </main>
  );
}