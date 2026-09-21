"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ShopPage() {
  const router = useRouter();
  const params = useParams();

  const shopId = params?.id;

  const [shop, setShop] = useState(null);
  const [menuItems, setMenuItems] = useState([]);

  const [loading, setLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(true);

  const [message, setMessage] = useState("");

  const [activeCategory, setActiveCategory] =
    useState("All");

  const [loggedIn, setLoggedIn] =
    useState(false);

  const [user, setUser] = useState(null);

  const [cartCount, setCartCount] =
    useState(0);

  // ==========================================
  // LOAD SHOP
  // ==========================================
  async function loadShop() {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `/api/shops/${shopId}/menu`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (data.success) {
        setShop(data.shop);
        setMenuItems(data.menuItems || []);
      } else {
        setMessage(
          data.message ||
            "Unable to load shop menu."
        );
      }
    } catch (error) {
      console.error(
        "LOAD SHOP ERROR:",
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
  // LOAD LOGIN SESSION
  // ==========================================
  async function loadSession() {
    try {
      setSessionLoading(true);

      const response = await fetch(
        "/api/auth/session",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      // NOT LOGGED IN
      if (
        !data.success ||
        !data.loggedIn
      ) {
        setLoggedIn(false);
        setUser(null);
        setCartCount(0);
        return;
      }

      // LOGGED IN
      setLoggedIn(true);

      setUser(data.user);

      // ONLY STUDENT CAN HAVE CART
      if (
        data.user?.role === "student"
      ) {
        loadCartCount();
      } else {
        setCartCount(0);
      }
    } catch (error) {
      console.error(
        "LOAD SESSION ERROR:",
        error
      );

      // Treat errors as guest
      setLoggedIn(false);
      setUser(null);
      setCartCount(0);
    } finally {
      setSessionLoading(false);
    }
  }

  // ==========================================
  // LOAD CART COUNT
  // ==========================================
  function loadCartCount() {
    try {
      const savedCart =
        JSON.parse(
          localStorage.getItem(
            "uniplate_cart"
          ) || "[]"
        );

      const total =
        savedCart.reduce(
          (sum, item) =>
            sum +
            Number(
              item.quantity || 0
            ),
          0
        );

      setCartCount(total);
    } catch (error) {
      console.error(
        "LOAD CART ERROR:",
        error
      );

      setCartCount(0);
    }
  }

  // ==========================================
  // INITIAL LOAD
  // ==========================================
  useEffect(() => {
    if (!shopId) return;

    loadShop();
    loadSession();
  }, [shopId]);

  // ==========================================
  // UPDATE CART COUNT
  // ==========================================
  useEffect(() => {
    if (
      loggedIn &&
      user?.role === "student"
    ) {
      loadCartCount();
    } else {
      setCartCount(0);
    }
  }, [loggedIn, user]);

  // ==========================================
  // LISTEN FOR CART CHANGES
  // ==========================================
  useEffect(() => {
    function updateCart() {
      if (
        loggedIn &&
        user?.role === "student"
      ) {
        loadCartCount();
      } else {
        setCartCount(0);
      }
    }

    window.addEventListener(
      "cartUpdated",
      updateCart
    );

    window.addEventListener(
      "storage",
      updateCart
    );

    return () => {
      window.removeEventListener(
        "cartUpdated",
        updateCart
      );

      window.removeEventListener(
        "storage",
        updateCart
      );
    };
  }, [loggedIn, user]);

  // ==========================================
  // CATEGORIES
  // ==========================================
  const categories = useMemo(() => {
    const uniqueCategories = [
      ...new Set(
        menuItems
          .map(
            (item) =>
              item.category
          )
          .filter(Boolean)
      ),
    ];

    return [
      "All",
      ...uniqueCategories,
    ];
  }, [menuItems]);

  // ==========================================
  // FILTER MENU
  // ==========================================
  const filteredItems = useMemo(() => {
    if (
      activeCategory === "All"
    ) {
      return menuItems;
    }

    return menuItems.filter(
      (item) =>
        item.category ===
        activeCategory
    );
  }, [
    menuItems,
    activeCategory,
  ]);

  // ==========================================
  // GROUP MENU
  // ==========================================
  const groupedMenu = useMemo(() => {
    const groups = {};

    filteredItems.forEach(
      (item) => {
        const category =
          item.category ||
          "Other";

        if (!groups[category]) {
          groups[category] = [];
        }

        groups[category].push(item);
      }
    );

    return groups;
  }, [filteredItems]);

  // ==========================================
  // CATEGORY SCROLL
  // ==========================================
  function scrollToCategory(
    category
  ) {
    setActiveCategory(
      category
    );

    if (
      category === "All"
    ) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    setTimeout(() => {
      const element =
        document.getElementById(
          `category-${category}`
        );

      if (element) {
        const offset = 95;

        const top =
          element.getBoundingClientRect()
            .top +
          window.scrollY -
          offset;

        window.scrollTo({
          top,
          behavior: "smooth",
        });
      }
    }, 50);
  }

  // ==========================================
  // ADD TO CART
  // ==========================================
  function handleAddToCart(
    item
  ) {
    // VERY IMPORTANT:
    // ONLY STUDENTS CAN ADD FOOD
    if (
      !loggedIn ||
      user?.role !== "student"
    ) {
      router.push("/login");
      return;
    }

    try {
      const existingCart =
        JSON.parse(
          localStorage.getItem(
            "uniplate_cart"
          ) || "[]"
        );

      const existingItem =
        existingCart.find(
          (cartItem) =>
            cartItem.menu_item_id ===
            item.menu_item_id
        );

      let updatedCart;

      if (existingItem) {
        updatedCart =
          existingCart.map(
            (cartItem) =>
              cartItem.menu_item_id ===
              item.menu_item_id
                ? {
                    ...cartItem,
                    quantity:
                      Number(
                        cartItem.quantity ||
                          0
                      ) + 1,
                  }
                : cartItem
          );
      } else {
        updatedCart = [
          ...existingCart,
          {
            menu_item_id:
              item.menu_item_id,

            shop_owner_id:
              item.shop_owner_id,

            food_court_id:
              item.food_court_id,

            name:
              item.name,

            description:
              item.description,

            price:
              Number(
                item.price
              ),

            image:
              item.image,

            category:
              item.category,

            quantity: 1,

            shop_id:
              shopId,

            shop_name:
              shop.name,
          },
        ];
      }

      localStorage.setItem(
        "uniplate_cart",
        JSON.stringify(
          updatedCart
        )
      );

      const totalItems =
        updatedCart.reduce(
          (total, cartItem) =>
            total +
            Number(
              cartItem.quantity ||
                0
            ),
          0
        );

      setCartCount(
        totalItems
      );

      window.dispatchEvent(
        new Event(
          "cartUpdated"
        )
      );
    } catch (error) {
      console.error(
        "ADD TO CART ERROR:",
        error
      );
    }
  }

  // ==========================================
  // LOADING
  // ==========================================
  if (
    loading ||
    sessionLoading
  ) {
    return (
      <main className="min-h-screen bg-[#faf7f2] flex items-center justify-center">

        <div className="text-center">

          <div className="w-8 h-8 border-2 border-[#d94825] border-t-transparent rounded-full animate-spin mx-auto mb-3" />

          <p className="text-sm text-[#6f685f]">
            Loading menu...
          </p>

        </div>

      </main>
    );
  }

  // ==========================================
  // ERROR
  // ==========================================
  if (
    message ||
    !shop
  ) {
    return (
      <main className="min-h-screen bg-[#faf7f2] flex items-center justify-center px-4">

        <div className="text-center">

          <h2 className="text-xl font-semibold text-[#211e1a] mb-2">
            Shop unavailable
          </h2>

          <p className="text-sm text-[#77716a] mb-5">
            {message ||
              "Shop not found."}
          </p>

          <button
            onClick={() =>
              router.push("/")
            }
            className="px-5 py-2.5 rounded-lg bg-[#211e1a] text-white text-sm font-medium hover:bg-[#342f29]"
          >
            Back to Food Shops
          </button>

        </div>

      </main>
    );
  }

  // ==========================================
  // MAIN PAGE
  // ==========================================
  return (
    <main className="min-h-screen bg-[#faf7f2] text-[#211e1a]">

      {/* =====================================
          HEADER
      ===================================== */}
      <header className="sticky top-0 z-50 bg-[#faf7f2]/95 backdrop-blur border-b border-[#e8e1d8]">

        <div className="max-w-[1450px] mx-auto px-5">

          <div className="h-[58px] flex items-center justify-between gap-4">

            {/* LEFT */}
            <div className="flex items-center gap-3 min-w-0">

              <button
                onClick={() =>
                  router.push("/")
                }
                className="w-8 h-8 rounded-full border border-[#ddd5cb] bg-white flex items-center justify-center hover:bg-[#f3eee8] transition"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>

              <div className="min-w-0">

                <h1 className="text-[17px] font-semibold truncate">
                  {shop.name}
                </h1>

                <div className="flex items-center gap-2 text-[10px] text-[#77716a]">

                  <span className="flex items-center gap-1">

                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />

                    Open

                  </span>

                  <span>
                    •
                  </span>

                  <span>
                    Pickup
                  </span>

                  <span>
                    •
                  </span>

                  <span>
                    QR Payment
                  </span>

                </div>

              </div>

            </div>

            {/* RIGHT */}
            <div className="flex items-center gap-2 shrink-0">

              {/* =================================
                  GUEST LOGIN
              ================================= */}
              {!loggedIn && (
                <button
                  onClick={() =>
                    router.push(
                      "/login"
                    )
                  }
                  className="px-4 py-1.5 rounded-lg border border-[#211e1a] bg-white text-xs font-semibold hover:bg-[#211e1a] hover:text-white transition"
                >
                  Login
                </button>
              )}

              {/* =================================
                  STUDENT CART
                  ONLY STUDENT
              ================================= */}
              {loggedIn &&
                user?.role ===
                  "student" && (
                  <button
                    onClick={() =>
                      router.push(
                        "/cart"
                      )
                    }
                    className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#211e1a] text-white text-xs font-medium hover:bg-[#d94825]"
                  >

                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle
                        cx="9"
                        cy="20"
                        r="1"
                      />

                      <circle
                        cx="20"
                        cy="20"
                        r="1"
                      />

                      <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L23 6H6" />
                    </svg>

                    Cart

                    <span className="min-w-[17px] h-[17px] px-1 rounded-full bg-[#d94825] text-[9px] flex items-center justify-center">
                      {cartCount}
                    </span>

                  </button>
                )}

            </div>

          </div>

          {/* =================================
              CATEGORY BAR
          ================================= */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-hide">

            {categories.map(
              (category) => (

                <button
                  key={category}
                  onClick={() =>
                    scrollToCategory(
                      category
                    )
                  }
                  className={`px-3 py-1.5 rounded-full text-[10px] font-medium whitespace-nowrap transition ${
                    activeCategory ===
                    category
                      ? "bg-[#211e1a] text-white"
                      : "bg-white border border-[#e6dfd6] text-[#6c655d] hover:bg-[#f2ede7]"
                  }`}
                >
                  {category}
                </button>

              )
            )}

          </div>

        </div>

      </header>

      {/* =====================================
          SHOP INFORMATION
      ===================================== */}
      <section className="max-w-[1450px] mx-auto px-5 pt-4 pb-3">

        <div className="flex items-center gap-3">

          {/* SHOP IMAGE */}
          <div className="w-[62px] h-[62px] rounded-lg overflow-hidden bg-[#eee7de] shrink-0">

            {shop.shop_image ? (

              <img
                src={
                  shop.shop_image
                }
                alt={
                  shop.name
                }
                className="w-full h-full object-cover"
              />

            ) : (

              <div className="w-full h-full flex items-center justify-center text-xl">
                🍽
              </div>

            )}

          </div>

          {/* SHOP DETAILS */}
          <div className="min-w-0">

            <h2 className="text-[20px] font-semibold">
              {shop.name}
            </h2>

            <p className="text-[11px] text-[#77716a] mt-0.5">
              Fresh food prepared for university students
            </p>

            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#77716a]">

              <span>
                Pre-order
              </span>

              <span>
                •
              </span>

              <span>
                QR Payment
              </span>

              <span>
                •
              </span>

              <span>
                Pickup
              </span>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================
          MENU
      ===================================== */}
      <section className="max-w-[1450px] mx-auto px-5 pb-8">

        {Object.keys(
          groupedMenu
        ).length === 0 ? (

          <div className="bg-white border border-[#e8e1d8] rounded-xl p-8 text-center">

            <p className="text-sm text-[#77716a]">
              No menu items available.
            </p>

          </div>

        ) : (

          Object.entries(
            groupedMenu
          ).map(
            ([category, items]) => (

              <div
                key={category}
                id={`category-${category}`}
                className="mb-6 scroll-mt-[95px]"
              >

                {/* CATEGORY TITLE */}
                <div className="flex items-center justify-between mb-2.5">

                  <div>

                    <h3 className="text-[16px] font-semibold">
                      {category}
                    </h3>

                    <p className="text-[9px] text-[#8b847c]">
                      {items.length} items
                    </p>

                  </div>

                  <div className="h-px bg-[#e5ded5] flex-1 ml-4" />

                </div>

                {/* FOOD GRID */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">

                  {items.map(
                    (item) => (

                      <div
                        key={
                          item.menu_item_id
                        }
                        className="bg-white border border-[#e7e0d7] rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                      >

                        {/* IMAGE */}
                        <div className="h-[115px] bg-[#eee8df] overflow-hidden">

                          {item.image ? (

                            <img
                              src={
                                item.image
                              }
                              alt={
                                item.name
                              }
                              className="w-full h-full object-cover"
                            />

                          ) : (

                            <div className="w-full h-full flex items-center justify-center text-2xl">
                              🍛
                            </div>

                          )}

                        </div>

                        {/* CONTENT */}
                        <div className="p-2.5">

                          <h4 className="font-semibold text-[13px] leading-tight line-clamp-1">
                            {item.name}
                          </h4>

                          {/* DESCRIPTION */}
                          <p className="text-[9px] text-[#817a72] leading-relaxed mt-1 line-clamp-2 min-h-[25px]">
                            {item.description ||
                              "Freshly prepared food."}
                          </p>

                          {/* PRICE + ACTION */}
                          <div className="flex items-center justify-between gap-2 mt-2.5">

                            {/* PRICE */}
                            <span className="text-[14px] font-bold text-[#d94825]">
                              ฿
                              {Number(
                                item.price
                              ).toFixed(0)}
                            </span>

                            {/* =================================
                                IMPORTANT:
                                GUEST = NO ADD BUTTON
                            ================================= */}

                            {loggedIn &&
                            user?.role ===
                              "student" ? (

                              <button
                                onClick={() =>
                                  handleAddToCart(
                                    item
                                  )
                                }
                                disabled={
                                  !item.availability
                                }
                                className={`px-2.5 py-1.5 rounded-md text-[9px] font-semibold transition ${
                                  item.availability
                                    ? "bg-[#211e1a] text-white hover:bg-[#d94825]"
                                    : "bg-[#eee9e3] text-[#9a938b] cursor-not-allowed"
                                }`}
                              >
                                {item.availability
                                  ? "+ Add"
                                  : "Unavailable"}
                              </button>

                            ) : (

                              /*
                               * GUEST VIEW
                               * Only show availability text.
                               * NO CART.
                               * NO ADD BUTTON.
                               */

                              <span className="text-[9px] text-[#99918a]">
                                View only
                              </span>

                            )}

                          </div>

                        </div>

                      </div>

                    )
                  )}

                </div>

              </div>

            )
          )

        )}

      </section>

      {/* =====================================
          FLOATING CART
          STUDENT ONLY
      ===================================== */}
      {loggedIn &&
        user?.role ===
          "student" &&
        cartCount > 0 && (

          <button
            onClick={() =>
              router.push(
                "/cart"
              )
            }
            className="fixed bottom-5 right-5 z-40 bg-[#211e1a] text-white rounded-xl shadow-xl px-4 py-2.5 flex items-center gap-3 hover:bg-[#d94825] transition"
          >

            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">

              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle
                  cx="9"
                  cy="20"
                  r="1"
                />

                <circle
                  cx="20"
                  cy="20"
                  r="1"
                />

                <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L23 6H6" />
              </svg>

            </div>

            <div className="text-left">

              <p className="text-[9px] text-white/60">
                Your cart
              </p>

              <p className="text-[11px] font-semibold">
                {cartCount}{" "}
                {cartCount !== 1
                  ? "items"
                  : "item"}
              </p>

            </div>

            <span className="text-sm">
              →
            </span>

          </button>
        )}

    </main>
  );
}