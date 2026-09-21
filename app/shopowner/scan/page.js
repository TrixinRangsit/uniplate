"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function ShopOwnerScanPage() {
  const router = useRouter();

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);

  const [cameraStarted, setCameraStarted] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [scannedOrder, setScannedOrder] = useState(null);
  const [message, setMessage] = useState("");

  // =========================
  // STOP CAMERA
  // =========================
  const stopCamera = () => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setCameraStarted(false);
  };

  // =========================
  // START CAMERA
  // =========================
  const startCamera = async () => {
    try {
      setCameraError("");
      setMessage("");

      // Stop any existing camera first
      stopCamera();

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          "Camera access is not supported by this browser. Please use the manual QR token option."
        );
        return;
      }

      let stream;

      // First attempt: back/environment camera
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: {
              ideal: "environment",
            },
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
          },
          audio: false,
        });
      } catch (firstError) {
        console.warn(
          "Environment camera failed. Trying default camera.",
          firstError
        );

        // Fallback
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;

      if (!videoRef.current) {
        throw new Error("Video element is not available.");
      }

      videoRef.current.srcObject = stream;

      // Wait for the video to become ready
      await new Promise((resolve) => {
        if (videoRef.current.readyState >= 2) {
          resolve();
          return;
        }

        videoRef.current.onloadedmetadata = () => {
          resolve();
        };
      });

      await videoRef.current.play();

      // IMPORTANT:
      // Camera is now actually running
      setCameraStarted(true);

      // Start QR detection
      startQRDetection();
    } catch (error) {
      console.error("CAMERA ERROR:", error);

      setCameraStarted(false);

      if (error?.name === "NotReadableError") {
        setCameraError(
          "The camera could not be started. Please close any other application using the camera and try again."
        );
      } else if (error?.name === "NotAllowedError") {
        setCameraError(
          "Camera permission was denied. Please allow camera access in Chrome."
        );
      } else if (error?.name === "NotFoundError") {
        setCameraError(
          "No camera was found on this device. You can use the manual QR token option."
        );
      } else {
        setCameraError(
          "Unable to start the camera. Please try again or use the manual QR token option."
        );
      }
    }
  };

  // =========================
  // QR DETECTION
  // =========================
  const startQRDetection = () => {
    if (!("BarcodeDetector" in window)) {
      console.warn("BarcodeDetector is not supported.");
      return;
    }

    let detector;

    try {
      detector = new window.BarcodeDetector({
        formats: ["qr_code"],
      });
    } catch (error) {
      console.warn("BarcodeDetector initialization failed:", error);
      return;
    }

    scanTimerRef.current = setInterval(async () => {
      if (!videoRef.current) return;

      if (videoRef.current.readyState < 2) {
        return;
      }

      if (!cameraStarted) {
        return;
      }

      try {
        const barcodes = await detector.detect(videoRef.current);

        if (barcodes.length > 0) {
          const value = barcodes[0].rawValue;

          if (value) {
            if (scanTimerRef.current) {
              clearInterval(scanTimerRef.current);
              scanTimerRef.current = null;
            }

            await scanQRCode(value);
          }
        }
      } catch (error) {
        console.warn("QR detection error:", error);
      }
    }, 500);
  };

  // =========================
  // SCAN QR
  // =========================
  const scanQRCode = async (token) => {
    if (!token || loading) {
      return;
    }

    setLoading(true);
    setMessage("");
    setCameraError("");

    try {
      const response = await fetch("/api/shopowner/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          qr_token: token,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessage(data.message || "Unable to scan this QR code.");
        return;
      }

      // QR successfully verified
      stopCamera();

      setScannedOrder(data);
    } catch (error) {
      console.error("SCAN ERROR:", error);

      setMessage("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // MANUAL QR
  // =========================
  const handleManualScan = async (event) => {
    event.preventDefault();

    const token = manualToken.trim();

    if (!token) {
      setMessage("Please enter the QR token.");
      return;
    }

    await scanQRCode(token);
  };

  // =========================
  // CONFIRM FOOD HANDOVER
  // =========================
  const confirmOrder = async () => {
    if (!scannedOrder?.order?.order_id) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/shopowner/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: scannedOrder.order.order_id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessage(data.message || "Unable to confirm order.");
        return;
      }

      setMessage("Food handed over successfully.");

      setScannedOrder((previous) => ({
        ...previous,
        order: {
          ...previous.order,
          order_status: "collected",
          pickup_status: "collected",
        },
      }));
    } catch (error) {
      console.error("CONFIRM ERROR:", error);

      setMessage("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // SCAN ANOTHER
  // =========================
  const scanAnother = () => {
    setScannedOrder(null);
    setMessage("");
    setManualToken("");
    setCameraError("");

    startCamera();
  };

  // =========================
  // CLEANUP
  // =========================
  useEffect(() => {
    return () => {
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f4ef] text-[#1f1f1f]">
      <div className="mx-auto max-w-6xl px-6 py-10">

        {/* =========================
            HEADER
        ========================= */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Scan Order QR
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Scan the student's QR receipt to verify and hand over the food.
            </p>
          </div>

          <button
            onClick={() => router.push("/shopowner")}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium transition hover:bg-gray-100"
          >
            Back
          </button>
        </div>

        {!scannedOrder ? (
          <div className="grid gap-7 lg:grid-cols-2">

            {/* =========================
                CAMERA CARD
            ========================= */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

              <div className="mb-5">
                <h2 className="text-xl font-semibold">
                  Camera Scanner
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Use your camera for automatic QR scanning.
                </p>
              </div>

              {/* Camera preview */}
              <div className="relative overflow-hidden rounded-xl bg-black">

                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-[420px] w-full object-cover"
                />

                {/* Camera status overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">

                  {!cameraStarted && (
                    <div className="rounded-xl bg-black/60 px-6 py-5 text-center backdrop-blur-sm">

                      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-white/30">
                        <svg
                          width="26"
                          height="26"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          className="text-white"
                        >
                          <rect
                            x="3"
                            y="6"
                            width="18"
                            height="13"
                            rx="2"
                          />
                          <path d="M8 6l1.5-2h5L16 6" />
                          <circle cx="12" cy="12.5" r="3.5" />
                        </svg>
                      </div>

                      <p className="font-semibold text-white">
                        Camera is off
                      </p>

                      <p className="mt-1 text-xs text-gray-300">
                        Click Start Camera below
                      </p>
                    </div>
                  )}

                  {cameraStarted && (
                    <div className="absolute left-4 top-4 rounded-full bg-black/60 px-4 py-2 backdrop-blur-sm">

                      <div className="flex items-center gap-2">

                        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />

                        <span className="text-sm font-medium text-white">
                          Camera is on
                        </span>

                      </div>
                    </div>
                  )}

                </div>

                {/* QR scanning frame */}
                {cameraStarted && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">

                    <div className="relative h-56 w-56">

                      <div className="absolute left-0 top-0 h-10 w-10 border-l-4 border-t-4 border-white" />

                      <div className="absolute right-0 top-0 h-10 w-10 border-r-4 border-t-4 border-white" />

                      <div className="absolute bottom-0 left-0 h-10 w-10 border-b-4 border-l-4 border-white" />

                      <div className="absolute bottom-0 right-0 h-10 w-10 border-b-4 border-r-4 border-white" />

                    </div>

                  </div>
                )}
              </div>

              {/* Camera status text */}
              <div className="mt-4 text-center">

                {cameraStarted ? (
                  <p className="text-sm font-medium text-green-600">
                    Camera is on — point it at the student's QR code.
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">
                    Camera is off.
                  </p>
                )}

              </div>

              {/* Start / Stop button */}
              <button
                onClick={cameraStarted ? stopCamera : startCamera}
                className={`mt-4 w-full rounded-xl py-3.5 font-semibold transition ${
                  cameraStarted
                    ? "bg-gray-900 text-white hover:bg-gray-800"
                    : "bg-[#ef4923] text-white hover:bg-[#d93e1d]"
                }`}
              >
                {cameraStarted ? "Stop Camera" : "Start Camera"}
              </button>

              {/* Error */}
              {cameraError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                  {cameraError}
                </div>
              )}
            </div>

            {/* =========================
                MANUAL QR CARD
            ========================= */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

              <h2 className="text-xl font-semibold">
                Manual QR Token
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                If automatic QR scanning is unavailable, paste the QR token
                here.
              </p>

              <form
                onSubmit={handleManualScan}
                className="mt-6"
              >

                <textarea
                  value={manualToken}
                  onChange={(event) =>
                    setManualToken(event.target.value)
                  }
                  placeholder="Paste QR token here..."
                  className="h-48 w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#ef4923] focus:ring-2 focus:ring-[#ef4923]/10"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 w-full rounded-xl bg-[#ef4923] py-3.5 font-semibold text-white transition hover:bg-[#d93e1d] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Checking..." : "Check QR"}
                </button>

              </form>

              {message && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                  {message}
                </div>
              )}

              {/* Information */}
              <div className="mt-8 rounded-xl bg-gray-50 p-5">

                <p className="text-sm font-semibold">
                  How it works
                </p>

                <ol className="mt-3 space-y-2 text-sm text-gray-500">
                  <li>1. Start the camera.</li>
                  <li>2. Scan the student's QR receipt.</li>
                  <li>3. Verify the order belongs to your shop.</li>
                  <li>4. Hand over the food.</li>
                  <li>5. Confirm the handover.</li>
                </ol>

              </div>
            </div>
          </div>
        ) : (
          /* =========================
             SCANNED ORDER
          ========================= */
          <div className="mx-auto max-w-4xl space-y-6">

            {/* Verified */}
            <div className="rounded-2xl border border-green-200 bg-green-50 p-5">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">

                  <svg
                    width="21"
                    height="21"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>

                </div>

                <div>
                  <p className="font-semibold text-green-700">
                    QR Code Verified
                  </p>

                  <p className="text-sm text-green-600">
                    This QR belongs to an order from your shop.
                  </p>
                </div>

              </div>
            </div>

            {/* =========================
                SHOP / STUDENT INFO
            ========================= */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

              <div className="mb-6">
                <p className="text-sm text-gray-500">
                  Shop
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  {scannedOrder.shop_name}
                </h2>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">

                <div>
                  <p className="text-sm text-gray-500">
                    Student
                  </p>

                  <p className="mt-1 font-medium">
                    {scannedOrder.student?.name || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Fulfillment
                  </p>

                  <p className="mt-1 font-medium capitalize">
                    {scannedOrder.checkout?.fulfillment_type || "-"}
                  </p>
                </div>

                {scannedOrder.checkout?.delivery_phone && (
                  <div>
                    <p className="text-sm text-gray-500">
                      Phone
                    </p>

                    <p className="mt-1 font-medium">
                      {scannedOrder.checkout.delivery_phone}
                    </p>
                  </div>
                )}

                {scannedOrder.checkout?.building_number && (
                  <div>
                    <p className="text-sm text-gray-500">
                      Building / Room
                    </p>

                    <p className="mt-1 font-medium">
                      {scannedOrder.checkout.building_number}
                    </p>
                  </div>
                )}

              </div>

              {scannedOrder.checkout?.delivery_note && (
                <div className="mt-5 border-t border-gray-100 pt-5">
                  <p className="text-sm text-gray-500">
                    Delivery Note
                  </p>

                  <p className="mt-1 text-sm">
                    {scannedOrder.checkout.delivery_note}
                  </p>
                </div>
              )}
            </div>

            {/* =========================
                ITEMS
            ========================= */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

              <h2 className="mb-5 text-xl font-semibold">
                Order Items
              </h2>

              <div className="space-y-4">

                {scannedOrder.items?.map((item) => (
                  <div
                    key={item.order_item_id}
                    className="flex items-start justify-between border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                  >

                    <div>
                      <p className="font-medium">
                        {item.name}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        Quantity: {item.quantity}
                      </p>

                      {item.customization && (
                        <p className="mt-1 text-xs text-gray-400">
                          Customization: {item.customization}
                        </p>
                      )}
                    </div>

                    <p className="font-semibold">
                      ฿{Number(item.subtotal || 0).toFixed(2)}
                    </p>

                  </div>
                ))}

              </div>

              <div className="mt-6 flex justify-between border-t border-gray-200 pt-5 text-lg font-bold">

                <span>
                  Shop Total
                </span>

                <span>
                  ฿
                  {Number(
                    scannedOrder.order?.total_amount || 0
                  ).toFixed(2)}
                </span>

              </div>
            </div>

            {/* =========================
                HANDOVER
            ========================= */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-sm text-gray-500">
                    Order Status
                  </p>

                  <p className="mt-1 font-semibold capitalize">
                    {scannedOrder.order?.order_status || "-"}
                  </p>
                </div>

                <div
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
                    scannedOrder.order?.pickup_status === "collected"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {scannedOrder.order?.pickup_status === "collected"
                    ? "Collected"
                    : "Waiting"}
                </div>

              </div>

              {scannedOrder.order?.pickup_status === "collected" ? (
                <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                  This food has already been handed over.
                </div>
              ) : (
                <button
                  onClick={confirmOrder}
                  disabled={loading}
                  className="mt-6 w-full rounded-xl bg-green-600 py-4 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Processing..."
                    : "Confirm Food Handover"}
                </button>
              )}

              {message && (
                <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                  {message}
                </div>
              )}
            </div>

            {/* Scan another */}
            <button
              onClick={scanAnother}
              className="w-full rounded-xl border border-gray-300 bg-white py-3.5 font-semibold transition hover:bg-gray-50"
            >
              Scan Another Order
            </button>

          </div>
        )}
      </div>
    </main>
  );
}