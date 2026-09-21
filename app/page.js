"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  // ==========================================
  // USER / LOGIN
  // ==========================================

  const [user, setUser] = useState(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);

  // ==========================================
  // CHECK CURRENT USER
  // ==========================================

  async function checkUserSession() {
    try {
      setCheckingUser(true);

      const response = await fetch("/api/me", {
        cache: "no-store",
      });

      const data = await response.json();

      if (
        response.ok &&
        data.success &&
        data.user
      ) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error(
        "CHECK USER SESSION ERROR:",
        error
      );

      setUser(null);
    } finally {
      setCheckingUser(false);
    }
  }

  // ==========================================
  // LOAD APPROVED SHOPS
  // ==========================================

  async function loadShops() {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/shops", {
        cache: "no-store",
      });

      const data = await response.json();

      if (data.success) {
        setShops(data.shops || []);
      } else {
        setMessage(
          data.message ||
            "Unable to load shops."
        );
      }
    } catch (error) {
      console.error(
        "LOAD SHOPS ERROR:",
        error
      );

      setMessage(
        "Unable to connect to the shop system."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    loadShops();
    checkUserSession();
  }, []);

  // ==========================================
  // SEARCH
  // ==========================================

  const filteredShops = shops.filter((shop) =>
    shop.name
      ?.toLowerCase()
      .includes(search.toLowerCase())
  );

  // ==========================================
  // CHECK STUDENT
  // ==========================================

  const isStudent =
    user?.role === "student";

  // ==========================================
  // OPEN SHOP
  // ==========================================

  function openShop(shop) {
    router.push(`/shop/${shop.user_id}`);
  }

  // ==========================================
  // OPEN CART
  // ==========================================

  function openCart() {
    if (!isStudent) {
      router.push("/login");
      return;
    }

    router.push("/cart");
  }

  // ==========================================
  // OPEN ORDERS
  // ==========================================

  function openOrders() {
    if (!isStudent) {
      router.push("/login");
      return;
    }

    router.push("/orders");
  }

  // ==========================================
  // OPEN ACCOUNT
  // ==========================================

  function openAccount() {
    setAccountOpen(false);
    router.push("/student/account");
  }

  // ==========================================
  // LOGOUT
  // ==========================================

  async function handleLogout() {
    setAccountOpen(false);

    try {
      const response = await fetch(
        "/api/logout",
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(
          "LOGOUT FAILED:",
          data.message
        );
      }
    } catch (error) {
      console.error(
        "LOGOUT ERROR:",
        error
      );
    } finally {
      setUser(null);
      router.replace("/");
      router.refresh();
    }
  }

  // ==========================================
  // GET FOOD COURT NAME
  // ==========================================

  function getFoodCourtName(shop) {
    return (
      shop.food_court_name ||
      shop.foodCourtName ||
      shop.food_court ||
      shop.foodCourt ||
      "University Food Court"
    );
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

        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-6">

          {/* LOGO */}

          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-2xl font-bold font-serif"
          >
            UniPlate
          </button>

          {/* FOOD COURT */}

          <button
            type="button"
            className="hidden md:block border border-[#e2d8cb] bg-white rounded-full px-5 py-2 text-sm"
          >
            📍 University Food Court
          </button>

          {/* SEARCH */}

          <div className="hidden md:block flex-1 max-w-md">

            <div className="relative">

              <span className="absolute left-4 top-2.5 text-gray-400">
                🔍
              </span>

              <input
                type="text"
                placeholder="Search food shops"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                className="w-full border border-[#ded5ca] bg-white rounded-full py-3 pl-11 pr-5 outline-none focus:border-[#c63d20]"
              />

            </div>

          </div>

          {/* =================================
              LOGIN / ACCOUNT AREA
          ================================= */}

          <div className="flex items-center gap-2">

            {/* =================================
                MY ORDERS
                STUDENT ONLY
            ================================= */}

            {!checkingUser &&
              isStudent && (

                <button
                  type="button"
                  onClick={openOrders}
                  className="hidden md:block border border-[#ded5ca] bg-white text-[#211e1a] hover:bg-[#211e1a] hover:text-white rounded-full px-5 py-3 font-semibold text-sm transition"
                >
                  📦 My Orders
                </button>

              )}

            {/* =================================
                LOGIN
                SHOW WHEN NOT LOGGED IN
                OR NON-STUDENT
            ================================= */}

            {!checkingUser &&
              !isStudent && (

                <button
                  type="button"
                  onClick={() =>
                    router.push("/login")
                  }
                  className="border border-[#211e1a] bg-white text-[#211e1a] hover:bg-[#211e1a] hover:text-white rounded-full px-5 py-3 font-semibold text-sm transition"
                >
                  Login
                </button>

              )}

            {/* =================================
                STUDENT ACCOUNT
            ================================= */}

            {!checkingUser &&
              isStudent && (

                <div className="relative">

                  {/* ACCOUNT BUTTON */}

                  <button
                    type="button"
                    onClick={() =>
                      setAccountOpen(
                        (previous) =>
                          !previous
                      )
                    }
                    className="flex items-center gap-2 border border-[#ded5ca] bg-white hover:bg-[#f7f3ee] rounded-full px-3 py-2 transition"
                  >

                    {/* USER ICON */}

                    <div className="w-9 h-9 rounded-full bg-[#211e1a] text-white flex items-center justify-center font-semibold text-sm">
                      {user?.name
                        ? user.name
                            .charAt(0)
                            .toUpperCase()
                        : "S"}
                    </div>

                    {/* NAME */}

                    <span className="hidden lg:block max-w-[120px] truncate text-sm font-semibold">
                      {user?.name ||
                        "Student"}
                    </span>

                    {/* ARROW */}

                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={
                        accountOpen
                          ? "rotate-180 transition"
                          : "transition"
                      }
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>

                  </button>

                  {/* =================================
                      ACCOUNT DROPDOWN
                  ================================= */}

                  {accountOpen && (

                    <div className="absolute right-0 top-full mt-3 w-72 bg-white border border-[#e5ddd2] rounded-2xl shadow-xl overflow-hidden z-50">

                      {/* USER INFO */}

                      <div className="px-5 py-4 bg-[#faf7f2] border-b border-[#eee7df]">

                        <div className="flex items-center gap-3">

                          <div className="w-11 h-11 rounded-full bg-[#211e1a] text-white flex items-center justify-center font-semibold">
                            {user?.name
                              ? user.name
                                  .charAt(0)
                                  .toUpperCase()
                              : "S"}
                          </div>

                          <div className="min-w-0">

                            <p className="font-semibold text-sm truncate">
                              {user?.name ||
                                "Student"}
                            </p>

                            <p className="text-xs text-[#77706a] truncate">
                              {user?.email ||
                                ""}
                            </p>

                          </div>

                        </div>

                      </div>

                      {/* MY ACCOUNT */}

                      <button
                        type="button"
                        onClick={openAccount}
                        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#f8f5f1] transition"
                      >

                        <span className="w-9 h-9 rounded-full bg-[#f5e9df] flex items-center justify-center">
                          👤
                        </span>

                        <div>

                          <div className="text-sm font-semibold">
                            My Account
                          </div>

                          <div className="text-xs text-gray-500">
                            View and edit your account
                          </div>

                        </div>

                      </button>

                      {/* MANAGE ACCOUNT */}

                      <button
                        type="button"
                        onClick={openAccount}
                        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#f8f5f1] transition"
                      >

                        <span className="w-9 h-9 rounded-full bg-[#f5e9df] flex items-center justify-center">
                          ⚙️
                        </span>

                        <div>

                          <div className="text-sm font-semibold">
                            Manage Account
                          </div>

                          <div className="text-xs text-gray-500">
                            Update name, phone & password
                          </div>

                        </div>

                      </button>

                      {/* DIVIDER */}

                      <div className="border-t border-[#eee7df]" />

                      {/* LOGOUT */}

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-red-50 transition"
                      >

                        <span className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
                          🚪
                        </span>

                        <div>

                          <div className="text-sm font-semibold text-red-600">
                            Logout
                          </div>

                          <div className="text-xs text-gray-500">
                            Sign out of your account
                          </div>

                        </div>

                      </button>

                    </div>

                  )}

                </div>

              )}

            {/* =================================
                CART
                STUDENT ONLY
            ================================= */}

            {!checkingUser &&
              isStudent && (

                <button
                  type="button"
                  onClick={openCart}
                  className="bg-[#211e1a] text-white rounded-full px-5 py-3 font-semibold text-sm hover:bg-[#332e29] transition"
                >
                  🛒 Cart

                  <span className="ml-2 bg-[#d94825] rounded-full px-2 py-1 text-xs">
                    0
                  </span>

                </button>

              )}

          </div>

        </div>

      </header>

      {/* =====================================
          HERO
      ===================================== */}

      <section className="max-w-6xl mx-auto px-6 pt-10">

        <p className="text-sm font-semibold text-[#6b8060] mb-2">
          Pickup from University Food Court
        </p>

        <h1 className="font-serif text-5xl font-bold leading-tight max-w-xl">
          What are you craving
          <br />
          today?
        </h1>

        <p className="mt-4 text-[#77706a] text-lg">
          Choose a shop, order your food,
          and pick it up when it&apos;s ready.
        </p>

      </section>

      {/* =====================================
          FOOD SHOPS
      ===================================== */}

      <section className="max-w-6xl mx-auto px-6 mt-10 pb-16">

        {/* TITLE */}

        <div className="flex items-end justify-between mb-6">

          <div>

            <h2 className="text-2xl font-bold">
              Food Shops
            </h2>

            <p className="text-sm text-[#77706a] mt-1">
              Choose a shop to view its menu
            </p>

          </div>

          <div className="text-sm text-[#77706a]">
            {filteredShops.length} shops
          </div>

        </div>

        {/* =====================================
            ERROR
        ===================================== */}

        {message && (

          <div className="bg-white border border-red-200 rounded-xl p-4 text-red-600 text-sm mb-6">
            {message}
          </div>

        )}

        {/* =====================================
            LOADING
        ===================================== */}

        {loading ? (

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {[1, 2, 3].map((item) => (

              <div
                key={item}
                className="bg-white rounded-2xl overflow-hidden border border-[#e5ddd2] animate-pulse"
              >

                <div className="h-52 bg-gray-200" />

                <div className="p-5">

                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />

                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-5" />

                  <div className="h-4 bg-gray-200 rounded w-2/3" />

                </div>

              </div>

            ))}

          </div>

        ) : filteredShops.length === 0 ? (

          /* =====================================
              NO SHOPS
          ===================================== */

          <div className="bg-white border border-dashed border-[#d8d0c6] rounded-2xl p-12 text-center">

            <div className="text-5xl mb-4">
              🏪
            </div>

            <h3 className="text-xl font-bold">
              No shops available
            </h3>

            <p className="text-sm text-gray-500 mt-2">
              {search
                ? `No shops found for "${search}".`
                : "There are currently no approved food shops."}
            </p>

            {search && (

              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
                className="mt-4 text-[#d94825] text-sm font-semibold hover:underline"
              >
                Clear Search
              </button>

            )}

          </div>

        ) : (

          /* =====================================
              SHOP CARDS
          ===================================== */

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {filteredShops.map((shop) => (

              <div
                key={shop.user_id}
                className="bg-white rounded-2xl overflow-hidden border border-[#e5ddd2] hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
              >

                {/* =================================
                    SHOP PHOTO
                ================================= */}

                <div className="relative h-52 bg-[#f3e7df] overflow-hidden">

                  {shop.shop_image ? (

                    <img
                      src={shop.shop_image}
                      alt={`${shop.name} shop`}
                      className="w-full h-full object-cover"
                    />

                  ) : (

                    <div className="w-full h-full flex flex-col items-center justify-center">

                      <div className="w-20 h-20 rounded-2xl bg-[#f8ded3] flex items-center justify-center text-4xl">
                        🏪
                      </div>

                      <p className="text-sm text-gray-500 mt-3">
                        Shop photo not available
                      </p>

                    </div>

                  )}

                  {/* OPEN BADGE */}

                  <div className="absolute top-4 right-4">

                    <span className="bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow">
                      ● Open
                    </span>

                  </div>

                </div>

                {/* =================================
                    SHOP INFORMATION
                ================================= */}

                <div className="p-5">

                  {/* SHOP NAME */}

                  <h3 className="text-xl font-bold text-[#171717]">
                    {shop.name}
                  </h3>

                  {/* TYPE */}

                  <p className="text-sm text-gray-500 mt-1">
                    Food Shop
                  </p>

                  {/* FOOD COURT */}

                  <div className="flex items-center gap-2 mt-4">

                    <span className="text-lg">
                      📍
                    </span>

                    <span className="text-sm text-[#6b8060]">
                      {getFoodCourtName(shop)}
                    </span>

                  </div>

                  {/* DIVIDER */}

                  <div className="border-t border-[#eee8e0] mt-5 pt-4">

                    <div className="flex items-center justify-between">

                      {/* VIEW MENU */}

                      <button
                        type="button"
                        onClick={() =>
                          openShop(shop)
                        }
                        className="text-[#d94825] font-semibold text-sm hover:text-[#b9361c] transition"
                      >
                        View Menu
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openShop(shop)
                        }
                        className="text-[#d94825] text-lg hover:translate-x-1 transition"
                      >
                        →
                      </button>

                    </div>

                  </div>

                </div>

              </div>

            ))}

          </div>

        )}

      </section>

    </main>
  );
}