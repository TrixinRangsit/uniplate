"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";

// Source: current delivery dashboard functionality and API workflow.
// :contentReference[oaicite:0]{index=0}

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

  const [activeFilter, setActiveFilter] = useState("all");

  // ============================================================
  // LOAD DELIVERIES
  // ============================================================

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

  // ============================================================
  // INITIAL LOAD + AUTO REFRESH
  // ============================================================

  useEffect(() => {
    loadDeliveries();

    const interval = setInterval(() => {
      loadDeliveries(false);
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // ============================================================
  // OPEN DELIVERY
  // ============================================================

  async function openDelivery(delivery) {
    setSelectedDelivery(delivery);
    setPhoto(null);
    setPhotoPreview("");
    setQrImage("");

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

  // ============================================================
  // CLAIM DELIVERY
  // ============================================================

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

  // ============================================================
  // COLLECT FOOD
  // ============================================================

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

      setMessage(
        error.message ||
          "Unable to confirm food collection."
      );
    } finally {
      setCollectingId(null);
    }
  }

  // ============================================================
  // START DELIVERY
  // ============================================================

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

      setMessage(
        error.message ||
          "Unable to start delivery."
      );
    } finally {
      setStartingId(null);
    }
  }

  // ============================================================
  // PHOTO
  // ============================================================

  function handlePhotoChange(event) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage(
        "Please select an image."
      );
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage(
        "Delivery photo must be smaller than 5 MB."
      );
      event.target.value = "";
      return;
    }

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhoto(file);

    const preview =
      URL.createObjectURL(file);

    setPhotoPreview(preview);
  }

  // ============================================================
  // COMPLETE DELIVERY
  // ============================================================

  async function completeDelivery() {
    if (!selectedDelivery) {
      return;
    }

    if (!photo) {
      setMessage(
        "Please take or upload a delivery photo first."
      );
      return;
    }

    setCompleting(true);
    setMessage("");

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

      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }

      setPhoto(null);
      setPhotoPreview("");
      setQrImage("");

      await loadDeliveries(false);
    } catch (error) {
      console.error(
        "COMPLETE DELIVERY ERROR:",
        error
      );

      setMessage(
        error.message ||
          "Unable to complete delivery."
      );
    } finally {
      setCompleting(false);
    }
  }

  // ============================================================
  // CLOSE MODAL
  // ============================================================

  function closeDelivery() {
    setSelectedDelivery(null);

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhoto(null);
    setPhotoPreview("");
    setQrImage("");
  }

  // ============================================================
  // STATUS
  // ============================================================

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

  function getStatusStyle(status) {
    switch (status) {
      case "waiting":
        return {
          badge:
            "bg-[#f4f1ed] text-[#6f6861] border-[#e4ddd5]",
          dot: "bg-[#8b837b]",
        };

      case "collecting":
        return {
          badge:
            "bg-[#fff6e7] text-[#a66a00] border-[#f1dfb8]",
          dot: "bg-[#d58b16]",
        };

      case "ready_for_delivery":
        return {
          badge:
            "bg-[#fff0e5] text-[#c75e16] border-[#f2d5bf]",
          dot: "bg-[#e87524]",
        };

      case "out_for_delivery":
        return {
          badge:
            "bg-[#f0ecff] text-[#6f58a5] border-[#ded6f6]",
          dot: "bg-[#735bb1]",
        };

      case "delivered":
        return {
          badge:
            "bg-[#edf7ef] text-[#347a43] border-[#d4e9d8]",
          dot: "bg-[#4b9659]",
        };

      case "cancelled":
        return {
          badge:
            "bg-[#fff0ef] text-[#b8443d] border-[#efd2cf]",
          dot: "bg-[#c95750]",
        };

      default:
        return {
          badge:
            "bg-[#f4f1ed] text-[#6f6861] border-[#e4ddd5]",
          dot: "bg-[#8b837b]",
        };
    }
  }

  // ============================================================
  // GET SHOPS
  // ============================================================

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

  // ============================================================
  // FILTERED DELIVERIES
  // ============================================================

  const filteredDeliveries = useMemo(() => {
    if (activeFilter === "all") {
      return deliveries;
    }

    if (activeFilter === "available") {
      return deliveries.filter(
        (delivery) =>
          delivery.delivery_status ===
            "ready_for_delivery" &&
          !delivery.delivery_person_id
      );
    }

    if (activeFilter === "active") {
      return deliveries.filter(
        (delivery) =>
          delivery.delivery_person_id &&
          [
            "collecting",
            "ready_for_delivery",
            "out_for_delivery",
          ].includes(
            delivery.delivery_status
          )
      );
    }

    if (activeFilter === "completed") {
      return deliveries.filter(
        (delivery) =>
          delivery.delivery_status ===
          "delivered"
      );
    }

    return deliveries;
  }, [deliveries, activeFilter]);

  const stats = useMemo(() => {
    const available =
      deliveries.filter(
        (delivery) =>
          delivery.delivery_status ===
            "ready_for_delivery" &&
          !delivery.delivery_person_id
      ).length;

    const active =
      deliveries.filter(
        (delivery) =>
          delivery.delivery_person_id &&
          [
            "collecting",
            "ready_for_delivery",
            "out_for_delivery",
          ].includes(
            delivery.delivery_status
          )
      ).length;

    const completed =
      deliveries.filter(
        (delivery) =>
          delivery.delivery_status ===
          "delivered"
      ).length;

    return {
      total: deliveries.length,
      available,
      active,
      completed,
    };
  }, [deliveries]);

  // ============================================================
  // DELIVERY CARD
  // ============================================================

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

    const isClaiming =
      claimingId ===
      delivery.delivery_id;

    const shops =
      getShops(delivery);

    const statusStyle =
      getStatusStyle(status);

    return (
      <article className="group bg-white border border-[#e8e2da] rounded-[22px] overflow-hidden shadow-[0_5px_24px_rgba(33,30,26,0.045)] hover:shadow-[0_12px_35px_rgba(33,30,26,0.08)] transition duration-300">

        {/* CARD TOP */}

        <div className="px-5 sm:px-6 pt-5 sm:pt-6">
          <div className="flex items-start justify-between gap-4">

            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#e87524]">
                Delivery
              </p>

              <h3 className="text-2xl font-bold tracking-[-0.04em] mt-1">
                #{delivery.delivery_id}
              </h3>
            </div>

            <StatusBadge
              status={status}
              style={statusStyle}
            />
          </div>
        </div>

        {/* CUSTOMER */}

        <div className="px-5 sm:px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <InfoBlock
              label="Customer"
              value={
                delivery.student_name ||
                delivery.customer_name ||
                "Customer"
              }
              secondary={
                delivery.delivery_phone ||
                delivery.student_phone ||
                "No phone number"
              }
            />

            <InfoBlock
              label="Delivery Location"
              value={
                delivery.building_number ||
                "No location"
              }
            />
          </div>

          {/* PICKUP */}

          <div className="mt-5 pt-5 border-t border-[#eee9e3]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-[#958d84]">
                Pickup From
              </p>

              <span className="text-xs text-[#aaa29a]">
                {shops.length}{" "}
                {shops.length === 1
                  ? "shop"
                  : "shops"}
              </span>
            </div>

            <div className="space-y-2">
              {shops.map(
                (shop, index) => (
                  <div
                    key={
                      shop.order_id ||
                      `${delivery.delivery_id}-${index}`
                    }
                    className="flex items-center gap-3 rounded-xl bg-[#faf8f5] border border-[#eee9e3] px-3.5 py-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#211e1a] text-white flex items-center justify-center shrink-0">
                      <StoreIcon size={15} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-[#aaa29a]">
                        Shop {index + 1}
                      </p>

                      <p className="font-semibold text-sm truncate">
                        {shop.shop_name}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* TOTAL */}

          <div className="mt-5 pt-5 border-t border-[#eee9e3] flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#958d84]">
                Order Total
              </p>

              <p className="text-xs text-[#aaa29a] mt-1">
                Customer order
              </p>
            </div>

            <p className="text-2xl font-bold tracking-[-0.04em]">
              ฿
              {Number(
                delivery.total_amount ||
                  delivery.total ||
                  0
              ).toFixed(2)}
            </p>
          </div>

          {/* NOTE */}

          {delivery.delivery_note && (
            <div className="mt-4 rounded-xl bg-[#fff7ee] border border-[#f2dfc9] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.12em] font-bold text-[#a66a00]">
                Delivery Note
              </p>

              <p className="text-sm text-[#625c55] mt-1 leading-5">
                {delivery.delivery_note}
              </p>
            </div>
          )}
        </div>

        {/* ACTIONS */}

        <div className="px-5 sm:px-6 pb-5 sm:pb-6">
          {isReady && isUnclaimed && (
            <button
              type="button"
              onClick={() =>
                openDelivery(delivery)
              }
              className="w-full h-11 rounded-xl bg-[#211e1a] text-white text-sm font-semibold hover:bg-[#e87524] transition flex items-center justify-center gap-2"
            >
              View Delivery
              <ArrowIcon size={16} />
            </button>
          )}

          {isCollecting && (
            <button
              type="button"
              onClick={() =>
                openDelivery(delivery)
              }
              className="w-full h-11 rounded-xl bg-[#211e1a] text-white text-sm font-semibold hover:bg-[#e87524] transition flex items-center justify-center gap-2"
            >
              View Pickup & QR
              <ArrowIcon size={16} />
            </button>
          )}

          {isReady && !isUnclaimed && (
            <div className="space-y-2.5">
              <button
                type="button"
                disabled={isStarting}
                onClick={() =>
                  startDelivery(delivery)
                }
                className="w-full h-11 rounded-xl bg-[#211e1a] text-white text-sm font-semibold hover:bg-[#e87524] transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <TruckIcon size={17} />

                {isStarting
                  ? "Starting Delivery..."
                  : "Start Delivery"}
              </button>

              <button
                type="button"
                onClick={() =>
                  openDelivery(delivery)
                }
                className="w-full h-11 rounded-xl border border-[#ded8d0] bg-white text-[#4e4842] text-sm font-semibold hover:bg-[#f8f5f0] transition"
              >
                View Delivery
              </button>
            </div>
          )}

          {isOutForDelivery && (
            <button
              type="button"
              onClick={() =>
                openDelivery(delivery)
              }
              className="w-full h-11 rounded-xl bg-[#211e1a] text-white text-sm font-semibold hover:bg-[#e87524] transition flex items-center justify-center gap-2"
            >
              View Delivery & Proof
              <ArrowIcon size={16} />
            </button>
          )}
        </div>
      </article>
    );
  }

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f5f0] flex items-center justify-center">
        <div className="text-center px-5">
          <div className="w-10 h-10 border-[3px] border-[#ded8d0] border-t-[#e87524] rounded-full animate-spin mx-auto" />

          <p className="text-sm font-semibold text-[#625c55] mt-4">
            Loading delivery dashboard...
          </p>

          <p className="text-xs text-[#9a9289] mt-1">
            Checking available deliveries
          </p>
        </div>
      </main>
    );
  }

  const selectedShops =
    selectedDelivery
      ? getShops(selectedDelivery)
      : [];

  return (
    <main className="min-h-screen bg-[#f8f5f0] text-[#211e1a]">

      {/* ========================================================
          HEADER
      ======================================================== */}

      <header className="sticky top-0 z-40 bg-[#f8f5f0]/95 backdrop-blur-md border-b border-[#e8e2da]">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8">
          <div className="h-[72px] flex items-center justify-between gap-4">

            <div className="flex items-center gap-4 min-w-0">

              <button
                type="button"
                onClick={() =>
                  router.push("/")
                }
                className="hidden sm:flex items-center gap-2 text-sm text-[#756e66] hover:text-[#211e1a] transition"
              >
                <span className="text-lg">
                  ←
                </span>
                Back
              </button>

              <div className="hidden sm:block w-px h-7 bg-[#ddd7cf]" />

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#211e1a] text-white flex items-center justify-center font-bold">
                  U
                </div>

                <div>
                  <p className="font-bold tracking-tight">
                    UniPlate
                  </p>

                  <p className="text-[10px] uppercase tracking-[0.16em] text-[#8b837b]">
                    Delivery
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">

              <div className="hidden sm:block text-right mr-2">
                <p className="text-sm font-semibold">
                  Delivery Partner
                </p>

                <p className="text-[11px] text-[#958d84]">
                  Delivery Dashboard
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push("/")
                }
                className="h-10 px-3 sm:px-4 rounded-xl border border-[#ded8d0] bg-white hover:bg-[#211e1a] hover:text-white transition text-sm font-medium"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================
          CONTENT
      ======================================================== */}

      <section className="max-w-[1440px] mx-auto px-5 sm:px-8 py-7 sm:py-9">

        {/* INTRO */}

        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.18em] text-[#e87524] font-bold mb-2">
            Delivery Center
          </p>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">

            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-[-0.045em]">
                Your deliveries.
              </h1>

              <p className="text-[#756e66] text-sm sm:text-[15px] mt-2">
                Pick up orders, deliver them safely, and
                keep customers updated.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                loadDeliveries()
              }
              className="self-start lg:self-auto h-10 px-4 rounded-xl border border-[#ded8d0] bg-white hover:bg-[#211e1a] hover:text-white transition text-sm font-semibold flex items-center gap-2"
            >
              <RefreshIcon size={16} />
              Refresh
            </button>
          </div>
        </div>

        {/* MESSAGE */}

        {message && (
          <div className="mb-6 bg-white border border-[#e4ddd5] rounded-2xl px-4 py-3.5 flex items-start gap-3 shadow-[0_4px_18px_rgba(33,30,26,0.04)]">

            <div className="w-7 h-7 rounded-full bg-[#fff1e6] text-[#e87524] flex items-center justify-center shrink-0">
              <InfoIcon size={15} />
            </div>

            <p className="text-sm font-medium text-[#4e4842] flex-1 pt-1">
              {message}
            </p>

            <button
              type="button"
              onClick={() =>
                setMessage("")
              }
              className="text-[#aaa29a] hover:text-[#211e1a]"
            >
              <CloseIcon size={17} />
            </button>
          </div>
        )}

        {/* ======================================================
            STATISTICS
        ====================================================== */}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">

          <StatCard
            label="All Deliveries"
            value={stats.total}
            icon={<PackageIcon size={19} />}
          />

          <StatCard
            label="Available"
            value={stats.available}
            icon={<StoreIcon size={19} />}
            accent
          />

          <StatCard
            label="Active"
            value={stats.active}
            icon={<TruckIcon size={19} />}
          />

          <StatCard
            label="Completed"
            value={stats.completed}
            icon={<CheckIcon size={19} />}
          />
        </div>

        {/* ======================================================
            FILTERS
        ====================================================== */}

        <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-7">

          <FilterButton
            active={
              activeFilter === "all"
            }
            onClick={() =>
              setActiveFilter("all")
            }
          >
            All
          </FilterButton>

          <FilterButton
            active={
              activeFilter === "available"
            }
            onClick={() =>
              setActiveFilter("available")
            }
          >
            Available
            {stats.available > 0 && (
              <span className="ml-2 min-w-5 h-5 px-1.5 rounded-full bg-[#e87524] text-white text-[10px] inline-flex items-center justify-center">
                {stats.available}
              </span>
            )}
          </FilterButton>

          <FilterButton
            active={
              activeFilter === "active"
            }
            onClick={() =>
              setActiveFilter("active")
            }
          >
            My Active
          </FilterButton>

          <FilterButton
            active={
              activeFilter === "completed"
            }
            onClick={() =>
              setActiveFilter("completed")
            }
          >
            Completed
          </FilterButton>
        </div>

        {/* ======================================================
            DELIVERY LIST
        ====================================================== */}

        {filteredDeliveries.length === 0 ? (
          <div className="bg-white border border-[#e8e2da] rounded-[24px] p-10 sm:p-16 text-center shadow-[0_5px_24px_rgba(33,30,26,0.035)]">

            <div className="w-16 h-16 rounded-2xl bg-[#f5f1ec] text-[#aaa29a] mx-auto flex items-center justify-center">
              <TruckIcon size={27} />
            </div>

            <h3 className="text-xl font-bold mt-5">
              No deliveries here
            </h3>

            <p className="text-sm text-[#8b837b] mt-2 max-w-md mx-auto leading-6">
              {activeFilter === "available"
                ? "There are currently no unclaimed deliveries ready for pickup."
                : activeFilter === "active"
                ? "You do not have any active deliveries right now."
                : activeFilter === "completed"
                ? "You have not completed any deliveries yet."
                : "New delivery orders will appear here automatically."}
            </p>

            <button
              type="button"
              onClick={() =>
                loadDeliveries()
              }
              className="mt-6 h-10 px-5 rounded-xl bg-[#211e1a] text-white text-sm font-semibold hover:bg-[#e87524] transition"
            >
              Check Again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 sm:gap-6">
            {filteredDeliveries.map(
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

      {/* ========================================================
          DELIVERY MODAL
      ======================================================== */}

      {selectedDelivery && (
        <div
          className="fixed inset-0 z-50 bg-[#211e1a]/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
          onClick={closeDelivery}
        >
          <div
            className="bg-white w-full max-w-3xl max-h-[94vh] overflow-hidden rounded-[24px] shadow-[0_25px_100px_rgba(33,30,26,0.25)] flex flex-col"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="shrink-0 bg-white border-b border-[#eee9e3] px-5 sm:px-7 py-4 sm:py-5 flex items-center justify-between">

              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#e87524] font-bold">
                  Delivery
                </p>

                <h2 className="text-xl sm:text-2xl font-bold tracking-[-0.035em] mt-1">
                  Checkout #
                  {
                    selectedDelivery.checkout_id
                  }
                </h2>
              </div>

              <button
                type="button"
                onClick={closeDelivery}
                className="w-10 h-10 shrink-0 rounded-xl bg-[#f6f2ed] text-[#756e66] hover:bg-[#211e1a] hover:text-white transition flex items-center justify-center"
              >
                <CloseIcon size={19} />
              </button>
            </div>

            {/* MODAL BODY */}

            <div className="overflow-y-auto p-5 sm:p-7 space-y-5 sm:space-y-6">

              {/* STATUS */}

              <div className="rounded-2xl border border-[#e8e2da] bg-[#fcfaf8] p-5">

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[#958d84] font-bold">
                      Current Status
                    </p>

                    <p className="text-sm text-[#756e66] mt-1">
                      Delivery progress
                    </p>
                  </div>

                  <StatusBadge
                    status={
                      selectedDelivery.delivery_status
                    }
                    style={getStatusStyle(
                      selectedDelivery.delivery_status
                    )}
                    large
                  />
                </div>
              </div>

              {/* CUSTOMER */}

              <div className="rounded-2xl border border-[#e8e2da] p-5 sm:p-6">

                <SectionLabel>
                  Deliver To
                </SectionLabel>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-5">

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[#aaa29a]">
                      Customer
                    </p>

                    <p className="font-bold text-lg mt-1">
                      {
                        selectedDelivery.student_name ||
                        selectedDelivery.customer_name ||
                        "Customer"
                      }
                    </p>

                    <p className="text-sm text-[#756e66] mt-1">
                      {
                        selectedDelivery.delivery_phone ||
                        selectedDelivery.student_phone ||
                        "No phone number"
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[#aaa29a]">
                      Location
                    </p>

                    <p className="font-bold text-lg mt-1">
                      {
                        selectedDelivery.building_number ||
                        "No location"
                      }
                    </p>
                  </div>
                </div>

                {selectedDelivery.delivery_note && (
                  <div className="mt-5 pt-5 border-t border-[#eee9e3]">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[#aaa29a]">
                      Delivery Note
                    </p>

                    <p className="text-sm text-[#625c55] mt-1.5 leading-6">
                      {
                        selectedDelivery.delivery_note
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* PICKUP SHOPS */}

              <div>
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <SectionLabel>
                      Pickup From
                    </SectionLabel>

                    <p className="text-sm text-[#8b837b] mt-1">
                      Visit each shop to collect the order.
                    </p>
                  </div>

                  <span className="text-xs text-[#aaa29a]">
                    {selectedShops.length}{" "}
                    {selectedShops.length === 1
                      ? "shop"
                      : "shops"}
                  </span>
                </div>

                <div className="space-y-3">
                  {selectedShops.map(
                    (shop, index) => (
                      <div
                        key={
                          shop.order_id ||
                          `${selectedDelivery.delivery_id}-${index}`
                        }
                        className="rounded-2xl border border-[#e8e2da] bg-white overflow-hidden"
                      >

                        <div className="p-4 sm:p-5 flex items-start justify-between gap-4">

                          <div className="flex items-start gap-3 min-w-0">

                            <div className="w-10 h-10 shrink-0 rounded-xl bg-[#211e1a] text-white flex items-center justify-center">
                              <StoreIcon size={18} />
                            </div>

                            <div className="min-w-0">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-[#aaa29a]">
                                Shop {index + 1}
                              </p>

                              <p className="font-bold text-base sm:text-lg mt-0.5">
                                {shop.shop_name}
                              </p>

                              {shop.shop_location && (
                                <p className="text-xs text-[#8b837b] mt-1">
                                  {
                                    shop.shop_location
                                  }
                                </p>
                              )}
                            </div>
                          </div>

                          <span className="shrink-0 text-[10px] font-semibold px-2.5 py-1.5 rounded-full border border-[#e5e0da] bg-[#faf8f5] text-[#756e66]">
                            {shop.pickup_status ===
                            "collected"
                              ? "Collected"
                              : shop.order_status ||
                                "Ready"}
                          </span>
                        </div>

                        {shop.items &&
                          shop.items.length > 0 && (
                            <div className="border-t border-[#eee9e3] px-4 sm:px-5">

                              {shop.items.map(
                                (item) => (
                                  <div
                                    key={
                                      item.order_item_id
                                    }
                                    className="flex items-center justify-between gap-4 py-3 border-b border-[#f0ebe6] last:border-0"
                                  >
                                    <div>
                                      <p className="text-sm font-semibold">
                                        {
                                          item.menu_name
                                        }
                                      </p>

                                      <p className="text-xs text-[#958d84] mt-0.5">
                                        Qty{" "}
                                        {
                                          item.quantity
                                        }
                                      </p>
                                    </div>

                                    <p className="text-sm font-bold">
                                      ฿
                                      {Number(
                                        item.subtotal ||
                                          0
                                      ).toFixed(
                                        2
                                      )}
                                    </p>
                                  </div>
                                )
                              )}

                              <div className="flex items-center justify-between py-3">
                                <span className="text-xs text-[#958d84]">
                                  Shop Total
                                </span>

                                <span className="font-bold text-sm">
                                  ฿
                                  {Number(
                                    shop.total_amount ||
                                      0
                                  ).toFixed(
                                    2
                                  )}
                                </span>
                              </div>
                            </div>
                          )}
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* ORDER TOTAL */}

              <div className="rounded-2xl bg-[#211e1a] text-white px-5 sm:px-6 py-5 flex items-center justify-between">

                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/50 font-bold">
                    Total Order
                  </p>

                  <p className="text-sm text-white/65 mt-1">
                    Customer payment
                  </p>
                </div>

                <p className="text-2xl sm:text-3xl font-bold tracking-[-0.04em]">
                  ฿
                  {Number(
                    selectedDelivery.total_amount ||
                      selectedDelivery.total ||
                      0
                  ).toFixed(2)}
                </p>
              </div>

              {/* ==================================================
                  PICKUP QR
              ================================================== */}

              {selectedDelivery.qr_token &&
                selectedDelivery.delivery_status ===
                  "collecting" && (
                  <div className="rounded-2xl border border-[#f0d9c4] bg-[#fff8f1] p-5 sm:p-6 text-center">

                    <div className="w-10 h-10 rounded-xl bg-[#fff0e3] text-[#e87524] mx-auto flex items-center justify-center">
                      <QrIcon size={20} />
                    </div>

                    <p className="text-[10px] uppercase tracking-[0.16em] text-[#a66a00] font-bold mt-3">
                      Pickup QR Code
                    </p>

                    <h3 className="text-lg sm:text-xl font-bold mt-1">
                      Show this QR to the shop
                    </h3>

                    <p className="text-sm text-[#8b837b] mt-2 max-w-md mx-auto leading-5">
                      Use the same QR code when
                      collecting the food from each
                      shop.
                    </p>

                    {qrImage ? (
                      <div className="mt-5 flex justify-center">
                        <div className="bg-white rounded-2xl p-3 border border-[#eadfd4] shadow-sm">
                          <img
                            src={qrImage}
                            alt="Pickup QR Code"
                            className="w-[230px] h-[230px] sm:w-[260px] sm:h-[260px]"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-5 bg-white rounded-xl p-7 text-sm text-[#8b837b]">
                        Creating QR code...
                      </div>
                    )}

                    <div className="mt-5 bg-white rounded-xl border border-[#eadfd4] p-4 text-left">

                      <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#625c55]">
                        Pickup steps
                      </p>

                      <div className="mt-3 space-y-2">
                        <Step
                          number="1"
                          text="Go to the shop shown above."
                        />

                        <Step
                          number="2"
                          text="Show this QR code to the shop owner."
                        />

                        <Step
                          number="3"
                          text="Shop owner scans the QR."
                        />

                        <Step
                          number="4"
                          text="Shop owner confirms the pickup."
                        />

                        <Step
                          number="5"
                          text="Repeat for every shop."
                        />
                      </div>
                    </div>
                  </div>
                )}

              {/* ==================================================
                  CLAIM
              ================================================== */}

              {selectedDelivery.delivery_status ===
                "ready_for_delivery" &&
                !selectedDelivery.delivery_person_id && (
                  <div className="rounded-2xl bg-[#fff7ee] border border-[#f2dfc9] p-5">

                    <p className="text-sm font-bold text-[#8c5a25]">
                      This delivery is available.
                    </p>

                    <p className="text-xs text-[#a66a00] mt-1 leading-5">
                      Claim it to start collecting the
                      customer's food.
                    </p>

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
                      className="w-full mt-4 h-12 rounded-xl bg-[#211e1a] text-white text-sm font-bold hover:bg-[#e87524] transition disabled:opacity-50"
                    >
                      {claimingId ===
                      selectedDelivery.delivery_id
                        ? "Claiming..."
                        : "Claim This Delivery"}
                    </button>
                  </div>
                )}

              {/* ==================================================
                  COLLECTING
              ================================================== */}

              {selectedDelivery.delivery_status ===
                "collecting" && (
                <div className="rounded-2xl border border-[#f1dfb8] bg-[#fffaf0] p-5">

                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#fff1d5] text-[#b9780d] flex items-center justify-center shrink-0">
                      <StoreIcon size={18} />
                    </div>

                    <div>
                      <h3 className="font-bold">
                        Collecting Food
                      </h3>

                      <p className="text-sm text-[#8b837b] mt-1 leading-5">
                        Visit every shop above and show
                        the QR code to the shop owner.
                      </p>
                    </div>
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
                    className="w-full mt-5 h-12 rounded-xl bg-[#211e1a] text-white text-sm font-bold hover:bg-[#e87524] transition disabled:opacity-50"
                  >
                    {collectingId ===
                    selectedDelivery.delivery_id
                      ? "Confirming..."
                      : "Food Collected"}
                  </button>
                </div>
              )}

              {/* ==================================================
                  READY AFTER COLLECTION
              ================================================== */}

              {selectedDelivery.delivery_status ===
                "ready_for_delivery" &&
                selectedDelivery.delivery_person_id && (
                  <div className="rounded-2xl border border-[#f0d9c4] bg-[#fff8f1] p-5">

                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#fff0e3] text-[#e87524] flex items-center justify-center shrink-0">
                        <CheckIcon size={18} />
                      </div>

                      <div>
                        <h3 className="font-bold">
                          Food Collected
                        </h3>

                        <p className="text-sm text-[#8b837b] mt-1 leading-5">
                          All food has been collected.
                          You can now start the delivery.
                        </p>
                      </div>
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
                      className="w-full mt-5 h-12 rounded-xl bg-[#211e1a] text-white text-sm font-bold hover:bg-[#e87524] transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <TruckIcon size={18} />

                      {startingId ===
                      selectedDelivery.delivery_id
                        ? "Starting Delivery..."
                        : "Start Delivery"}
                    </button>
                  </div>
                )}

              {/* ==================================================
                  OUT FOR DELIVERY
              ================================================== */}

              {selectedDelivery.delivery_status ===
                "out_for_delivery" && (
                <div className="space-y-4">

                  <div className="rounded-2xl border border-[#ded6f6] bg-[#f6f2ff] p-5">

                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white text-[#735bb1] flex items-center justify-center shrink-0">
                        <TruckIcon size={18} />
                      </div>

                      <div>
                        <h3 className="font-bold text-[#574584]">
                          Out for Delivery
                        </h3>

                        <p className="text-sm text-[#735bb1] mt-1 leading-5">
                          Take the order to the customer's
                          delivery location.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* DELIVERY PROOF */}

                  <div className="rounded-2xl border border-[#e8e2da] bg-white p-5 sm:p-6">

                    <SectionLabel>
                      Delivery Proof
                    </SectionLabel>

                    <h3 className="text-xl font-bold mt-2">
                      Confirm the delivery
                    </h3>

                    <p className="text-sm text-[#8b837b] mt-1 leading-5">
                      Take a photo of the parcel at the
                      customer's delivery location.
                    </p>

                    <label className="block cursor-pointer mt-5">

                      <div className="rounded-2xl border-2 border-dashed border-[#d8d0c7] bg-[#fcfaf8] p-7 text-center hover:border-[#e87524] hover:bg-[#fffaf5] transition">

                        <div className="w-12 h-12 rounded-xl bg-white border border-[#e8e2da] text-[#e87524] mx-auto flex items-center justify-center">
                          <CameraIcon size={22} />
                        </div>

                        <p className="font-semibold mt-3">
                          Choose / Take Photo
                        </p>

                        <p className="text-xs text-[#958d84] mt-1">
                          JPG, PNG or WEBP · Max 5 MB
                        </p>
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
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs uppercase tracking-[0.12em] font-bold text-[#958d84]">
                            Photo Preview
                          </p>

                          <button
                            type="button"
                            onClick={() => {
                              if (
                                photoPreview
                              ) {
                                URL.revokeObjectURL(
                                  photoPreview
                                );
                              }

                              setPhoto(null);
                              setPhotoPreview(
                                ""
                              );
                            }}
                            className="text-xs text-[#b8443d] font-semibold hover:underline"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="rounded-2xl overflow-hidden bg-[#f4f1ed] border border-[#e8e2da]">
                          <img
                            src={photoPreview}
                            alt="Delivery preview"
                            className="w-full max-h-80 object-contain"
                          />
                        </div>
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
                      className="w-full mt-5 h-12 rounded-xl bg-[#211e1a] text-white text-sm font-bold hover:bg-[#e87524] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <CheckIcon size={18} />

                      {completing
                        ? "Confirming Delivery..."
                        : "Confirm Delivered"}
                    </button>
                  </div>
                </div>
              )}

              {/* COMPLETED */}

              {selectedDelivery.delivery_status ===
                "delivered" && (
                <div className="rounded-2xl border border-[#d4e9d8] bg-[#f1f9f2] p-6 text-center">

                  <div className="w-12 h-12 rounded-full bg-white text-[#347a43] mx-auto flex items-center justify-center">
                    <CheckIcon
                      size={24}
                      stroke={2.3}
                    />
                  </div>

                  <h3 className="font-bold text-lg text-[#347a43] mt-4">
                    Delivery Completed
                  </h3>

                  <p className="text-sm text-[#5c7d62] mt-1">
                    This delivery has already been completed.
                  </p>
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}

            <div className="shrink-0 border-t border-[#eee9e3] px-5 sm:px-7 py-4 bg-white">
              <button
                type="button"
                onClick={closeDelivery}
                className="w-full h-11 rounded-xl border border-[#ded8d0] bg-white text-sm font-semibold text-[#514b45] hover:bg-[#f8f5f0] transition"
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

/* ============================================================
   COMPONENTS
============================================================ */

function StatCard({
  label,
  value,
  icon,
  accent = false,
}) {
  return (
    <div className="bg-white border border-[#e8e2da] rounded-2xl p-4 sm:p-5 shadow-[0_4px_18px_rgba(33,30,26,0.035)] hover:shadow-[0_8px_28px_rgba(33,30,26,0.07)] transition">

      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-[#f7f1eb] text-[#e87524] flex items-center justify-center">
          {icon}
        </div>

        {accent && (
          <span className="w-2 h-2 rounded-full bg-[#e87524]" />
        )}
      </div>

      <p className="text-[10px] uppercase tracking-[0.13em] font-bold text-[#958d84] mt-5">
        {label}
      </p>

      <p className="text-2xl sm:text-3xl font-bold tracking-[-0.045em] mt-1">
        {value}
      </p>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 h-10 px-4 rounded-xl text-sm font-semibold transition ${
        active
          ? "bg-[#211e1a] text-white"
          : "bg-white border border-[#e3ddd6] text-[#6f6861] hover:border-[#cfc7be] hover:text-[#211e1a]"
      }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({
  status,
  style,
  large = false,
}) {
  const currentStyle =
    style || getStaticStatusStyle(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 border rounded-full font-semibold whitespace-nowrap ${
        large
          ? "px-3.5 py-2 text-xs"
          : "px-2.5 py-1.5 text-[10px]"
      } ${currentStyle.badge}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${currentStyle.dot}`}
      />

      {getStaticStatusLabel(status)}
    </span>
  );
}

function InfoBlock({
  label,
  value,
  secondary,
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-[#aaa29a] font-bold">
        {label}
      </p>

      <p className="font-semibold text-sm sm:text-base mt-1">
        {value}
      </p>

      {secondary && (
        <p className="text-xs text-[#958d84] mt-1">
          {secondary}
        </p>
      )}
    </div>
  );
}

function SectionLabel({
  children,
}) {
  return (
    <p className="text-[10px] uppercase tracking-[0.17em] text-[#958d84] font-bold">
      {children}
    </p>
  );
}

function Step({
  number,
  text,
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-6 h-6 rounded-full bg-[#211e1a] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
        {number}
      </span>

      <span className="text-xs text-[#625c55]">
        {text}
      </span>
    </div>
  );
}

/* ============================================================
   STATUS HELPERS
============================================================ */

function getStaticStatusLabel(status) {
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

function getStaticStatusStyle(status) {
  switch (status) {
    case "waiting":
      return {
        badge:
          "bg-[#f4f1ed] text-[#6f6861] border-[#e4ddd5]",
        dot: "bg-[#8b837b]",
      };

    case "collecting":
      return {
        badge:
          "bg-[#fff6e7] text-[#a66a00] border-[#f1dfb8]",
        dot: "bg-[#d58b16]",
      };

    case "ready_for_delivery":
      return {
        badge:
          "bg-[#fff0e5] text-[#c75e16] border-[#f2d5bf]",
        dot: "bg-[#e87524]",
      };

    case "out_for_delivery":
      return {
        badge:
          "bg-[#f0ecff] text-[#6f58a5] border-[#ded6f6]",
        dot: "bg-[#735bb1]",
      };

    case "delivered":
      return {
        badge:
          "bg-[#edf7ef] text-[#347a43] border-[#d4e9d8]",
        dot: "bg-[#4b9659]",
      };

    case "cancelled":
      return {
        badge:
          "bg-[#fff0ef] text-[#b8443d] border-[#efd2cf]",
        dot: "bg-[#c95750]",
      };

    default:
      return {
        badge:
          "bg-[#f4f1ed] text-[#6f6861] border-[#e4ddd5]",
        dot: "bg-[#8b837b]",
      };
  }
}

/* ============================================================
   ICONS
============================================================ */

function IconBase({
  size = 20,
  stroke = 1.8,
  children,
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function StoreIcon({
  size = 20,
}) {
  return (
    <IconBase size={size}>
      <path d="M3 10h18" />
      <path d="M5 10v10h14V10" />
      <path d="M3 10l2-6h14l2 6" />
      <path d="M9 20v-6h6v6" />
    </IconBase>
  );
}

function TruckIcon({
  size = 20,
}) {
  return (
    <IconBase size={size}>
      <path d="M3 6h11v11H3z" />
      <path d="M14 10h4l3 3v4h-7z" />
      <circle cx="7" cy="19" r="2" />
      <circle cx="18" cy="19" r="2" />
    </IconBase>
  );
}

function PackageIcon({
  size = 20,
}) {
  return (
    <IconBase size={size}>
      <path d="M21 16V8l-9-5-9 5v8l9 5z" />
      <path d="M3.3 7.5L12 12l8.7-4.5" />
      <path d="M12 22V12" />
    </IconBase>
  );
}

function CheckIcon({
  size = 20,
  stroke = 1.8,
}) {
  return (
    <IconBase
      size={size}
      stroke={stroke}
    >
      <path d="M20 6L9 17l-5-5" />
    </IconBase>
  );
}

function CloseIcon({
  size = 20,
}) {
  return (
    <IconBase size={size}>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </IconBase>
  );
}

function ArrowIcon({
  size = 20,
}) {
  return (
    <IconBase size={size}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </IconBase>
  );
}

function RefreshIcon({
  size = 20,
}) {
  return (
    <IconBase size={size}>
      <path d="M20 11a8.1 8.1 0 0 0-15.5-2" />
      <path d="M4 4v5h5" />
      <path d="M4 13a8.1 8.1 0 0 0 15.5 2" />
      <path d="M20 20v-5h-5" />
    </IconBase>
  );
}

function InfoIcon({
  size = 20,
}) {
  return (
    <IconBase size={size}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </IconBase>
  );
}

function QrIcon({
  size = 20,
}) {
  return (
    <IconBase size={size}>
      <rect x="4" y="4" width="6" height="6" />
      <rect x="14" y="4" width="6" height="6" />
      <rect x="4" y="14" width="6" height="6" />
      <path d="M14 14h3v3h-3z" />
      <path d="M20 14v6" />
      <path d="M14 20h3" />
    </IconBase>
  );
}

function CameraIcon({
  size = 20,
}) {
  return (
    <IconBase size={size}>
      <path d="M4 7h3l1.5-2h7L17 7h3v12H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </IconBase>
  );
}