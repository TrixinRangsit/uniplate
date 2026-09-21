"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const router = useRouter();

  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load cart from localStorage
  useEffect(() => {
    try {
      const savedCart = JSON.parse(
        localStorage.getItem("uniplate_cart") || "[]"
      );

      setCart(savedCart);
    } catch (error) {
      console.error("LOAD CART ERROR:", error);
      setCart([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save cart
  function saveCart(updatedCart) {
    setCart(updatedCart);

    localStorage.setItem(
      "uniplate_cart",
      JSON.stringify(updatedCart)
    );
  }

  // Increase quantity
  function increaseQuantity(menuItemId) {
    const updatedCart = cart.map((item) =>
      item.menu_item_id === menuItemId
        ? {
            ...item,
            quantity: item.quantity + 1,
          }
        : item
    );

    saveCart(updatedCart);
  }

  // Decrease quantity
  function decreaseQuantity(menuItemId) {
    const updatedCart = cart
      .map((item) =>
        item.menu_item_id === menuItemId
          ? {
              ...item,
              quantity: item.quantity - 1,
            }
          : item
      )
      .filter((item) => item.quantity > 0);

    saveCart(updatedCart);
  }

  // Remove item
  function removeItem(menuItemId) {
    const updatedCart = cart.filter(
      (item) => item.menu_item_id !== menuItemId
    );

    saveCart(updatedCart);
  }

  // Clear entire cart
  function clearCart() {
    localStorage.removeItem("uniplate_cart");
    setCart([]);
  }

  // Total amount
  const totalAmount = cart.reduce(
    (total, item) =>
      total + Number(item.price) * item.quantity,
    0
  );

  // Total number of items
  const totalItems = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  // Loading
  if (loading) {
    return (
      <main className="min-h-screen bg-[#faf7f2] flex items-center justify-center">
        <div className="text-center">
          <div className="w-7 h-7 border-2 border-[#d94825] border-t-transparent rounded-full animate-spin mx-auto mb-3" />

          <p className="text-sm text-[#77716a]">
            Loading cart...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf7f2] text-[#211e1a]">

      {/* ================= HEADER ================= */}
      <header className="border-b border-[#e5ded5] bg-[#faf7f2]">
        <div className="max-w-[1450px] mx-auto px-5 h-[62px] flex items-center justify-between">

          {/* Logo */}
          <button
            onClick={() => router.push("/")}
            className="text-[27px] font-serif font-bold tracking-tight"
          >
            UniPlate
          </button>

          {/* Continue Shopping */}
          <button
            onClick={() => router.push("/")}
            className="text-sm font-semibold text-[#d94825] hover:underline"
          >
            ← Continue Shopping
          </button>

        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <div className="max-w-[1200px] mx-auto px-5 py-10">

        {/* PAGE TITLE */}
        <div className="mb-7">
          <h1 className="text-[42px] font-serif font-bold tracking-tight">
            Your Cart
          </h1>

          <p className="text-[16px] text-[#667085] mt-2">
            Review your selected food before checkout.
          </p>
        </div>

        {/* ================= EMPTY CART ================= */}
        {cart.length === 0 ? (

          <div className="bg-white border border-[#e4ddd4] rounded-2xl min-h-[370px] flex flex-col items-center justify-center text-center px-5">

            <div className="text-5xl mb-5">
              🛒
            </div>

            <h2 className="text-[24px] font-semibold">
              Your cart is empty
            </h2>

            <p className="text-[16px] text-[#667085] mt-2">
              Choose something delicious from our food shops.
            </p>

            <button
              onClick={() => router.push("/")}
              className="mt-7 px-7 py-3 rounded-xl bg-[#211e1a] text-white text-sm font-semibold hover:bg-[#d94825] transition"
            >
              Browse Food Shops
            </button>

          </div>

        ) : (

          /* ================= CART WITH ITEMS ================= */
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">

            {/* ================= CART ITEMS ================= */}
            <div className="space-y-3">

              {/* Selected Items Header */}
              <div className="flex items-center justify-between mb-2">

                <h2 className="text-lg font-semibold">
                  Selected Items
                </h2>

                <button
                  onClick={clearCart}
                  className="text-xs text-[#d94825] font-medium hover:underline"
                >
                  Clear Cart
                </button>

              </div>

              {/* Items */}
              {cart.map((item) => (

                <div
                  key={item.menu_item_id}
                  className="bg-white border border-[#e4ddd4] rounded-xl p-3 flex gap-4"
                >

                  {/* FOOD IMAGE */}
                  <div className="w-[100px] h-[100px] rounded-lg overflow-hidden bg-[#eee8df] shrink-0">

                    {item.image ? (

                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />

                    ) : (

                      <div className="w-full h-full flex items-center justify-center text-3xl">
                        🍛
                      </div>

                    )}

                  </div>

                  {/* FOOD INFORMATION */}
                  <div className="flex-1 min-w-0">

                    <div className="flex justify-between gap-3">

                      <div>

                        <h3 className="font-semibold text-[15px]">
                          {item.name}
                        </h3>

                        <p className="text-[11px] text-[#888078] mt-1">
                          {item.shop_name}
                        </p>

                      </div>

                      {/* DELETE */}
                      <button
                        onClick={() =>
                          removeItem(item.menu_item_id)
                        }
                        className="text-[#99918a] hover:text-[#d94825]"
                        title="Remove"
                      >
                        <svg
                          width="17"
                          height="17"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="M19 6l-1 14H6L5 6" />
                        </svg>
                      </button>

                    </div>

                    {/* PRICE + QUANTITY */}
                    <div className="flex items-center justify-between mt-5">

                      {/* Price */}
                      <span className="font-bold text-[#d94825]">
                        ฿
                        {(
                          Number(item.price) *
                          item.quantity
                        ).toFixed(0)}
                      </span>

                      {/* Quantity */}
                      <div className="flex items-center border border-[#ddd6ce] rounded-lg overflow-hidden">

                        <button
                          onClick={() =>
                            decreaseQuantity(
                              item.menu_item_id
                            )
                          }
                          className="w-8 h-8 flex items-center justify-center hover:bg-[#f5f1ec]"
                        >
                          −
                        </button>

                        <span className="w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>

                        <button
                          onClick={() =>
                            increaseQuantity(
                              item.menu_item_id
                            )
                          }
                          className="w-8 h-8 flex items-center justify-center hover:bg-[#f5f1ec]"
                        >
                          +
                        </button>

                      </div>

                    </div>

                  </div>

                </div>

              ))}

            </div>

            {/* ================= ORDER SUMMARY ================= */}
            <div className="lg:sticky lg:top-5 h-fit">

              <div className="bg-white border border-[#e4ddd4] rounded-xl p-5">

                <h2 className="text-lg font-semibold mb-5">
                  Order Summary
                </h2>

                <div className="space-y-3 text-sm">

                  {/* Items */}
                  <div className="flex justify-between text-[#706960]">

                    <span>
                      Items ({totalItems})
                    </span>

                    <span>
                      ฿{totalAmount.toFixed(0)}
                    </span>

                  </div>

                  {/* Pickup */}
                  <div className="flex justify-between text-[#706960]">

                    <span>
                      Pickup fee
                    </span>

                    <span>
                      ฿0
                    </span>

                  </div>

                  {/* TOTAL */}
                  <div className="border-t border-[#e8e1d8] pt-4 mt-4 flex justify-between">

                    <span className="font-semibold">
                      Total
                    </span>

                    <span className="font-bold text-[20px] text-[#d94825]">
                      ฿{totalAmount.toFixed(0)}
                    </span>

                  </div>

                </div>

                {/* CHECKOUT */}
                <button
                  onClick={() => router.push("/checkout")}
                  className="w-full mt-6 py-3 rounded-xl bg-[#211e1a] text-white text-sm font-semibold hover:bg-[#d94825] transition"
                >
                  Proceed to Checkout
                </button>

                {/* CONTINUE SHOPPING */}
                <button
                  onClick={() => router.push("/")}
                  className="w-full mt-2 py-3 rounded-xl border border-[#ddd6ce] text-sm font-semibold hover:bg-[#f5f1ec]"
                >
                  Continue Shopping
                </button>

              </div>

            </div>

          </div>

        )}

      </div>

    </main>
  );
}