"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function ShopOwnerPage() {
  const router = useRouter();
  const profileRef = useRef(null);

  // =====================================================
  // ACCOUNT
  // =====================================================

  const [account, setAccount] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);

  const [accountForm, setAccountForm] = useState({
    name: "",
    phone: "",
    image: null,
  });

  // =====================================================
  // MENU
  // =====================================================

  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [menuMessage, setMenuMessage] = useState("");
  const [search, setSearch] = useState("");

  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [savingMenu, setSavingMenu] = useState(false);

  const [menuForm, setMenuForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "Rice",
    image: null,
  });

  // =====================================================
  // ORDERS
  // =====================================================

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // =====================================================
  // PAGE
  // =====================================================

  const [activePage, setActivePage] = useState("menu");

  // =====================================================
  // PROFILE OUTSIDE CLICK
  // =====================================================

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // =====================================================
  // LOAD ACCOUNT
  // =====================================================

  async function loadAccount() {
    try {
      const response = await fetch("/api/shopowner/account", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error("ACCOUNT ERROR:", data.message);
        return;
      }

      setAccount(data.user);

      setAccountForm({
        name: data.user?.name || "",
        phone: data.user?.phone || "",
        image: null,
      });
    } catch (error) {
      console.error("LOAD ACCOUNT ERROR:", error);
    }
  }

  // =====================================================
  // LOAD MENU
  // =====================================================

  async function loadMenu() {
    try {
      setLoadingMenu(true);
      setMenuMessage("");

      const response = await fetch("/api/shopowner/menu", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMenuMessage(data.message || "Unable to load menu.");
        return;
      }

      setMenuItems(data.menuItems || []);
    } catch (error) {
      console.error("LOAD MENU ERROR:", error);
      setMenuMessage("Unable to connect to menu system.");
    } finally {
      setLoadingMenu(false);
    }
  }

  // =====================================================
  // LOAD ORDERS
  // =====================================================

  async function loadOrders(showLoading = true) {
    try {
      if (showLoading) {
        setLoadingOrders(true);
      }

      setOrderMessage("");

      const response = await fetch("/api/shopowner/orders", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setOrderMessage(
          data.message || "Unable to load orders."
        );
        return;
      }

      setOrders(data.orders || []);
    } catch (error) {
      console.error("LOAD SHOP OWNER ORDERS ERROR:", error);
      setOrderMessage("Unable to connect to order system.");
    } finally {
      setLoadingOrders(false);
    }
  }

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    loadAccount();
    loadMenu();
    loadOrders();
  }, []);

  // =====================================================
  // ORDER AUTO REFRESH
  // =====================================================

  useEffect(() => {
    if (activePage !== "orders") {
      return;
    }

    loadOrders(false);

    const interval = setInterval(() => {
      loadOrders(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [activePage]);

  // =====================================================
  // SEARCH
  // =====================================================

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return menuItems;
    }

    return menuItems.filter((item) =>
      [
        item.name,
        item.description,
        item.category,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(keyword)
        )
    );
  }, [menuItems, search]);

  const riceItems = filteredItems.filter(
    (item) => item.category === "Rice"
  );

  const noodleItems = filteredItems.filter(
    (item) => item.category === "Noodles"
  );

  const otherItems = filteredItems.filter(
    (item) =>
      item.category !== "Rice" &&
      item.category !== "Noodles"
  );

  // =====================================================
  // MENU STATISTICS
  // =====================================================

  const totalMenuItems = menuItems.length;

  const availableItems = menuItems.filter(
    (item) =>
      item.availability === true ||
      item.availability === 1
  ).length;

  const menuGroups = new Set(
    menuItems
      .map((item) => item.category)
      .filter(Boolean)
  ).size;

  // =====================================================
  // MENU FUNCTIONS
  // =====================================================

  function openAddMenu() {
    setEditingItem(null);

    setMenuForm({
      name: "",
      description: "",
      price: "",
      category: "Rice",
      image: null,
    });

    setShowMenuModal(true);
  }

  function openEditMenu(item) {
    setEditingItem(item);

    setMenuForm({
      name: item.name || "",
      description: item.description || "",
      price: item.price || "",
      category: item.category || "Rice",
      image: null,
    });

    setShowMenuModal(true);
  }

  async function saveMenu(event) {
    event.preventDefault();

    if (!menuForm.name.trim()) {
      alert("Please enter food name.");
      return;
    }

    if (!menuForm.price) {
      alert("Please enter price.");
      return;
    }

    setSavingMenu(true);

    try {
      const formData = new FormData();

      formData.append("name", menuForm.name);
      formData.append(
        "description",
        menuForm.description || ""
      );
      formData.append("price", menuForm.price);
      formData.append("category", menuForm.category);

      if (menuForm.image) {
        formData.append("image", menuForm.image);
      }

      let response;

      if (editingItem) {
        response = await fetch(
          `/api/shopowner/menu/${editingItem.menu_item_id}`,
          {
            method: "PUT",
            body: formData,
          }
        );
      } else {
        response = await fetch("/api/shopowner/menu", {
          method: "POST",
          body: formData,
        });
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(
          data.message || "Unable to save menu."
        );
        return;
      }

      setShowMenuModal(false);
      setEditingItem(null);

      await loadMenu();
    } catch (error) {
      console.error("SAVE MENU ERROR:", error);
      alert("Unable to save menu.");
    } finally {
      setSavingMenu(false);
    }
  }

  async function deleteMenu(item) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.name}"?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/shopowner/menu/${item.menu_item_id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(
          data.message || "Unable to delete menu."
        );
        return;
      }

      await loadMenu();
    } catch (error) {
      console.error("DELETE MENU ERROR:", error);
      alert("Unable to delete menu.");
    }
  }

  // =====================================================
  // ORDER STATUS
  // =====================================================

  async function updateOrderStatus(order, newStatus) {
    if (!order?.order_id) {
      return;
    }

    setUpdatingOrderId(order.order_id);

    try {
      const response = await fetch(
        "/api/shopowner/order-status",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            order_id: order.order_id,
            status: newStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(
          data.message ||
            "Unable to update order status."
        );
        return;
      }

      // Immediately update UI
      setOrders((previous) =>
        previous.map((item) =>
          item.order_id === order.order_id
            ? {
                ...item,
                order_status: newStatus,
              }
            : item
        )
      );

      // Refresh from database
      await loadOrders(false);
    } catch (error) {
      console.error(
        "UPDATE ORDER STATUS ERROR:",
        error
      );

      alert("Unable to update order status.");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  // =====================================================
  // ORDER STATUS UI
  // =====================================================

  function getStatusStyle(status) {
    if (status === "pending") {
      return "bg-gray-100 text-gray-600";
    }

    if (status === "confirmed") {
      return "bg-blue-50 text-blue-600";
    }

    if (status === "preparing") {
      return "bg-orange-50 text-orange-600";
    }

    if (status === "ready") {
      return "bg-green-50 text-green-600";
    }

    if (status === "cancelled") {
      return "bg-red-50 text-red-600";
    }

    return "bg-gray-100 text-gray-600";
  }

  function getStatusLabel(status) {
    if (status === "pending") return "Pending";
    if (status === "confirmed") return "Confirmed";
    if (status === "preparing") return "Preparing";
    if (status === "ready") return "Ready";
    if (status === "cancelled") return "Cancelled";

    return status || "Unknown";
  }

  // =====================================================
  // ORDER CARD
  // =====================================================

  function OrderCard({ order }) {
    const status = order.order_status;

    const isUpdating =
      updatingOrderId === order.order_id;

    const isDelivery =
      order.fulfillment_type === "delivery";

    return (
      <div className="bg-white rounded-2xl border border-[#e9e1d8] overflow-hidden shadow-sm">

        {/* ORDER HEADER */}

        <div className="px-6 py-5 border-b border-[#eee7df] flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          <div>
            <div className="text-xs text-[#8b9bb0] uppercase tracking-wide">
              Order
            </div>

            <div className="text-2xl font-bold">
              #{order.order_id}
            </div>

            <div className="text-xs text-gray-400 mt-1">
              Checkout #{order.checkout_id}
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2">

            <span
              className={`px-3 py-1.5 rounded-full text-xs font-bold ${getStatusStyle(
                status
              )}`}
            >
              {getStatusLabel(status)}
            </span>

            <span className="text-sm text-gray-500">
              {isDelivery
                ? "🚚 Delivery"
                : "🏪 Pickup"}
            </span>

          </div>

        </div>

        {/* ORDER BODY */}

        <div className="px-6 py-5">

          {/* CUSTOMER */}

          <div className="mb-5">

            <div className="text-xs text-[#8b9bb0] uppercase tracking-wide mb-1">
              Customer
            </div>

            <div className="font-bold text-lg">
              {order.student_name || "Customer"}
            </div>

            <div className="text-sm text-[#55708d] mt-1">
              {order.delivery_phone ||
                order.student_phone ||
                "No phone number"}
            </div>

          </div>

          {/* DELIVERY INFO */}

          {isDelivery && (
            <div className="mb-5 bg-[#faf7f2] rounded-xl p-4">

              <div className="text-xs text-[#8b9bb0] uppercase tracking-wide mb-2">
                Delivery Information
              </div>

              <div className="text-sm">

                <div className="font-semibold">
                  Building
                </div>

                <div className="text-gray-600 mb-2">
                  {order.building_number ||
                    "Not provided"}
                </div>

                {order.delivery_note && (
                  <>
                    <div className="font-semibold">
                      Note
                    </div>

                    <div className="text-gray-600">
                      {order.delivery_note}
                    </div>
                  </>
                )}

              </div>

            </div>
          )}

          {/* ITEMS */}

          <div>

            <div className="text-xs text-[#8b9bb0] uppercase tracking-wide mb-3">
              Items
            </div>

            <div className="space-y-3">

              {(order.items || []).map((item) => (
                <div
                  key={item.order_item_id}
                  className="flex items-center justify-between gap-4 border-b border-[#eee7df] pb-3"
                >

                  <div className="min-w-0">

                    <div className="font-bold text-sm">
                      {item.menu_name}
                    </div>

                    <div className="text-xs text-gray-500 mt-1">
                      Quantity: {item.quantity}
                    </div>

                  </div>

                  <div className="font-bold whitespace-nowrap">
                    ฿
                    {Number(
                      item.subtotal ??
                        Number(item.price) *
                          Number(item.quantity)
                    ).toFixed(2)}
                  </div>

                </div>
              ))}

            </div>

          </div>

          {/* SHOP / TOTAL */}

          <div className="mt-5 pt-4 border-t border-[#eee7df] flex items-end justify-between">

            <div>

              <div className="text-xs text-[#8b9bb0] uppercase tracking-wide">
                Shop
              </div>

              <div className="font-bold">
                {order.shop_name ||
                  "Your Food Court"}
              </div>

            </div>

            <div className="text-right">

              <div className="text-xs text-[#8b9bb0] uppercase tracking-wide">
                Total
              </div>

              <div className="text-xl font-bold">
                ฿
                {Number(
                  order.total_amount || 0
                ).toFixed(2)}
              </div>

            </div>

          </div>

        </div>

        {/* ACTION AREA */}

        <div className="px-6 py-4 bg-[#faf8f5] border-t border-[#eee7df]">

          <div className="flex flex-wrap justify-end gap-2">

            {/* PENDING */}

            {status === "pending" && (
              <button
                type="button"
                disabled={isUpdating}
                onClick={() =>
                  updateOrderStatus(
                    order,
                    "confirmed"
                  )
                }
                className="bg-blue-600 text-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {isUpdating
                  ? "Updating..."
                  : "Confirm Order"}
              </button>
            )}

            {/* CONFIRMED */}

            {status === "confirmed" && (
              <button
                type="button"
                disabled={isUpdating}
                onClick={() =>
                  updateOrderStatus(
                    order,
                    "preparing"
                  )
                }
                className="bg-[#e84a25] text-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-[#d83d1d] disabled:opacity-50"
              >
                {isUpdating
                  ? "Updating..."
                  : "Start Preparing"}
              </button>
            )}

            {/* PREPARING */}

            {status === "preparing" && (
              <button
                type="button"
                disabled={isUpdating}
                onClick={() =>
                  updateOrderStatus(
                    order,
                    "ready"
                  )
                }
                className="bg-green-600 text-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                {isUpdating
                  ? "Updating..."
                  : isDelivery
                  ? "Ready for Delivery"
                  : "Ready for Pickup"}
              </button>
            )}

            {/* READY */}

            {status === "ready" && (
              <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                {isDelivery
                  ? "Waiting for Delivery"
                  : "Ready for Pickup"}
              </div>
            )}

            {/* VIEW */}

            <button
              type="button"
              onClick={() =>
                setSelectedOrder(order)
              }
              className="border border-[#ded5ca] bg-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-[#f5f1ec]"
            >
              View Order
            </button>

          </div>

        </div>

      </div>
    );
  }

  // =====================================================
  // ACCOUNT
  // =====================================================

  function handleAccountChange(event) {
    const {
      name,
      value,
      files,
    } = event.target;

    if (name === "image") {
      setAccountForm((previous) => ({
        ...previous,
        image: files?.[0] || null,
      }));

      return;
    }

    setAccountForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function openAccountManagement() {
    setProfileOpen(false);

    setAccountForm({
      name: account?.name || "",
      phone: account?.phone || "",
      image: null,
    });

    setShowAccountModal(true);
  }

  async function saveAccount(event) {
    event.preventDefault();

    if (!accountForm.name.trim()) {
      alert("Please enter shop name.");
      return;
    }

    setSavingAccount(true);

    try {
      const formData = new FormData();

      formData.append(
        "name",
        accountForm.name
      );

      formData.append(
        "phone",
        accountForm.phone || ""
      );

      if (accountForm.image) {
        formData.append(
          "image",
          accountForm.image
        );
      }

      const response = await fetch(
        "/api/shopowner/account",
        {
          method: "PUT",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(
          data.message ||
            "Unable to update account."
        );
        return;
      }

      setAccount(data.user);

      setAccountForm({
        name: data.user?.name || "",
        phone: data.user?.phone || "",
        image: null,
      });

      setShowAccountModal(false);
    } catch (error) {
      console.error(
        "ACCOUNT UPDATE ERROR:",
        error
      );

      alert(
        "Unable to update account."
      );
    } finally {
      setSavingAccount(false);
    }
  }

  // =====================================================
  // LOGOUT
  // =====================================================

  async function handleLogout() {
    setProfileOpen(false);

    try {
      await fetch("/api/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error(
        "LOGOUT ERROR:",
        error
      );
    } finally {
      router.replace("/login");
    }
  }

  // =====================================================
  // MENU CARD
  // =====================================================

  function MenuCard({ item }) {
    return (
      <div className="bg-white rounded-xl border border-[#e9e1d8] overflow-hidden shadow-sm hover:shadow-md transition">

        <div className="relative h-40 bg-[#f3eee8]">

          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">
              🍛
            </div>
          )}

          <div className="absolute top-2 right-2">

            {item.availability ? (
              <span className="bg-green-500 text-white px-2.5 py-1 rounded-full text-[11px] font-semibold">
                Available
              </span>
            ) : (
              <span className="bg-gray-500 text-white px-2.5 py-1 rounded-full text-[11px] font-semibold">
                Unavailable
              </span>
            )}

          </div>

        </div>

        <div className="p-4">

          <div className="flex justify-between gap-3">

            <h3 className="text-lg font-bold leading-tight">
              {item.name}
            </h3>

            <span className="text-[#e84a25] font-bold whitespace-nowrap">
              ฿
              {Number(item.price).toFixed(2)}
            </span>

          </div>

          {item.description && (
            <p className="text-gray-500 text-xs mt-2 line-clamp-2">
              {item.description}
            </p>
          )}

          <div className="flex gap-2 mt-4">

            <button
              type="button"
              onClick={() =>
                openEditMenu(item)
              }
              className="flex-1 border border-[#ded5ca] rounded-lg py-2 text-xs font-semibold hover:bg-[#f8f3ed]"
            >
              ✏️ Edit
            </button>

            <button
              type="button"
              onClick={() =>
                deleteMenu(item)
              }
              className="flex-1 border border-red-200 text-red-500 rounded-lg py-2 text-xs font-semibold hover:bg-red-50"
            >
              🗑️ Delete
            </button>

          </div>

        </div>

      </div>
    );
  }

  // =====================================================
  // CATEGORY SECTION
  // =====================================================

  function CategorySection({
    title,
    emoji,
    items,
  }) {
    if (items.length === 0) {
      return null;
    }

    return (
      <section className="mb-8">

        <div className="flex items-center gap-3 mb-4">

          <div className="w-10 h-10 rounded-lg bg-[#f8e9df] flex items-center justify-center text-xl">
            {emoji}
          </div>

          <div>

            <h2 className="text-lg font-bold">
              {title}
            </h2>

            <p className="text-gray-500 text-xs">
              {items.length}{" "}
              {items.length === 1
                ? "item"
                : "items"}
            </p>

          </div>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">

          {items.map((item) => (
            <MenuCard
              key={item.menu_item_id}
              item={item}
            />
          ))}

        </div>

      </section>
    );
  }

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <main className="min-h-screen bg-[#f8f6f3] text-[#171717] flex">

      {/* ==================================================
          SIDEBAR
      ================================================== */}

      <aside className="w-[250px] bg-[#211f1c] text-white min-h-screen flex flex-col flex-shrink-0">

        <div className="px-6 py-6 border-b border-[#3a3631]">

          <div className="text-2xl font-bold">
            UniPlate
          </div>

          <div className="text-[#aaa19a] mt-1.5 text-xs">
            Shop Management
          </div>

        </div>

        <div className="px-3 py-5">

          <button
            type="button"
            onClick={() =>
              setActivePage("menu")
            }
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-2 transition ${
              activePage === "menu"
                ? "bg-[#e84a25] text-white"
                : "text-[#b9b1aa] hover:bg-[#2d2925]"
            }`}
          >
            <span>🍽️</span>

            <span className="font-semibold text-sm">
              Menu
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setActivePage("orders")
            }
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
              activePage === "orders"
                ? "bg-[#e84a25] text-white"
                : "text-[#b9b1aa] hover:bg-[#2d2925]"
            }`}
          >
            <span>📦</span>

            <span className="font-semibold text-sm">
              Orders
            </span>

            {orders.filter(
              (order) =>
                order.order_status ===
                "confirmed"
            ).length > 0 && (
              <span className="ml-auto bg-white text-[#e84a25] text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {
                  orders.filter(
                    (order) =>
                      order.order_status ===
                      "confirmed"
                  ).length
                }
              </span>
            )}
          </button>

        </div>

        <div className="mt-auto">

          <div className="border-t border-[#3a3631] px-4 py-4">

            <div className="flex items-center gap-2.5">

              <div className="w-10 h-10 rounded-full bg-[#2d2925] overflow-hidden flex items-center justify-center flex-shrink-0">

                {account?.shop_image ? (
                  <img
                    src={account.shop_image}
                    alt={
                      account.name ||
                      "Shop"
                    }
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>👨‍🍳</span>
                )}

              </div>

              <div className="min-w-0">

                <div className="font-bold text-sm truncate">
                  {account?.name ||
                    "Shop Owner"}
                </div>

                <div className="text-[11px] text-[#aaa19a] truncate">
                  {account?.name ||
                    "Food Court"}
                </div>

              </div>

            </div>

          </div>

        </div>

      </aside>

      {/* ==================================================
          MAIN AREA
      ================================================== */}

      <div className="flex-1 min-w-0">

        {/* HEADER */}

        <header className="h-[68px] bg-white border-b border-[#e5ddd2] flex items-center justify-between px-7">

          <div>

            <div className="text-xs text-[#8b9bb0]">
              Shop Dashboard
            </div>

            <div className="text-lg font-bold">
              {activePage === "menu"
                ? "Menu Management"
                : "Orders"}
            </div>

          </div>

          <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={() =>
                setActivePage("orders")
              }
              className="relative w-10 h-10 rounded-full bg-[#f7f3ee] flex items-center justify-center"
            >
              <span className="text-lg">
                🔔
              </span>

              {orders.some(
                (order) =>
                  order.order_status ===
                    "confirmed" ||
                  order.order_status ===
                    "pending"
              ) && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#e84a25] rounded-full" />
              )}
            </button>

            {/* PROFILE */}

            <div
              ref={profileRef}
              className="relative"
            >

              <button
                type="button"
                onClick={() =>
                  setProfileOpen(
                    (previous) =>
                      !previous
                  )
                }
                className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-[#f7f3ee] transition"
              >

                <div className="w-9 h-9 rounded-full bg-[#f5e9df] overflow-hidden flex items-center justify-center">

                  {account?.shop_image ? (
                    <img
                      src={
                        account.shop_image
                      }
                      alt={
                        account.name ||
                        "Shop"
                      }
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>👨‍🍳</span>
                  )}

                </div>

                <div className="text-left max-w-[170px]">

                  <div className="font-bold text-sm truncate">
                    {account?.name ||
                      "Shop Owner"}
                  </div>

                  <div className="text-[11px] text-[#8b9bb0]">
                    Shop Owner
                  </div>

                </div>

                <span
                  className={`text-gray-400 text-xs transition-transform ${
                    profileOpen
                      ? "rotate-180"
                      : ""
                  }`}
                >
                  ▼
                </span>

              </button>

              {profileOpen && (
                <div className="absolute right-0 top-[52px] w-[270px] bg-white rounded-xl border border-[#e5ddd2] shadow-xl z-50 overflow-hidden">

                  <div className="px-4 py-4 bg-[#faf7f2] border-b border-[#eee5dc]">

                    <div className="flex items-center gap-3">

                      <div className="w-11 h-11 rounded-full bg-[#f5e9df] overflow-hidden flex items-center justify-center">

                        {account?.shop_image ? (
                          <img
                            src={
                              account.shop_image
                            }
                            alt={
                              account.name ||
                              "Shop"
                            }
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>👨‍🍳</span>
                        )}

                      </div>

                      <div className="min-w-0">

                        <div className="font-bold text-sm truncate">
                          {account?.name ||
                            "Shop Owner"}
                        </div>

                        <div className="text-xs text-gray-500 truncate">
                          {account?.email ||
                            ""}
                        </div>

                      </div>

                    </div>

                  </div>

                  <button
                    type="button"
                    onClick={openAccountManagement}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#f8f5f1] transition"
                  >
                    <span>⚙️</span>

                    <div>
                      <div className="text-sm font-semibold">
                        Account Management
                      </div>

                      <div className="text-[11px] text-gray-500">
                        Edit shop information
                      </div>
                    </div>
                  </button>

                  <div className="border-t border-[#eee5dc]" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-500 hover:bg-red-50 transition"
                  >
                    <span>🚪</span>

                    <span className="text-sm font-semibold">
                      Logout
                    </span>
                  </button>

                </div>
              )}

            </div>

          </div>

        </header>

        {/* ==================================================
            CONTENT
        ================================================== */}

        <div className="px-7 py-7">

          {/* =================================================
              ORDERS
          ================================================= */}

          {activePage === "orders" ? (

            <div>

              <div className="mb-6">

                <div className="text-[#e84a25] font-semibold text-sm mb-1">
                  Orders 📦
                </div>

                <h1 className="text-3xl font-bold">
                  Manage your orders
                </h1>

                <p className="text-gray-500 text-sm mt-1">
                  View and manage orders from your customers.
                </p>

              </div>

              {orderMessage && (
                <div className="mb-5 bg-red-50 text-red-600 border border-red-200 rounded-lg px-4 py-3 text-sm">
                  {orderMessage}
                </div>
              )}

              {loadingOrders ? (

                <div className="bg-white rounded-xl border border-[#e9e1d8] p-12 text-center">
                  <div className="text-4xl mb-3">
                    📦
                  </div>

                  <div className="font-semibold">
                    Loading orders...
                  </div>

                  <div className="text-gray-500 text-sm mt-1">
                    Please wait.
                  </div>
                </div>

              ) : orders.length === 0 ? (

                <div className="bg-white rounded-xl border border-[#e9e1d8] p-12 text-center">

                  <div className="text-5xl mb-4">
                    📦
                  </div>

                  <h2 className="text-xl font-bold">
                    No orders yet
                  </h2>

                  <p className="text-gray-500 text-sm mt-1">
                    New customer orders will appear here.
                  </p>

                </div>

              ) : (

                <div className="space-y-5">

                  {orders.map((order) => (
                    <OrderCard
                      key={order.order_id}
                      order={order}
                    />
                  ))}

                </div>

              )}

            </div>

          ) : (

            /* =================================================
               MENU
            ================================================= */

            <>

              <div className="mb-6">

                <div className="text-[#e84a25] font-semibold text-sm mb-1">
                  Welcome back 👋
                </div>

                <h1 className="text-3xl font-bold">
                  Manage your menu
                </h1>

                <p className="text-gray-500 text-sm mt-1">
                  Add your food, upload your own images,
                  and organize your menu.
                </p>

              </div>

              {/* STATISTICS */}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-7">

                <div className="bg-white rounded-xl border border-[#e9e1d8] px-5 py-4">

                  <div className="text-xs text-[#8b9bb0]">
                    Total Menu Items
                  </div>

                  <div className="text-2xl font-bold mt-1">
                    {totalMenuItems}
                  </div>

                </div>

                <div className="bg-white rounded-xl border border-[#e9e1d8] px-5 py-4">

                  <div className="text-xs text-[#8b9bb0]">
                    Menu Groups
                  </div>

                  <div className="text-2xl font-bold mt-1">
                    {menuGroups}
                  </div>

                </div>

                <div className="bg-white rounded-xl border border-[#e9e1d8] px-5 py-4">

                  <div className="text-xs text-[#8b9bb0]">
                    Available Items
                  </div>

                  <div className="text-2xl font-bold mt-1">
                    {availableItems}
                  </div>

                </div>

              </div>

              {/* MENU HEADER */}

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">

                <div>

                  <h2 className="text-xl font-bold">
                    Your Menu
                  </h2>

                  <p className="text-gray-500 text-xs mt-1">
                    {riceItems.length} Rice ·{" "}
                    {noodleItems.length} Noodles
                    {otherItems.length > 0 &&
                      ` · ${otherItems.length} Other`}
                  </p>

                </div>

                <div className="flex gap-2">

                  <input
                    type="text"
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="🔍 Search menu..."
                    className="w-[230px] border border-[#ded5ca] bg-white rounded-lg py-2.5 px-3 text-sm outline-none focus:border-[#e84a25]"
                  />

                  <button
                    type="button"
                    onClick={openAddMenu}
                    className="bg-[#e84a25] text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-[#d83d1d]"
                  >
                    + Add Menu
                  </button>

                </div>

              </div>

              {menuMessage && (
                <div className="mb-5 bg-red-50 text-red-600 border border-red-200 rounded-lg px-4 py-3 text-sm">
                  {menuMessage}
                </div>
              )}

              {loadingMenu ? (

                <div className="bg-white rounded-xl p-10 text-center text-sm">
                  Loading your menu...
                </div>

              ) : filteredItems.length === 0 ? (

                <div className="bg-white rounded-xl border border-[#e9e1d8] p-12 text-center">

                  <div className="text-5xl mb-4">
                    🍽️
                  </div>

                  <h2 className="text-xl font-bold">
                    No menu items yet
                  </h2>

                  <p className="text-gray-500 text-sm mt-1 mb-5">
                    Add your first food item to your shop.
                  </p>

                  <button
                    type="button"
                    onClick={openAddMenu}
                    className="bg-[#e84a25] text-white rounded-lg px-5 py-2.5 text-sm font-semibold"
                  >
                    + Add Menu
                  </button>

                </div>

              ) : (

                <>

                  <CategorySection
                    title="Rice"
                    emoji="🍚"
                    items={riceItems}
                  />

                  <CategorySection
                    title="Noodles"
                    emoji="🍜"
                    items={noodleItems}
                  />

                  <CategorySection
                    title="Other"
                    emoji="🍽️"
                    items={otherItems}
                  />

                </>

              )}

            </>

          )}

        </div>

      </div>

      {/* ==================================================
          VIEW ORDER MODAL
      ================================================== */}

      {selectedOrder && (

        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">

            <div className="px-6 py-5 border-b flex items-center justify-between">

              <div>

                <div className="text-xs text-gray-400">
                  ORDER
                </div>

                <h2 className="text-2xl font-bold">
                  #{selectedOrder.order_id}
                </h2>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedOrder(null)
                }
                className="text-2xl text-gray-400 hover:text-black"
              >
                ×
              </button>

            </div>

            <div className="p-6 space-y-5">

              <div>

                <div className="text-xs text-gray-400 uppercase">
                  Customer
                </div>

                <div className="font-bold text-lg">
                  {selectedOrder.student_name}
                </div>

                <div className="text-sm text-gray-500">
                  {selectedOrder.delivery_phone ||
                    selectedOrder.student_phone ||
                    "No phone"}
                </div>

              </div>

              <div>

                <div className="text-xs text-gray-400 uppercase mb-2">
                  Items
                </div>

                <div className="space-y-3">

                  {(selectedOrder.items || []).map(
                    (item) => (
                      <div
                        key={item.order_item_id}
                        className="flex justify-between border-b pb-3"
                      >

                        <div>

                          <div className="font-semibold">
                            {item.menu_name}
                          </div>

                          <div className="text-sm text-gray-500">
                            x{item.quantity}
                          </div>

                        </div>

                        <div className="font-bold">
                          ฿
                          {Number(
                            item.subtotal || 0
                          ).toFixed(2)}
                        </div>

                      </div>
                    )
                  )}

                </div>

              </div>

              {selectedOrder.fulfillment_type ===
                "delivery" && (
                <div className="bg-[#faf7f2] rounded-xl p-4">

                  <div className="text-xs text-gray-400 uppercase mb-2">
                    Delivery
                  </div>

                  <div className="text-sm">
                    <strong>Building:</strong>{" "}
                    {selectedOrder.building_number ||
                      "Not provided"}
                  </div>

                  {selectedOrder.delivery_note && (
                    <div className="text-sm mt-1">
                      <strong>Note:</strong>{" "}
                      {selectedOrder.delivery_note}
                    </div>
                  )}

                </div>
              )}

              <div className="flex justify-between border-t pt-4">

                <span className="font-semibold">
                  Total
                </span>

                <span className="text-xl font-bold">
                  ฿
                  {Number(
                    selectedOrder.total_amount || 0
                  ).toFixed(2)}
                </span>

              </div>

            </div>

            <div className="px-6 py-4 border-t bg-[#faf8f5] flex justify-end">

              <button
                type="button"
                onClick={() =>
                  setSelectedOrder(null)
                }
                className="border border-[#ded5ca] bg-white rounded-lg px-5 py-2.5 text-sm font-semibold"
              >
                Close
              </button>

            </div>

          </div>

        </div>

      )}

      {/* ==================================================
          MENU MODAL
      ================================================== */}

      {showMenuModal && (

        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

            <div className="px-6 py-5 border-b flex justify-between">

              <div>

                <h2 className="text-xl font-bold">
                  {editingItem
                    ? "Edit Menu"
                    : "Add Menu"}
                </h2>

                <p className="text-xs text-gray-500 mt-1">
                  {editingItem
                    ? "Update your food item."
                    : "Add a new food item."}
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowMenuModal(false)
                }
                className="text-xl"
              >
                ×
              </button>

            </div>

            <form
              onSubmit={saveMenu}
              className="p-6 space-y-4"
            >

              <div>

                <label className="block text-sm font-semibold mb-1.5">
                  Food Name
                </label>

                <input
                  type="text"
                  value={menuForm.name}
                  onChange={(event) =>
                    setMenuForm({
                      ...menuForm,
                      name: event.target.value,
                    })
                  }
                  className="w-full border border-[#ded5ca] rounded-lg px-3 py-2.5 text-sm"
                  placeholder="Enter food name"
                />

              </div>

              <div>

                <label className="block text-sm font-semibold mb-1.5">
                  Description
                </label>

                <textarea
                  value={
                    menuForm.description
                  }
                  onChange={(event) =>
                    setMenuForm({
                      ...menuForm,
                      description:
                        event.target.value,
                    })
                  }
                  rows={3}
                  className="w-full border border-[#ded5ca] rounded-lg px-3 py-2.5 text-sm"
                />

              </div>

              <div className="grid grid-cols-2 gap-3">

                <div>

                  <label className="block text-sm font-semibold mb-1.5">
                    Price
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={menuForm.price}
                    onChange={(event) =>
                      setMenuForm({
                        ...menuForm,
                        price:
                          event.target.value,
                      })
                    }
                    className="w-full border border-[#ded5ca] rounded-lg px-3 py-2.5 text-sm"
                  />

                </div>

                <div>

                  <label className="block text-sm font-semibold mb-1.5">
                    Category
                  </label>

                  <select
                    value={menuForm.category}
                    onChange={(event) =>
                      setMenuForm({
                        ...menuForm,
                        category:
                          event.target.value,
                      })
                    }
                    className="w-full border border-[#ded5ca] rounded-lg px-3 py-2.5 text-sm bg-white"
                  >

                    <option value="Rice">
                      Rice
                    </option>

                    <option value="Noodles">
                      Noodles
                    </option>

                    <option value="Other">
                      Other
                    </option>

                  </select>

                </div>

              </div>

              <div>

                <label className="block text-sm font-semibold mb-1.5">
                  Food Image
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setMenuForm({
                      ...menuForm,
                      image:
                        event.target.files?.[0] ||
                        null,
                    })
                  }
                  className="w-full border border-[#ded5ca] rounded-lg px-3 py-2.5 text-sm"
                />

              </div>

              <div className="flex justify-end gap-2 pt-2">

                <button
                  type="button"
                  onClick={() =>
                    setShowMenuModal(false)
                  }
                  className="border border-[#ded5ca] rounded-lg px-4 py-2.5 text-sm"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingMenu}
                  className="bg-[#e84a25] text-white rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
                >
                  {savingMenu
                    ? "Saving..."
                    : editingItem
                    ? "Save Changes"
                    : "Add Menu"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* ==================================================
          ACCOUNT MODAL
      ================================================== */}

      {showAccountModal && (

        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

          <div className="bg-white rounded-xl w-full max-w-md">

            <div className="px-6 py-5 border-b flex justify-between">

              <div>

                <h2 className="text-xl font-bold">
                  Account Management
                </h2>

                <p className="text-xs text-gray-500 mt-1">
                  Manage your shop information.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAccountModal(false)
                }
                className="text-xl"
              >
                ×
              </button>

            </div>

            <form
              onSubmit={saveAccount}
              className="p-6 space-y-4"
            >

              <div className="flex justify-center">

                <div className="w-20 h-20 rounded-full bg-[#f5e9df] overflow-hidden flex items-center justify-center">

                  {account?.shop_image ? (
                    <img
                      src={
                        account.shop_image
                      }
                      alt={
                        account?.name ||
                        "Shop"
                      }
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl">
                      👨‍🍳
                    </span>
                  )}

                </div>

              </div>

              <div>

                <label className="block text-sm font-semibold mb-1.5">
                  Shop Name
                </label>

                <input
                  type="text"
                  name="name"
                  value={
                    accountForm.name
                  }
                  onChange={
                    handleAccountChange
                  }
                  className="w-full border border-[#ded5ca] rounded-lg px-3 py-2.5 text-sm"
                />

              </div>

              <div>

                <label className="block text-sm font-semibold mb-1.5">
                  Email
                </label>

                <input
                  type="email"
                  value={
                    account?.email || ""
                  }
                  disabled
                  className="w-full border border-[#ded5ca] rounded-lg px-3 py-2.5 text-sm bg-gray-100"
                />

              </div>

              <div>

                <label className="block text-sm font-semibold mb-1.5">
                  Phone
                </label>

                <input
                  type="text"
                  name="phone"
                  value={
                    accountForm.phone
                  }
                  onChange={
                    handleAccountChange
                  }
                  className="w-full border border-[#ded5ca] rounded-lg px-3 py-2.5 text-sm"
                />

              </div>

              <div>

                <label className="block text-sm font-semibold mb-1.5">
                  Shop Image
                </label>

                <input
                  type="file"
                  name="image"
                  accept="image/*"
                  onChange={
                    handleAccountChange
                  }
                  className="w-full border border-[#ded5ca] rounded-lg px-3 py-2.5 text-sm"
                />

              </div>

              <div className="flex justify-end gap-2 pt-2">

                <button
                  type="button"
                  onClick={() =>
                    setShowAccountModal(false)
                  }
                  className="border border-[#ded5ca] rounded-lg px-4 py-2.5 text-sm"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingAccount}
                  className="bg-[#e84a25] text-white rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
                >
                  {savingAccount
                    ? "Saving..."
                    : "Save Changes"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </main>
  );
}