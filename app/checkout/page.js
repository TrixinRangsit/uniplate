"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function CheckoutPage() {
  const router = useRouter();

  const [cart, setCart] = useState([]);
  const [deliveryMethod, setDeliveryMethod] = useState("pickup");

  const [buildingNumber, setBuildingNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  // Load cart
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("uniplate_cart");

      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);

        if (Array.isArray(parsedCart)) {
          setCart(parsedCart);
        }
      }
    } catch (error) {
      console.error("Unable to load cart:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate subtotal
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 1;

      return sum + price * quantity;
    }, 0);
  }, [cart]);

  // Group shops
  const shopGroups = useMemo(() => {
    const groups = new Map();

    cart.forEach((item) => {
      const shopId =
        item.shop_id ||
        item.shop_owner_id ||
        item.food_court_id ||
        item.shop_name ||
        "unknown";

      if (!groups.has(String(shopId))) {
        groups.set(String(shopId), {
          shop_id:
            item.shop_id ||
            item.shop_owner_id ||
            item.food_court_id ||
            null,

          shop_name:
            item.shop_name ||
            "Food Shop",

          items: [],
        });
      }

      groups.get(String(shopId)).items.push(item);
    });

    return Array.from(groups.values());
  }, [cart]);

  const shopCount = shopGroups.length;

  // ฿10 per shop for delivery
  const deliveryFee =
    deliveryMethod === "delivery"
      ? shopCount * 10
      : 0;

  const total = subtotal + deliveryFee;

  // Continue to payment
  const handleContinue = () => {
    setMessage("");

    if (cart.length === 0) {
      setMessage("Your cart is empty.");
      return;
    }

    if (deliveryMethod === "delivery") {
      if (!buildingNumber.trim()) {
        setMessage(
          "Please enter your building / room number."
        );
        return;
      }

      if (!phone.trim()) {
        setMessage(
          "Please enter your phone number."
        );
        return;
      }
    }

    const checkoutData = {
      delivery_method: deliveryMethod,

      building_number:
        buildingNumber.trim(),

      phone: phone.trim(),

      delivery_note:
        deliveryNote.trim(),

      subtotal,

      delivery_fee: deliveryFee,

      total,

      shop_count: shopCount,

      shops: shopGroups.map((shop) => ({
        shop_id: shop.shop_id,
        shop_name: shop.shop_name,
      })),
    };

    // Save checkout information
    localStorage.setItem(
      "uniplate_checkout",
      JSON.stringify(checkoutData)
    );

    // Go to payment page
    router.push("/payment");
  };

  const handleBackToCart = () => {
    router.push("/cart");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#faf7f2] flex items-center justify-center">
        <p className="text-[#211e1a]">
          Loading checkout...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf7f2] text-[#211e1a]">
      <div className="mx-auto max-w-6xl px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-5xl font-bold">
            Checkout
          </h1>

          <p className="mt-2 text-[#806f64]">
            Choose how you want to receive your food.
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-600">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_410px]">

          {/* LEFT SIDE */}
          <div className="space-y-6">

            {/* Receive method */}
            <section className="rounded-2xl border border-[#e5ddd5] bg-white p-6">

              <h2 className="text-2xl font-bold">
                How would you like to receive your food?
              </h2>

              <p className="mt-1 text-[#806f64]">
                Choose pickup or delivery.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">

                {/* Pickup */}
                <button
                  type="button"
                  onClick={() => {
                    setDeliveryMethod("pickup");
                    setMessage("");
                  }}
                  className={`rounded-2xl border-2 p-5 text-left transition ${
                    deliveryMethod === "pickup"
                      ? "border-[#211e1a] bg-[#faf7f2]"
                      : "border-[#e5ddd5] bg-white hover:border-[#b9aea5]"
                  }`}
                >
                  <div className="flex items-start gap-4">

                    <div
                      className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                        deliveryMethod === "pickup"
                          ? "border-[#211e1a]"
                          : "border-[#b9aea5]"
                      }`}
                    >
                      {deliveryMethod === "pickup" && (
                        <div className="h-2.5 w-2.5 rounded-full bg-[#211e1a]" />
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-bold">
                        Pickup
                      </h3>

                      <p className="mt-1 text-sm text-[#806f64]">
                        Pick up your order from the food court.
                      </p>

                      <p className="mt-3 text-sm font-semibold text-[#6b8060]">
                        No delivery fee
                      </p>
                    </div>

                  </div>
                </button>

                {/* Delivery */}
                <button
                  type="button"
                  onClick={() => {
                    setDeliveryMethod("delivery");
                    setMessage("");
                  }}
                  className={`rounded-2xl border-2 p-5 text-left transition ${
                    deliveryMethod === "delivery"
                      ? "border-[#211e1a] bg-[#faf7f2]"
                      : "border-[#e5ddd5] bg-white hover:border-[#b9aea5]"
                  }`}
                >
                  <div className="flex items-start gap-4">

                    <div
                      className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                        deliveryMethod === "delivery"
                          ? "border-[#211e1a]"
                          : "border-[#b9aea5]"
                      }`}
                    >
                      {deliveryMethod === "delivery" && (
                        <div className="h-2.5 w-2.5 rounded-full bg-[#211e1a]" />
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-bold">
                        Delivery
                      </h3>

                      <p className="mt-1 text-sm text-[#806f64]">
                        Have your food delivered to your building.
                      </p>

                      <p className="mt-3 text-sm font-semibold text-[#e54826]">
                        ฿10 per shop
                      </p>
                    </div>

                  </div>
                </button>

              </div>
            </section>

            {/* Delivery Information */}
            {deliveryMethod === "delivery" && (
              <section className="rounded-2xl border border-[#e5ddd5] bg-white p-6">

                <h2 className="text-2xl font-bold">
                  Delivery Information
                </h2>

                <p className="mt-1 text-[#806f64]">
                  Please provide the information needed for delivery.
                </p>

                <div className="mt-6 space-y-5">

                  {/* Building */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Building / Room Number
                    </label>

                    <input
                      type="text"
                      value={buildingNumber}
                      onChange={(e) =>
                        setBuildingNumber(e.target.value)
                      }
                      placeholder="e.g. Building A, Room 302"
                      className="w-full rounded-xl border border-[#ddd3ca] bg-white px-4 py-3 outline-none transition focus:border-[#211e1a]"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Phone Number
                    </label>

                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) =>
                        setPhone(e.target.value)
                      }
                      placeholder="e.g. 0812345678"
                      className="w-full rounded-xl border border-[#ddd3ca] bg-white px-4 py-3 outline-none transition focus:border-[#211e1a]"
                    />
                  </div>

                  {/* Note */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Note for Delivery Person
                    </label>

                    <textarea
                      value={deliveryNote}
                      onChange={(e) =>
                        setDeliveryNote(e.target.value)
                      }
                      placeholder="e.g. Please leave the food at the lobby."
                      rows={4}
                      className="w-full resize-none rounded-xl border border-[#ddd3ca] bg-white px-4 py-3 outline-none transition focus:border-[#211e1a]"
                    />
                  </div>

                </div>
              </section>
            )}

            {/* Your Order */}
            <section className="rounded-2xl border border-[#e5ddd5] bg-white p-6">

              <h2 className="text-2xl font-bold">
                Your Order
              </h2>

              <p className="mt-1 text-[#806f64]">
                {cart.length}{" "}
                {cart.length === 1 ? "item" : "items"}{" "}
                from {shopCount}{" "}
                {shopCount === 1 ? "shop" : "shops"}
              </p>

              <div className="mt-6 divide-y divide-[#eee6df]">

                {cart.map((item, index) => {

                  const price =
                    Number(item.price) || 0;

                  const quantity =
                    Number(item.quantity) || 1;

                  const itemTotal =
                    price * quantity;

                  return (
                    <div
                      key={
                        item.menu_item_id ||
                        item.id ||
                        index
                      }
                      className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                    >

                      {/* Image */}
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#f2ede8]">

                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm text-[#806f64]">
                            No image
                          </div>
                        )}

                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-1">

                        <h3 className="truncate font-bold">
                          {item.name}
                        </h3>

                        <p className="mt-1 text-sm text-[#806f64]">
                          {item.shop_name ||
                            "Food Shop"}
                        </p>

                        <p className="mt-1 text-sm text-[#806f64]">
                          Qty: {quantity}
                        </p>

                      </div>

                      {/* Price */}
                      <div className="font-bold text-[#e54826]">
                        ฿
                        {itemTotal.toFixed(0)}
                      </div>

                    </div>
                  );
                })}

              </div>
            </section>

          </div>

          {/* RIGHT SIDE */}
          <aside className="h-fit lg:sticky lg:top-6">

            <section className="rounded-2xl border border-[#e5ddd5] bg-white p-6">

              <h2 className="text-2xl font-bold">
                Order Summary
              </h2>

              <div className="mt-6 space-y-4">

                <div className="flex justify-between text-[#806f64]">
                  <span>
                    Items ({cart.length})
                  </span>

                  <span className="font-medium text-[#211e1a]">
                    ฿{subtotal.toFixed(0)}
                  </span>
                </div>

                <div className="flex justify-between text-[#806f64]">
                  <span>
                    Shops
                  </span>

                  <span className="font-medium text-[#211e1a]">
                    {shopCount}
                  </span>
                </div>

                <div className="flex justify-between text-[#806f64]">
                  <span>
                    {deliveryMethod === "delivery"
                      ? "Delivery"
                      : "Pickup fee"}
                  </span>

                  <span className="font-medium text-[#211e1a]">
                    ฿{deliveryFee.toFixed(0)}
                  </span>
                </div>

                <div className="border-t border-[#e5ddd5] pt-5">

                  <div className="flex items-center justify-between">

                    <span className="text-xl font-bold">
                      Total
                    </span>

                    <span className="text-3xl font-bold text-[#e54826]">
                      ฿{total.toFixed(0)}
                    </span>

                  </div>

                </div>

              </div>

              {/* Continue */}
              <button
                type="button"
                onClick={handleContinue}
                disabled={cart.length === 0}
                className="mt-6 w-full rounded-xl bg-[#e54826] px-6 py-4 font-semibold text-white transition hover:bg-[#c93d20] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue to Payment
              </button>

              {/* Back */}
              <button
                type="button"
                onClick={handleBackToCart}
                className="mt-3 w-full rounded-xl border border-[#ddd3ca] bg-white px-6 py-4 font-semibold text-[#211e1a] transition hover:bg-[#faf7f2]"
              >
                Back to Cart
              </button>

            </section>

          </aside>

        </div>
      </div>
    </main>
  );
}