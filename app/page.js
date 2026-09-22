"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const [user, setUser] = useState(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);

  // CONTACT US
  const [contactOpen, setContactOpen] = useState(false);

  // =========================================================
  // USER SESSION
  // =========================================================

  async function checkUserSession() {
    try {
      setCheckingUser(true);

      const response = await fetch("/api/me", {
        cache: "no-store",
      });

      const data = await response.json();

      if (response.ok && data.success && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("CHECK USER SESSION ERROR:", error);
      setUser(null);
    } finally {
      setCheckingUser(false);
    }
  }

  // =========================================================
  // LOAD SHOPS
  // =========================================================

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
          data.message || "Unable to load shops."
        );
      }
    } catch (error) {
      console.error("LOAD SHOPS ERROR:", error);

      setMessage(
        "Unable to connect to the shop system."
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadShops();
    checkUserSession();
  }, []);

  // =========================================================
  // SEARCH
  // =========================================================

  const filteredShops = shops.filter((shop) =>
    shop.name
      ?.toLowerCase()
      .includes(search.toLowerCase())
  );

  const isStudent = user?.role === "student";

  // =========================================================
  // NAVIGATION
  // =========================================================

  function openShop(shop) {
    router.push(`/shop/${shop.user_id}`);
  }

  function openCart() {
    if (!isStudent) {
      router.push("/login");
      return;
    }

    router.push("/cart");
  }

  function openOrders() {
    if (!isStudent) {
      router.push("/login");
      return;
    }

    router.push("/orders");
  }

  function openAccount() {
    setAccountOpen(false);
    router.push("/student/account");
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  async function handleLogout() {
    setAccountOpen(false);

    try {
      const response = await fetch("/api/logout", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(
          "LOGOUT FAILED:",
          data.message
        );
      }
    } catch (error) {
      console.error("LOGOUT ERROR:", error);
    } finally {
      setUser(null);
      router.replace("/");
      router.refresh();
    }
  }

  // =========================================================
  // FOOD COURT NAME
  // =========================================================

  function getFoodCourtName(shop) {
    return (
      shop.food_court_name ||
      shop.foodCourtName ||
      shop.food_court ||
      shop.foodCourt ||
      "University Food Court"
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#171717]">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="sticky top-0 z-40 border-b border-[#e4ddd4] bg-[#f8f5ef]/95 backdrop-blur-md">

        <div className="mx-auto flex min-h-[64px] max-w-[1240px] items-center gap-3 px-4 sm:px-6 lg:px-8">

          {/* =================================================
              LOGO
          ================================================= */}

          <button
            type="button"
            onClick={() => router.push("/")}
            className="shrink-0 font-serif text-[24px] font-bold tracking-tight sm:text-[26px]"
          >
            UniPlate
          </button>

          {/* =================================================
              FOOD COURT
          ================================================= */}

          <div className="hidden items-center gap-2 rounded-full border border-[#ded5ca] bg-white px-4 py-2 text-[12px] font-semibold lg:flex">

            <span className="text-sm">
              📍
            </span>

            <span>
              University Food Court
            </span>

          </div>

          {/* =================================================
              DESKTOP SEARCH
          ================================================= */}

          <div className="mx-auto hidden w-full max-w-[430px] md:block">

            <div className="relative">

              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#918a82]"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                />

                <path d="m20 20-4-4" />
              </svg>

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search food shops"
                className="
                  h-[40px]
                  w-full
                  rounded-full
                  border
                  border-[#ded5ca]
                  bg-white
                  pl-10
                  pr-4
                  text-[13px]
                  outline-none
                  transition
                  placeholder:text-[#aaa49d]
                  focus:border-[#d78924]
                  focus:ring-4
                  focus:ring-[#d78924]/10
                "
              />

            </div>

          </div>

          {/* =================================================
              RIGHT SIDE
          ================================================= */}

          <div className="ml-auto flex items-center gap-2">

            {/* =================================================
                MY ORDERS
            ================================================= */}

            {!checkingUser && isStudent && (
              <button
                type="button"
                onClick={openOrders}
                className="
                  hidden
                  rounded-full
                  border
                  border-[#ded5ca]
                  bg-white
                  px-4
                  py-2
                  text-[12px]
                  font-bold
                  transition
                  hover:bg-[#171717]
                  hover:text-white
                  sm:block
                "
              >
                My Orders
              </button>
            )}

            {/* =================================================
                LOGIN
            ================================================= */}

            {!checkingUser && !isStudent && (
              <button
                type="button"
                onClick={() =>
                  router.push("/login")
                }
                className="
                  rounded-full
                  border
                  border-[#171717]
                  bg-white
                  px-5
                  py-2
                  text-[12px]
                  font-bold
                  transition
                  hover:bg-[#171717]
                  hover:text-white
                "
              >
                Login
              </button>
            )}

            {/* =================================================
                ACCOUNT
            ================================================= */}

            {!checkingUser && isStudent && (
              <div className="relative">

                <button
                  type="button"
                  onClick={() =>
                    setAccountOpen(
                      (prev) => !prev
                    )
                  }
                  className="
                    flex
                    items-center
                    gap-2
                    rounded-full
                    border
                    border-[#ded5ca]
                    bg-white
                    px-2
                    py-1
                    transition
                    hover:bg-[#f1ece5]
                  "
                >

                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#171717] text-[11px] font-bold text-white">

                    {user?.name
                      ? user.name
                          .charAt(0)
                          .toUpperCase()
                      : "S"}

                  </div>

                  <span className="hidden max-w-[90px] truncate text-[12px] font-bold sm:block">

                    {user?.name || "Student"}

                  </span>

                  <svg
                    width="13"
                    height="13"
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

                {/* ACCOUNT DROPDOWN */}

                {accountOpen && (
                  <div className="
                    absolute
                    right-0
                    top-11
                    z-50
                    w-[260px]
                    overflow-hidden
                    rounded-2xl
                    border
                    border-[#e2dacf]
                    bg-white
                    shadow-[0_15px_40px_rgba(0,0,0,0.12)]
                  ">

                    <div className="border-b border-[#eee8df] bg-[#faf7f2] px-4 py-3">

                      <div className="flex items-center gap-3">

                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#171717] text-xs font-bold text-white">

                          {user?.name
                            ? user.name
                                .charAt(0)
                                .toUpperCase()
                            : "S"}

                        </div>

                        <div className="min-w-0">

                          <p className="truncate text-sm font-bold">
                            {user?.name || "Student"}
                          </p>

                          <p className="truncate text-[11px] text-[#858078]">
                            {user?.email || ""}
                          </p>

                        </div>

                      </div>

                    </div>

                    <button
                      type="button"
                      onClick={openAccount}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#faf7f2]"
                    >
                      <span>
                        👤
                      </span>

                      <span className="text-sm font-semibold">
                        My Account
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={openAccount}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#faf7f2]"
                    >
                      <span>
                        ⚙️
                      </span>

                      <span className="text-sm font-semibold">
                        Manage Account
                      </span>
                    </button>

                    <div className="border-t border-[#eee8df]" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-red-600 hover:bg-red-50"
                    >
                      <span>
                        🚪
                      </span>

                      <span className="text-sm font-semibold">
                        Logout
                      </span>
                    </button>

                  </div>
                )}

              </div>
            )}

            {/* =================================================
                CART
            ================================================= */}

            {!checkingUser && isStudent && (
              <button
                type="button"
                onClick={openCart}
                className="
                  flex
                  items-center
                  gap-1.5
                  rounded-full
                  bg-[#171717]
                  px-3
                  py-2
                  text-[12px]
                  font-bold
                  text-white
                  transition
                  hover:bg-[#d78924]
                  hover:text-[#171717]
                "
              >

                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >

                  <circle
                    cx="9"
                    cy="20"
                    r="1"
                  />

                  <circle
                    cx="19"
                    cy="20"
                    r="1"
                  />

                  <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 8H6" />

                </svg>

                <span className="hidden sm:inline">
                  Cart
                </span>

                <span className="rounded-full bg-[#f4a340] px-1.5 py-0.5 text-[9px] text-[#171717]">
                  0
                </span>

              </button>
            )}

          </div>

        </div>

      </header>

      {/* =====================================================
          MOBILE SEARCH
      ===================================================== */}

      <div className="border-b border-[#e7e0d7] px-4 py-2.5 md:hidden">

        <div className="relative">

          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#918a82]"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >

            <circle
              cx="11"
              cy="11"
              r="7"
            />

            <path d="m20 20-4-4" />

          </svg>

          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search food shops"
            className="
              h-[38px]
              w-full
              rounded-full
              border
              border-[#ded5ca]
              bg-white
              pl-10
              pr-4
              text-[12px]
              outline-none
              focus:border-[#d78924]
              focus:ring-4
              focus:ring-[#d78924]/10
            "
          />

        </div>

      </div>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <section className="mx-auto w-full max-w-[1240px] px-4 pb-10 sm:px-6 lg:px-8">

        {/* ===================================================
            HERO
        =================================================== */}

        <div className="
          flex
          flex-col
          gap-6
          py-8
          sm:py-10
          lg:flex-row
          lg:items-center
          lg:justify-between
          lg:gap-10
          lg:py-12
        ">

          {/* HERO LEFT */}

          <div className="min-w-0">

            <div className="mb-2 flex items-center gap-2">

              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#d78924]" />

              <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#6b8060] sm:text-[12px]">
                Pickup from University Food Court
              </p>

            </div>

            <h1
              className="
                max-w-[760px]
                font-serif
                text-[36px]
                font-bold
                leading-[1.03]
                tracking-[-0.025em]
                sm:text-[46px]
                md:text-[52px]
                lg:text-[56px]
                xl:text-[60px]
              "
            >
              What are you craving
              <br className="hidden sm:block" />

              <span className="sm:hidden">
                {" "}
              </span>

              today?
            </h1>

            <p className="mt-4 max-w-[620px] text-[13px] leading-6 text-[#77706a] sm:text-[15px]">
              Choose a shop, order your food,
              and pick it up when it&apos;s ready.
            </p>

          </div>

          {/* =================================================
              CONTACT US
              NORMAL PAGE POSITION
              NOT STICKY
          ================================================= */}

          <div className="
            w-full
            shrink-0
            sm:max-w-[280px]
            lg:w-[280px]
            lg:max-w-none
          ">

            <div
              className="
                overflow-hidden
                rounded-2xl
                border
                border-[#e1d9cf]
                bg-white
                shadow-[0_12px_30px_rgba(23,23,23,0.06)]
              "
            >

              {/* CONTACT HEADER / BUTTON */}

              <button
                type="button"
                onClick={() =>
                  setContactOpen(
                    (prev) => !prev
                  )
                }
                className="
                  flex
                  w-full
                  items-center
                  justify-between
                  bg-[#faf7f2]
                  px-5
                  py-4
                  text-left
                  transition
                  hover:bg-[#f3eee7]
                "
              >

                <div className="flex items-center gap-3">

                  <div
                    className="
                      flex
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-[#171717]
                      text-white
                    "
                  >

                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
                    </svg>

                  </div>

                  <div>

                    <p className="text-sm font-bold">
                      Contact Us
                    </p>

                    <p className="mt-0.5 text-[10px] text-[#858078]">
                      {contactOpen
                        ? "Contact information"
                        : "We&apos;re happy to help you"}
                    </p>

                  </div>

                </div>

                {/* ARROW */}

                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={
                    contactOpen
                      ? "rotate-180 transition-transform"
                      : "transition-transform"
                  }
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>

              </button>

              {/* =================================================
                  CONTACT DETAILS
              ================================================= */}

              {contactOpen && (
                <div className="border-t border-[#eee8df] px-5 py-4">

                  {/* PHONE */}

                  <div className="flex items-center gap-3">

                    <div
                      className="
                        flex
                        h-8
                        w-8
                        shrink-0
                        items-center
                        justify-center
                        rounded-lg
                        bg-[#f7f0e8]
                        text-[#8b7156]
                      "
                    >

                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >

                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92Z" />

                      </svg>

                    </div>

                    <div>

                      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9a938b]">
                        Phone
                      </p>

                      <p className="mt-0.5 text-[13px] font-semibold text-[#171717]">
                        0950264406
                      </p>

                    </div>

                  </div>

                  {/* EMAIL */}

                  <div className="mt-4 flex items-center gap-3">

                    <div
                      className="
                        flex
                        h-8
                        w-8
                        shrink-0
                        items-center
                        justify-center
                        rounded-lg
                        bg-[#f7f0e8]
                        text-[#8b7156]
                      "
                    >

                      <svg
                        width="15"
                        height="15"
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

                    <div>

                      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9a938b]">
                        Email
                      </p>

                      <p className="mt-0.5 text-[13px] font-semibold text-[#171717]">
                        uniplate@rsu.edu
                      </p>

                    </div>

                  </div>

                  {/* LINE */}

                  <div className="mt-4 flex items-center gap-3">

                    <div
                      className="
                        flex
                        h-8
                        w-8
                        shrink-0
                        items-center
                        justify-center
                        rounded-lg
                        bg-[#f7f0e8]
                        text-[#8b7156]
                      "
                    >

                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >

                        <path d="M20.5 11.5c0 4.7-4.7 8.5-10.5 8.5-1 0-2-.1-2.9-.4L3 21l1.2-3.2C2.8 16.3 2 14.1 2 11.5 2 6.8 6.7 3 12.5 3s8 3.8 8 8.5Z" />

                      </svg>

                    </div>

                    <div>

                      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9a938b]">
                        LINE
                      </p>

                      <p className="mt-0.5 text-[13px] font-semibold text-[#171717]">
                        @waiyan166088
                      </p>

                    </div>

                  </div>

                </div>
              )}

            </div>

          </div>

        </div>

        {/* ===================================================
            SHOPS HEADER
        =================================================== */}

        <div className="flex items-end justify-between border-b border-[#dfd8cf] pb-3">

          <div>

            <h2 className="text-[19px] font-bold sm:text-[21px]">
              Food Shops
            </h2>

            <p className="mt-0.5 text-[11px] text-[#858078] sm:text-[12px]">
              Choose a shop to view its menu
            </p>

          </div>

          <span className="text-[11px] font-medium text-[#858078] sm:text-[12px]">
            {filteredShops.length} shops
          </span>

        </div>

        {/* ===================================================
            ERROR
        =================================================== */}

        {message && (
          <div className="mt-4 rounded-xl border border-red-200 bg-white p-3 text-sm text-red-600">
            {message}
          </div>
        )}

        {/* ===================================================
            SHOP AREA
        =================================================== */}

        <div className="py-5">

          {loading ? (

            <div className="
              grid
              grid-cols-1
              gap-5
              sm:grid-cols-2
              xl:grid-cols-3
            ">

              {[1, 2, 3].map((item) => (

                <div
                  key={item}
                  className="overflow-hidden rounded-2xl border border-[#e2dacf] bg-white"
                >

                  <div className="aspect-[2/1] animate-pulse bg-[#e9e4dd]" />

                  <div className="p-4">

                    <div className="mb-2 h-5 w-3/4 animate-pulse rounded bg-[#e9e4dd]" />

                    <div className="mb-5 h-3 w-1/2 animate-pulse rounded bg-[#e9e4dd]" />

                    <div className="h-3 w-2/3 animate-pulse rounded bg-[#e9e4dd]" />

                  </div>

                </div>

              ))}

            </div>

          ) : filteredShops.length === 0 ? (

            <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-[#d8d0c6] bg-white">

              <div className="text-center">

                <div className="mb-3 text-4xl">
                  🏪
                </div>

                <h3 className="text-lg font-bold">
                  No shops available
                </h3>

                <p className="mt-1 text-sm text-[#858078]">

                  {search
                    ? `No shops found for "${search}".`
                    : "There are currently no approved food shops."}

                </p>

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="mt-3 text-sm font-bold text-[#d78924] hover:underline"
                  >
                    Clear Search
                  </button>
                )}

              </div>

            </div>

          ) : (

            <div className="
              flex
              gap-4
              overflow-x-auto
              pb-3
              snap-x
              snap-mandatory
              scrollbar-thin

              sm:grid
              sm:grid-cols-2
              sm:overflow-visible
              sm:pb-0

              xl:grid-cols-3
            ">

              {filteredShops.map((shop) => (

                <article
                  key={shop.user_id}
                  className="
                    group
                    flex
                    min-w-[84vw]
                    snap-center
                    flex-col
                    overflow-hidden
                    rounded-2xl
                    border
                    border-[#e1d9cf]
                    bg-white
                    transition-all
                    duration-200
                    hover:-translate-y-1
                    hover:shadow-[0_15px_35px_rgba(23,23,23,0.08)]
                    sm:min-w-0
                  "
                >

                  {/* IMAGE */}

                  <div className="
                    relative
                    aspect-[2/1]
                    shrink-0
                    overflow-hidden
                    bg-[#eee6dd]
                  ">

                    {shop.shop_image ? (

                      <img
                        src={shop.shop_image}
                        alt={`${shop.name} shop`}
                        className="
                          h-full
                          w-full
                          object-cover
                          transition-transform
                          duration-500
                          group-hover:scale-[1.04]
                        "
                      />

                    ) : (

                      <div className="flex h-full flex-col items-center justify-center">

                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5e8dc] text-2xl">
                          🏪
                        </div>

                        <p className="mt-2 text-xs text-[#858078]">
                          Shop photo not available
                        </p>

                      </div>

                    )}

                    {/* OPEN */}

                    <div className="absolute right-3 top-3">

                      <span className="
                        inline-flex
                        items-center
                        gap-1.5
                        rounded-full
                        bg-white/95
                        px-2.5
                        py-1.5
                        text-[10px]
                        font-bold
                        text-[#238247]
                        shadow-sm
                      ">

                        <span className="h-1.5 w-1.5 rounded-full bg-[#16c965]" />

                        Open

                      </span>

                    </div>

                  </div>

                  {/* CONTENT */}

                  <div className="flex flex-1 flex-col p-4">

                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0">

                        <h3 className="
                          truncate
                          text-[17px]
                          font-bold
                          tracking-tight
                          sm:text-[18px]
                        ">
                          {shop.name}
                        </h3>

                        <p className="mt-0.5 text-[11px] text-[#858078]">
                          Food Shop
                        </p>

                      </div>

                      <span className="
                        shrink-0
                        rounded-lg
                        bg-[#f7f0e8]
                        px-2
                        py-1
                        text-[9px]
                        font-bold
                        uppercase
                        tracking-wide
                        text-[#8b7156]
                      ">
                        Campus
                      </span>

                    </div>

                    {/* LOCATION */}

                    <div className="mt-3 flex items-center gap-2">

                      <div className="
                        flex
                        h-7
                        w-7
                        shrink-0
                        items-center
                        justify-center
                        rounded-lg
                        bg-[#f7f0e8]
                      ">

                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#8b7156"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >

                          <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />

                          <circle
                            cx="12"
                            cy="10"
                            r="2.5"
                          />

                        </svg>

                      </div>

                      <span className="truncate text-[11px] text-[#77706a]">
                        {getFoodCourtName(shop)}
                      </span>

                    </div>

                    {/* ACTION */}

                    <div className="mt-5 flex items-center justify-between border-t border-[#eee8df] pt-3">

                      <div>

                        <p className="text-[10px] text-[#a09a92]">
                          Ready to order
                        </p>

                        <p className="mt-0.5 text-[11px] font-semibold text-[#6b8060]">
                          View today&apos;s menu
                        </p>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          openShop(shop)
                        }
                        className="
                          inline-flex
                          items-center
                          gap-1.5
                          rounded-full
                          bg-[#171717]
                          px-3.5
                          py-2
                          text-[11px]
                          font-bold
                          text-white
                          transition
                          hover:bg-[#d78924]
                          hover:text-[#171717]
                        "
                      >

                        Menu

                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >

                          <path d="M5 12h14" />

                          <path d="m13 6 6 6-6 6" />

                        </svg>

                      </button>

                    </div>

                  </div>

                </article>

              ))}

            </div>

          )}

        </div>

        {/* ===================================================
            MOBILE CAROUSEL INDICATOR
        =================================================== */}

        {!loading &&
          filteredShops.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pb-2 sm:hidden">

              {filteredShops.map(
                (shop, index) => (

                  <span
                    key={shop.user_id}
                    className={
                      index === 0
                        ? "h-1.5 w-5 rounded-full bg-[#171717]"
                        : "h-1.5 w-1.5 rounded-full bg-[#cfc6bb]"
                    }
                  />

                )
              )}

            </div>
          )}

      </section>

    </main>
  );
}