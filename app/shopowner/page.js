"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/*
  UniPlate — Shop Owner Dashboard
  Redesigned for:
  - Premium modern dashboard UI
  - Responsive desktop/tablet/mobile layout
  - Menu management
  - Order management
  - Dashboard overview
  - Account management
  - Live order refresh
  - Search + filters
  - Clean minimalist icon system
*/

export default function ShopOwnerPage() {
  const router = useRouter();
  const profileRef = useRef(null);

  // =========================================================
  // ACCOUNT
  // =========================================================

  const [account, setAccount] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);

  const [accountForm, setAccountForm] = useState({
    name: "",
    phone: "",
    image: null,
  });

  const [accountPreview, setAccountPreview] = useState("");

  // =========================================================
  // MENU
  // =========================================================

  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [menuMessage, setMenuMessage] = useState("");
  const [menuSearch, setMenuSearch] = useState("");
  const [menuCategory, setMenuCategory] = useState("All");

  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [savingMenu, setSavingMenu] = useState(false);
  const [menuImagePreview, setMenuImagePreview] = useState("");

  const [menuForm, setMenuForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "Rice",
    image: null,
  });

  // =========================================================
  // ORDERS
  // =========================================================

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderFilter, setOrderFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");

  // =========================================================
  // PAGE
  // =========================================================

  const [activePage, setActivePage] = useState("overview");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // =========================================================
  // PROFILE OUTSIDE CLICK
  // =========================================================

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

  // =========================================================
  // ESCAPE MODALS
  // =========================================================

  useEffect(() => {
    function handleEscape(event) {
      if (event.key !== "Escape") return;

      setProfileOpen(false);
      setMobileSidebarOpen(false);

      if (selectedOrder) {
        setSelectedOrder(null);
      }

      if (showMenuModal) {
        setShowMenuModal(false);
      }

      if (showAccountModal) {
        setShowAccountModal(false);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [
    selectedOrder,
    showMenuModal,
    showAccountModal,
  ]);

  // =========================================================
  // LOAD ACCOUNT
  // =========================================================

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

  // =========================================================
  // LOAD MENU
  // =========================================================

  async function loadMenu() {
    try {
      setLoadingMenu(true);
      setMenuMessage("");

      const response = await fetch("/api/shopowner/menu", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMenuMessage(
          data.message || "Unable to load menu."
        );
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

  // =========================================================
  // LOAD ORDERS
  // =========================================================

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

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadAccount();
    loadMenu();
    loadOrders();
  }, []);

  // =========================================================
  // LIVE ORDER REFRESH
  // =========================================================

  useEffect(() => {
    loadOrders(false);

    const interval = setInterval(() => {
      loadOrders(false);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // =========================================================
  // MENU DATA
  // =========================================================

  const categories = useMemo(() => {
    const unique = [
      ...new Set(
        menuItems
          .map((item) => item.category)
          .filter(Boolean)
      ),
    ];

    return ["All", ...unique];
  }, [menuItems]);

  const filteredMenuItems = useMemo(() => {
    const keyword = menuSearch.trim().toLowerCase();

    return menuItems.filter((item) => {
      const matchesCategory =
        menuCategory === "All" ||
        item.category === menuCategory;

      const matchesSearch =
        !keyword ||
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
          );

      return matchesCategory && matchesSearch;
    });
  }, [
    menuItems,
    menuCategory,
    menuSearch,
  ]);

  // =========================================================
  // ORDER DATA
  // =========================================================

  const orderCounts = useMemo(() => {
    return {
      all: orders.length,

      pending: orders.filter(
        (order) =>
          order.order_status === "pending"
      ).length,

      confirmed: orders.filter(
        (order) =>
          order.order_status === "confirmed"
      ).length,

      preparing: orders.filter(
        (order) =>
          order.order_status === "preparing"
      ).length,

      ready: orders.filter(
        (order) =>
          order.order_status === "ready"
      ).length,

      cancelled: orders.filter(
        (order) =>
          order.order_status === "cancelled"
      ).length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const keyword = orderSearch.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesFilter =
        orderFilter === "all" ||
        order.order_status === orderFilter;

      const matchesSearch =
        !keyword ||
        [
          order.order_id,
          order.student_name,
          order.student_phone,
          order.delivery_phone,
          order.shop_name,
          order.building_number,
        ]
          .filter(
            (value) =>
              value !== undefined &&
              value !== null
          )
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(keyword)
          );

      return matchesFilter && matchesSearch;
    });
  }, [
    orders,
    orderFilter,
    orderSearch,
  ]);

  // =========================================================
  // STATISTICS
  // =========================================================

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

  const todayRevenue = orders
    .filter(
      (order) =>
        order.order_status !== "cancelled"
    )
    .reduce(
      (sum, order) =>
        sum + Number(order.total_amount || 0),
      0
    );

  const needsAttention =
    orderCounts.pending +
    orderCounts.confirmed;

  // =========================================================
  // MENU FUNCTIONS
  // =========================================================

  function resetMenuForm() {
    setMenuForm({
      name: "",
      description: "",
      price: "",
      category: "Rice",
      image: null,
    });

    setMenuImagePreview("");
  }

  function openAddMenu() {
    setEditingItem(null);
    resetMenuForm();
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

    setMenuImagePreview(item.image || "");
    setShowMenuModal(true);
  }

  function handleMenuImageChange(event) {
    const file = event.target.files?.[0] || null;

    setMenuForm((previous) => ({
      ...previous,
      image: file,
    }));

    if (file) {
      setMenuImagePreview(URL.createObjectURL(file));
    }
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

      formData.append(
        "name",
        menuForm.name.trim()
      );

      formData.append(
        "description",
        menuForm.description || ""
      );

      formData.append(
        "price",
        menuForm.price
      );

      formData.append(
        "category",
        menuForm.category
      );

      if (menuForm.image) {
        formData.append(
          "image",
          menuForm.image
        );
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
        response = await fetch(
          "/api/shopowner/menu",
          {
            method: "POST",
            body: formData,
          }
        );
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(
          data.message ||
            "Unable to save menu."
        );
        return;
      }

      setShowMenuModal(false);
      setEditingItem(null);
      resetMenuForm();

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
      `Delete "${item.name}" from your menu?`
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
          data.message ||
            "Unable to delete menu."
        );
        return;
      }

      await loadMenu();
    } catch (error) {
      console.error("DELETE MENU ERROR:", error);
      alert("Unable to delete menu.");
    }
  }

  // =========================================================
  // ORDER STATUS
  // =========================================================

  async function updateOrderStatus(
    order,
    newStatus
  ) {
    if (!order?.order_id) return;

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

      if (
        selectedOrder?.order_id ===
        order.order_id
      ) {
        setSelectedOrder((previous) =>
          previous
            ? {
                ...previous,
                order_status: newStatus,
              }
            : previous
        );
      }

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

  // =========================================================
  // ACCOUNT
  // =========================================================

  function handleAccountChange(event) {
    const {
      name,
      value,
      files,
    } = event.target;

    if (name === "image") {
      const file = files?.[0] || null;

      setAccountForm((previous) => ({
        ...previous,
        image: file,
      }));

      if (accountPreview) {
        URL.revokeObjectURL(accountPreview);
      }

      if (file) {
        setAccountPreview(
          URL.createObjectURL(file)
        );
      } else {
        setAccountPreview("");
      }

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

    setAccountPreview("");
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
        accountForm.name.trim()
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

      setAccountPreview("");
      setShowAccountModal(false);
    } catch (error) {
      console.error(
        "ACCOUNT UPDATE ERROR:",
        error
      );

      alert("Unable to update account.");
    } finally {
      setSavingAccount(false);
    }
  }

  // =========================================================
  // LOGOUT
  // =========================================================

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

  // =========================================================
  // NAVIGATION
  // =========================================================

  function navigateTo(page) {
    setActivePage(page);
    setMobileSidebarOpen(false);
    setProfileOpen(false);
  }

  // =========================================================
  // STATUS HELPERS
  // =========================================================

  function getStatusStyle(status) {
    switch (status) {
      case "pending":
        return "bg-amber-50 text-amber-700 border-amber-100";

      case "confirmed":
        return "bg-blue-50 text-blue-700 border-blue-100";

      case "preparing":
        return "bg-orange-50 text-orange-700 border-orange-100";

      case "ready":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";

      case "cancelled":
        return "bg-red-50 text-red-700 border-red-100";

      default:
        return "bg-gray-50 text-gray-600 border-gray-100";
    }
  }

  function getStatusLabel(status) {
    switch (status) {
      case "pending":
        return "Pending";

      case "confirmed":
        return "Confirmed";

      case "preparing":
        return "Preparing";

      case "ready":
        return "Ready";

      case "cancelled":
        return "Cancelled";

      default:
        return status || "Unknown";
    }
  }

  function getCategoryIcon(category) {
    if (category === "Rice") return "🍚";
    if (category === "Noodles") return "🍜";
    return "🍽";
  }

  // =========================================================
  // ICONS
  // =========================================================

  function Icon({
    name,
    size = 19,
    stroke = 1.8,
  }) {
    const common = {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: stroke,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": true,
    };

    if (name === "grid") {
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    }

    if (name === "menu") {
      return (
        <svg {...common}>
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
        </svg>
      );
    }

    if (name === "utensils") {
      return (
        <svg {...common}>
          <path d="M7 3v7" />
          <path d="M4 3v4a3 3 0 0 0 6 0V3" />
          <path d="M7 10v11" />
          <path d="M17 3v18" />
          <path d="M17 3c2.5 2 3 5 0 8" />
        </svg>
      );
    }

    if (name === "orders") {
      return (
        <svg {...common}>
          <path d="M6 3h12v18H6z" />
          <path d="M9 7h6" />
          <path d="M9 11h6" />
          <path d="M9 15h4" />
        </svg>
      );
    }

    if (name === "bell") {
      return (
        <svg {...common}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );
    }

    if (name === "user") {
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );
    }

    if (name === "settings") {
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 2-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-2.8v-.8a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-2-2 .1-.1A1.7 1.7 0 0 0 7.4 15a1.7 1.7 0 0 0-1.6-1H5v-2.8h.8a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L7 8.2l2-2 .1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V4h2.8v1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 2 2-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.8V14h-.8a1.7 1.7 0 0 0-1.6 1z" />
        </svg>
      );
    }

    if (name === "logout") {
      return (
        <svg {...common}>
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
          <path d="M21 19V5a2 2 0 0 0-2-2h-6" />
        </svg>
      );
    }

    if (name === "plus") {
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    }

    if (name === "search") {
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
      );
    }

    if (name === "edit") {
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
        </svg>
      );
    }

    if (name === "trash") {
      return (
        <svg {...common}>
          <path d="M4 7h16" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="m9 7 1-3h4l1 3" />
          <path d="M6 7l1 14h10l1-14" />
        </svg>
      );
    }

    if (name === "eye") {
      return (
        <svg {...common}>
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    }

    if (name === "refresh") {
      return (
        <svg {...common}>
          <path d="M20 11a8 8 0 0 0-14.8-4L3 9" />
          <path d="M3 4v5h5" />
          <path d="M4 13a8 8 0 0 0 14.8 4L21 15" />
          <path d="M21 20v-5h-5" />
        </svg>
      );
    }

    if (name === "arrow") {
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );
    }

    if (name === "close") {
      return (
        <svg {...common}>
          <path d="M6 6l12 12" />
          <path d="M18 6 6 18" />
        </svg>
      );
    }

    if (name === "check") {
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );
    }

    if (name === "clock") {
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    }

    if (name === "truck") {
      return (
        <svg {...common}>
          <path d="M3 6h11v10H3z" />
          <path d="M14 9h4l3 3v4h-7z" />
          <circle cx="7" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
        </svg>
      );
    }

    return null;
  }

  // =========================================================
  // MENU CARD
  // =========================================================

  function MenuCard({ item }) {
    const available =
      item.availability === true ||
      item.availability === 1;

    return (
      <article className="group bg-white border border-[#ebe3da] rounded-[22px] overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_45px_rgba(35,28,20,0.08)]">
        <div className="relative aspect-[4/3] bg-[#f3eee8] overflow-hidden">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.035]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">
              {getCategoryIcon(item.category)}
            </div>
          )}

          <div className="absolute inset-x-0 top-0 p-3 flex items-start justify-between">
            <span className="px-2.5 py-1.5 rounded-full bg-white/90 backdrop-blur-sm text-[10px] font-bold text-[#51483f] shadow-sm">
              {item.category || "Other"}
            </span>

            <span
              className={`px-2.5 py-1.5 rounded-full backdrop-blur-sm text-[10px] font-bold shadow-sm ${
                available
                  ? "bg-emerald-500 text-white"
                  : "bg-[#2b2926]/85 text-white"
              }`}
            >
              {available
                ? "Available"
                : "Unavailable"}
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-bold text-[17px] leading-tight truncate">
                {item.name}
              </h3>

              {item.description && (
                <p className="text-[12px] leading-5 text-[#81786f] mt-1.5 line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>

            <div className="text-[#e84a25] font-bold text-[17px] whitespace-nowrap">
              ฿{Number(item.price || 0).toFixed(2)}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-5 pt-4 border-t border-[#eee8e1]">
            <button
              type="button"
              onClick={() => openEditMenu(item)}
              className="flex-1 h-10 rounded-xl border border-[#ded5ca] bg-white text-[#342f2b] text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#f8f4ef] transition"
            >
              <Icon
                name="edit"
                size={14}
              />
              Edit
            </button>

            <button
              type="button"
              onClick={() => deleteMenu(item)}
              className="h-10 px-4 rounded-xl border border-red-100 text-red-500 text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition"
            >
              <Icon
                name="trash"
                size={14}
              />
              Delete
            </button>
          </div>
        </div>
      </article>
    );
  }

  // =========================================================
  // ORDER CARD
  // =========================================================

  function OrderCard({ order }) {
    const status = order.order_status;

    const isUpdating =
      updatingOrderId === order.order_id;

    const isDelivery =
      order.fulfillment_type ===
      "delivery";

    return (
      <article className="bg-white border border-[#ebe3da] rounded-[22px] overflow-hidden shadow-[0_4px_20px_rgba(35,28,20,0.025)]">
        <div className="p-5 md:p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-[#fff1eb] text-[#e84a25] flex items-center justify-center flex-shrink-0">
                <Icon
                  name={
                    isDelivery
                      ? "truck"
                      : "orders"
                  }
                  size={20}
                />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-lg">
                    Order #{order.order_id}
                  </h3>

                  <span
                    className={`px-2.5 py-1 rounded-full border text-[10px] font-bold ${getStatusStyle(
                      status
                    )}`}
                  >
                    {getStatusLabel(status)}
                  </span>
                </div>

                <p className="text-xs text-[#8a8178] mt-1">
                  Checkout #{order.checkout_id}
                  {" · "}
                  {isDelivery
                    ? "Delivery"
                    : "Pickup"}
                </p>
              </div>
            </div>

            <div className="lg:text-right">
              <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-[#9a9189]">
                Total
              </div>

              <div className="text-xl font-bold mt-0.5">
                ฿
                {Number(
                  order.total_amount || 0
                ).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="rounded-2xl bg-[#faf7f3] p-4">
              <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-[#9a9189] mb-2">
                Customer
              </div>

              <div className="font-bold text-sm">
                {order.student_name ||
                  "Customer"}
              </div>

              <div className="text-xs text-[#6f6861] mt-1">
                {order.delivery_phone ||
                  order.student_phone ||
                  "No phone number"}
              </div>
            </div>

            <div className="rounded-2xl bg-[#faf7f3] p-4">
              <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-[#9a9189] mb-2">
                {isDelivery
                  ? "Delivery"
                  : "Fulfillment"}
              </div>

              {isDelivery ? (
                <>
                  <div className="font-bold text-sm">
                    {order.building_number ||
                      "Building not provided"}
                  </div>

                  {order.delivery_note && (
                    <div className="text-xs text-[#6f6861] mt-1 line-clamp-2">
                      {order.delivery_note}
                    </div>
                  )}
                </>
              ) : (
                <div className="font-bold text-sm">
                  Customer Pickup
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-[#9a9189]">
                Order Items
              </div>

              <span className="text-xs text-[#9a9189]">
                {(order.items || []).length}{" "}
                item
                {(order.items || []).length !== 1
                  ? "s"
                  : ""}
              </span>
            </div>

            <div className="divide-y divide-[#eee8e1] border border-[#eee8e1] rounded-2xl overflow-hidden">
              {(order.items || []).map(
                (item) => (
                  <div
                    key={
                      item.order_item_id
                    }
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">
                        {item.menu_name}
                      </div>

                      <div className="text-xs text-[#8a8178] mt-0.5">
                        Quantity:{" "}
                        {item.quantity}
                      </div>
                    </div>

                    <div className="font-bold text-sm whitespace-nowrap">
                      ฿
                      {Number(
                        item.subtotal ??
                          Number(
                            item.price || 0
                          ) *
                            Number(
                              item.quantity ||
                                0
                            )
                      ).toFixed(2)}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        <div className="px-5 md:px-6 py-4 bg-[#fcfaf8] border-t border-[#eee8e1]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              type="button"
              onClick={() =>
                setSelectedOrder(order)
              }
              className="text-xs font-bold text-[#5c534b] hover:text-[#e84a25] flex items-center gap-1.5"
            >
              View full order
              <Icon
                name="arrow"
                size={13}
              />
            </button>

            <div className="flex flex-wrap gap-2 sm:justify-end">
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
                  className="h-10 px-4 rounded-xl bg-[#252320] text-white text-xs font-bold hover:bg-[#171614] disabled:opacity-50 transition"
                >
                  {isUpdating
                    ? "Updating..."
                    : "Confirm Order"}
                </button>
              )}

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
                  className="h-10 px-4 rounded-xl bg-[#e84a25] text-white text-xs font-bold hover:bg-[#d83d1d] disabled:opacity-50 transition"
                >
                  {isUpdating
                    ? "Updating..."
                    : "Start Preparing"}
                </button>
              )}

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
                  className="h-10 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition"
                >
                  {isUpdating
                    ? "Updating..."
                    : isDelivery
                    ? "Ready for Delivery"
                    : "Ready for Pickup"}
                </button>
              )}

              {status === "ready" && (
                <div className="h-10 px-4 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {isDelivery
                    ? "Waiting for Delivery"
                    : "Ready for Pickup"}
                </div>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  }

  // =========================================================
  // STAT CARD
  // =========================================================

  function StatCard({
    label,
    value,
    icon,
    accent = false,
    helper,
    onClick,
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`text-left w-full bg-white border border-[#ebe3da] rounded-[22px] p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_35px_rgba(35,28,20,0.06)] ${
          onClick
            ? "cursor-pointer"
            : "cursor-default"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-[#9a9189]">
              {label}
            </div>

            <div className="text-2xl font-bold mt-2">
              {value}
            </div>

            {helper && (
              <div className="text-xs text-[#8a8178] mt-1.5">
                {helper}
              </div>
            )}
          </div>

          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              accent
                ? "bg-[#fff0e9] text-[#e84a25]"
                : "bg-[#f5f1ec] text-[#5e564f]"
            }`}
          >
            <Icon
              name={icon}
              size={19}
            />
          </div>
        </div>
      </button>
    );
  }

  // =========================================================
  // SIDEBAR
  // =========================================================

  function Sidebar() {
    return (
      <>
        {mobileSidebarOpen && (
          <button
            type="button"
            aria-label="Close menu"
            onClick={() =>
              setMobileSidebarOpen(false)
            }
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          />
        )}

        <aside
          className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[270px] bg-[#211f1c] text-white flex flex-col flex-shrink-0 transition-transform duration-300 ${
            mobileSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="px-6 py-7 border-b border-[#393530]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[25px] font-black tracking-[-0.04em]">
                  UniPlate
                </div>

                <div className="text-[11px] text-[#a9a19a] mt-1">
                  Shop Owner Portal
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMobileSidebarOpen(false)
                }
                className="lg:hidden w-9 h-9 rounded-xl hover:bg-[#302d29] flex items-center justify-center text-[#aaa29b]"
              >
                <Icon
                  name="close"
                  size={17}
                />
              </button>
            </div>
          </div>

          <div className="px-3 py-5">
            <div className="px-3 mb-3 text-[9px] uppercase tracking-[0.18em] font-bold text-[#706a64]">
              Workspace
            </div>

            <SidebarButton
              active={
                activePage === "overview"
              }
              icon="grid"
              label="Overview"
              onClick={() =>
                navigateTo("overview")
              }
            />

            <SidebarButton
              active={
                activePage === "menu"
              }
              icon="utensils"
              label="Menu"
              onClick={() =>
                navigateTo("menu")
              }
              badge={
                totalMenuItems > 0
                  ? totalMenuItems
                  : null
              }
            />

            <SidebarButton
              active={
                activePage === "orders"
              }
              icon="orders"
              label="Orders"
              onClick={() =>
                navigateTo("orders")
              }
              badge={
                needsAttention > 0
                  ? needsAttention
                  : null
              }
            />
          </div>

          <div className="mt-auto px-4 pb-5">
            <div className="border-t border-[#393530] pt-4">
              <div className="flex items-center gap-3 px-2">
                <Avatar
                  account={account}
                  size="sm"
                />

                <div className="min-w-0">
                  <div className="font-bold text-sm truncate">
                    {account?.name ||
                      "Shop Owner"}
                  </div>

                  <div className="text-[10px] text-[#918981] truncate">
                    {account?.email ||
                      "Shop account"}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  openAccountManagement
                }
                className="w-full mt-4 h-10 rounded-xl text-[#bdb5ad] hover:text-white hover:bg-[#302d29] text-xs font-semibold flex items-center gap-2.5 px-3 transition"
              >
                <Icon
                  name="settings"
                  size={15}
                />
                Account settings
              </button>
            </div>
          </div>
        </aside>
      </>
    );
  }

  function SidebarButton({
    active,
    icon,
    label,
    onClick,
    badge,
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full h-12 px-4 rounded-xl flex items-center gap-3 mb-1.5 transition ${
          active
            ? "bg-[#e84a25] text-white shadow-[0_8px_20px_rgba(232,74,37,0.2)]"
            : "text-[#aaa29b] hover:bg-[#302d29] hover:text-white"
        }`}
      >
        <Icon
          name={icon}
          size={18}
        />

        <span className="text-sm font-semibold">
          {label}
        </span>

        {badge && (
          <span
            className={`ml-auto min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
              active
                ? "bg-white text-[#e84a25]"
                : "bg-[#3b3733] text-[#d8d0c8]"
            }`}
          >
            {badge}
          </span>
        )}
      </button>
    );
  }

  function Avatar({
    account: avatarAccount,
    size = "md",
  }) {
    const dimensions =
      size === "sm"
        ? "w-9 h-9"
        : "w-10 h-10";

    return (
      <div
        className={`${dimensions} rounded-full bg-[#f4e7dc] overflow-hidden flex items-center justify-center flex-shrink-0`}
      >
        {avatarAccount?.shop_image ? (
          <img
            src={avatarAccount.shop_image}
            alt={
              avatarAccount.name ||
              "Shop"
            }
            className="w-full h-full object-cover"
          />
        ) : (
          <Icon
            name="user"
            size={
              size === "sm"
                ? 16
                : 18
            }
          />
        )}
      </div>
    );
  }

  // =========================================================
  // HEADER
  // =========================================================

  function Header() {
    const pageTitle =
      activePage === "overview"
        ? "Overview"
        : activePage === "menu"
        ? "Menu Management"
        : "Order Management";

    return (
      <header className="sticky top-0 z-30 h-[72px] bg-white/95 backdrop-blur-md border-b border-[#e9e2da] flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() =>
              setMobileSidebarOpen(true)
            }
            className="lg:hidden w-10 h-10 rounded-xl bg-[#f7f3ee] flex items-center justify-center"
          >
            <Icon
              name="menu"
              size={19}
            />
          </button>

          <div className="min-w-0">
            <div className="hidden sm:block text-[10px] uppercase tracking-[0.16em] font-bold text-[#9a9189]">
              Shop Dashboard
            </div>

            <div className="font-bold text-base sm:text-lg truncate">
              {pageTitle}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() =>
              loadOrders(false)
            }
            className="w-10 h-10 rounded-xl bg-[#f7f3ee] text-[#554d46] flex items-center justify-center hover:bg-[#eee8e1] transition"
            title="Refresh orders"
          >
            <Icon
              name="refresh"
              size={17}
            />
          </button>

          <button
            type="button"
            onClick={() =>
              navigateTo("orders")
            }
            className="relative w-10 h-10 rounded-xl bg-[#f7f3ee] text-[#554d46] flex items-center justify-center hover:bg-[#eee8e1] transition"
            title="Orders"
          >
            <Icon
              name="bell"
              size={17}
            />

            {needsAttention > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#e84a25] rounded-full ring-2 ring-white" />
            )}
          </button>

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
              className="flex items-center gap-2 rounded-xl p-1.5 sm:pr-2 hover:bg-[#f7f3ee] transition"
            >
              <Avatar
                account={account}
                size="sm"
              />

              <div className="hidden md:block text-left max-w-[130px]">
                <div className="font-bold text-xs truncate">
                  {account?.name ||
                    "Shop Owner"}
                </div>

                <div className="text-[10px] text-[#9a9189]">
                  Shop Owner
                </div>
              </div>

              <span className="hidden sm:block text-[#9a9189] text-xs">
                {profileOpen
                  ? "⌃"
                  : "⌄"}
              </span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-[54px] w-[285px] bg-white rounded-2xl border border-[#e5ddd4] shadow-[0_20px_60px_rgba(35,28,20,0.14)] overflow-hidden z-50">
                <div className="p-4 bg-[#faf7f3] border-b border-[#eee7df]">
                  <div className="flex items-center gap-3">
                    <Avatar
                      account={account}
                    />

                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">
                        {account?.name ||
                          "Shop Owner"}
                      </div>

                      <div className="text-xs text-[#81786f] truncate mt-0.5">
                        {account?.email ||
                          ""}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    openAccountManagement
                  }
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[#faf7f3] transition"
                >
                  <span className="w-8 h-8 rounded-lg bg-[#f5f1ec] flex items-center justify-center text-[#5b534c]">
                    <Icon
                      name="settings"
                      size={15}
                    />
                  </span>

                  <div>
                    <div className="text-xs font-bold">
                      Account Management
                    </div>

                    <div className="text-[10px] text-[#8a8178] mt-0.5">
                      Edit shop information
                    </div>
                  </div>
                </button>

                <div className="border-t border-[#eee7df]" />

                <button
                  type="button"
                  onClick={
                    handleLogout
                  }
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-red-500 hover:bg-red-50 transition"
                >
                  <span className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                    <Icon
                      name="logout"
                      size={15}
                    />
                  </span>

                  <span className="text-xs font-bold">
                    Logout
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  // =========================================================
  // OVERVIEW
  // =========================================================

  function OverviewPage() {
    const recentOrders = orders.slice(
      0,
      5
    );

    return (
      <div className="space-y-7">
        <section>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="text-[#e84a25] text-xs font-bold uppercase tracking-[0.16em]">
                Welcome back
              </div>

              <h1 className="text-3xl sm:text-4xl font-black tracking-[-0.035em] mt-1">
                {account?.name ||
                  "Your Shop"}
              </h1>

              <p className="text-sm text-[#81786f] mt-2 max-w-xl">
                Keep your menu updated and
                stay on top of incoming
                customer orders.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  navigateTo("menu")
                }
                className="h-11 px-4 rounded-xl border border-[#ded5ca] bg-white text-xs font-bold hover:bg-[#f8f4ef] transition"
              >
                Manage Menu
              </button>

              <button
                type="button"
                onClick={() =>
                  navigateTo("orders")
                }
                className="h-11 px-4 rounded-xl bg-[#e84a25] text-white text-xs font-bold hover:bg-[#d83d1d] transition flex items-center gap-2"
              >
                View Orders
                <Icon
                  name="arrow"
                  size={14}
                />
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Total Orders"
            value={orderCounts.all}
            icon="orders"
            helper="All orders received"
            onClick={() =>
              navigateTo("orders")
            }
          />

          <StatCard
            label="Needs Attention"
            value={needsAttention}
            icon="clock"
            accent={needsAttention > 0}
            helper={
              needsAttention > 0
                ? "Orders waiting for action"
                : "Everything is up to date"
            }
            onClick={() =>
              navigateTo("orders")
            }
          />

          <StatCard
            label="Menu Items"
            value={totalMenuItems}
            icon="utensils"
            helper={`${availableItems} currently available`}
            onClick={() =>
              navigateTo("menu")
            }
          />

          <StatCard
            label="Order Value"
            value={`฿${todayRevenue.toFixed(
              0
            )}`}
            icon="grid"
            accent
            helper="Current loaded orders"
          />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.65fr] gap-5">
          <div className="bg-white border border-[#ebe3da] rounded-[24px] overflow-hidden">
            <div className="px-5 py-5 border-b border-[#eee8e1] flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-base">
                  Recent Orders
                </h2>

                <p className="text-xs text-[#8a8178] mt-1">
                  Your latest customer activity
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigateTo("orders")
                }
                className="text-xs font-bold text-[#e84a25] hover:text-[#c83d1e]"
              >
                View all
              </button>
            </div>

            {loadingOrders &&
            orders.length === 0 ? (
              <div className="p-10 text-center text-sm text-[#81786f]">
                Loading orders...
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#f7f3ee] flex items-center justify-center text-[#766d65]">
                  <Icon
                    name="orders"
                    size={21}
                  />
                </div>

                <div className="font-bold text-sm mt-3">
                  No orders yet
                </div>

                <p className="text-xs text-[#8a8178] mt-1">
                  New customer orders will
                  appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#eee8e1]">
                {recentOrders.map(
                  (order) => (
                    <button
                      type="button"
                      key={order.order_id}
                      onClick={() =>
                        setSelectedOrder(
                          order
                        )
                      }
                      className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-[#fcfaf8] transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#fff1eb] text-[#e84a25] flex items-center justify-center flex-shrink-0">
                          <Icon
                            name="orders"
                            size={15}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="font-bold text-sm truncate">
                            #{order.order_id}
                            {" · "}
                            {order.student_name ||
                              "Customer"}
                          </div>

                          <div className="text-[10px] text-[#8a8178] mt-1">
                            {(
                              order.items ||
                              []
                            ).length}{" "}
                            items
                            {" · "}
                            {order.fulfillment_type ===
                            "delivery"
                              ? "Delivery"
                              : "Pickup"}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-sm">
                          ฿
                          {Number(
                            order.total_amount ||
                              0
                          ).toFixed(2)}
                        </div>

                        <div
                          className={`inline-flex mt-1.5 px-2 py-0.5 rounded-full border text-[9px] font-bold ${getStatusStyle(
                            order.order_status
                          )}`}
                        >
                          {getStatusLabel(
                            order.order_status
                          )}
                        </div>
                      </div>
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="bg-[#211f1c] text-white rounded-[24px] p-6">
              <div className="text-[10px] uppercase tracking-[0.16em] text-[#aaa19a] font-bold">
                Order Pipeline
              </div>

              <div className="grid grid-cols-2 gap-4 mt-5">
                <PipelineStat
                  label="Pending"
                  value={orderCounts.pending}
                />

                <PipelineStat
                  label="Confirmed"
                  value={orderCounts.confirmed}
                />

                <PipelineStat
                  label="Preparing"
                  value={orderCounts.preparing}
                />

                <PipelineStat
                  label="Ready"
                  value={orderCounts.ready}
                />
              </div>
            </div>

            <div className="bg-white border border-[#ebe3da] rounded-[24px] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.15em] text-[#9a9189] font-bold">
                    Menu Health
                  </div>

                  <div className="font-bold text-lg mt-1">
                    {availableItems} /{" "}
                    {totalMenuItems}
                  </div>
                </div>

                <div className="w-11 h-11 rounded-2xl bg-[#f5f1ec] flex items-center justify-center">
                  <Icon
                    name="utensils"
                    size={20}
                  />
                </div>
              </div>

              <div className="h-2 bg-[#eee8e1] rounded-full mt-5 overflow-hidden">
                <div
                  className="h-full bg-[#e84a25] rounded-full transition-all"
                  style={{
                    width:
                      totalMenuItems > 0
                        ? `${Math.min(
                            100,
                            (availableItems /
                              totalMenuItems) *
                              100
                          )}%`
                        : "0%",
                  }}
                />
              </div>

              <p className="text-xs text-[#81786f] mt-3">
                {menuGroups} menu{" "}
                {menuGroups === 1
                  ? "category"
                  : "categories"}{" "}
                available.
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // =========================================================
  // MENU PAGE
  // =========================================================

  function MenuPage() {
    return (
      <div className="space-y-7">
        <section className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
          <div>
            <div className="text-[#e84a25] text-xs font-bold uppercase tracking-[0.16em]">
              Menu
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-[-0.035em] mt-1">
              Your Menu
            </h1>

            <p className="text-sm text-[#81786f] mt-2">
              Manage dishes, prices, categories,
              and food images.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddMenu}
            className="h-11 px-5 rounded-xl bg-[#e84a25] text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#d83d1d] transition"
          >
            <Icon
              name="plus"
              size={16}
            />
            Add Menu Item
          </button>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniStat
            label="Items"
            value={totalMenuItems}
          />

          <MiniStat
            label="Available"
            value={availableItems}
          />

          <MiniStat
            label="Categories"
            value={menuGroups}
          />

          <MiniStat
            label="Unavailable"
            value={
              Math.max(
                0,
                totalMenuItems -
                  availableItems
              )
            }
          />
        </section>

        <section className="bg-white border border-[#ebe3da] rounded-[24px] p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-[330px]">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#968d84]">
                <Icon
                  name="search"
                  size={16}
                />
              </span>

              <input
                type="text"
                value={menuSearch}
                onChange={(event) =>
                  setMenuSearch(
                    event.target.value
                  )
                }
                placeholder="Search your menu..."
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#ded5ca] bg-[#fcfaf8] text-sm outline-none focus:border-[#e84a25] focus:bg-white transition"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map(
                (category) => (
                  <button
                    type="button"
                    key={category}
                    onClick={() =>
                      setMenuCategory(
                        category
                      )
                    }
                    className={`h-10 px-4 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                      menuCategory ===
                      category
                        ? "bg-[#211f1c] text-white"
                        : "bg-[#f7f3ee] text-[#665d55] hover:bg-[#eee8e1]"
                    }`}
                  >
                    {category ===
                    "All"
                      ? "All Items"
                      : `${getCategoryIcon(
                          category
                        )} ${category}`}
                  </button>
                )
              )}
            </div>
          </div>
        </section>

        {menuMessage && (
          <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl px-4 py-3 text-sm">
            {menuMessage}
          </div>
        )}

        {loadingMenu ? (
          <MenuSkeleton />
        ) : filteredMenuItems.length ===
          0 ? (
          <div className="bg-white border border-[#ebe3da] rounded-[24px] p-14 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#f7f3ee] flex items-center justify-center">
              <Icon
                name="utensils"
                size={24}
              />
            </div>

            <h2 className="font-bold text-lg mt-4">
              {menuItems.length === 0
                ? "Your menu is empty"
                : "No matching items"}
            </h2>

            <p className="text-sm text-[#81786f] mt-1 max-w-md mx-auto">
              {menuItems.length === 0
                ? "Add your first menu item and start building your food court menu."
                : "Try another search term or category."}
            </p>

            {menuItems.length === 0 && (
              <button
                type="button"
                onClick={
                  openAddMenu
                }
                className="mt-5 h-10 px-5 rounded-xl bg-[#e84a25] text-white text-xs font-bold"
              >
                Add First Item
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredMenuItems.map(
              (item) => (
                <MenuCard
                  key={
                    item.menu_item_id
                  }
                  item={item}
                />
              )
            )}
          </div>
        )}
      </div>
    );
  }

  // =========================================================
  // ORDERS PAGE
  // =========================================================

  function OrdersPage() {
    return (
      <div className="space-y-7">
        <section className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
          <div>
            <div className="text-[#e84a25] text-xs font-bold uppercase tracking-[0.16em]">
              Orders
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-[-0.035em] mt-1">
              Customer Orders
            </h1>

            <p className="text-sm text-[#81786f] mt-2">
              Review orders and move them
              through your kitchen workflow.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              loadOrders(false)
            }
            className="h-11 px-4 rounded-xl border border-[#ded5ca] bg-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#f8f4ef] transition"
          >
            <Icon
              name="refresh"
              size={15}
            />
            Refresh
          </button>
        </section>

        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <OrderFilter
            label="All"
            value={orderCounts.all}
            active={
              orderFilter === "all"
            }
            onClick={() =>
              setOrderFilter("all")
            }
          />

          <OrderFilter
            label="Pending"
            value={orderCounts.pending}
            active={
              orderFilter === "pending"
            }
            onClick={() =>
              setOrderFilter("pending")
            }
          />

          <OrderFilter
            label="Confirmed"
            value={orderCounts.confirmed}
            active={
              orderFilter === "confirmed"
            }
            onClick={() =>
              setOrderFilter("confirmed")
            }
          />

          <OrderFilter
            label="Preparing"
            value={orderCounts.preparing}
            active={
              orderFilter === "preparing"
            }
            onClick={() =>
              setOrderFilter("preparing")
            }
          />

          <OrderFilter
            label="Ready"
            value={orderCounts.ready}
            active={
              orderFilter === "ready"
            }
            onClick={() =>
              setOrderFilter("ready")
            }
          />

          <OrderFilter
            label="Cancelled"
            value={orderCounts.cancelled}
            active={
              orderFilter === "cancelled"
            }
            onClick={() =>
              setOrderFilter("cancelled")
            }
          />
        </section>

        <section className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#968d84]">
            <Icon
              name="search"
              size={17}
            />
          </span>

          <input
            type="text"
            value={orderSearch}
            onChange={(event) =>
              setOrderSearch(
                event.target.value
              )
            }
            placeholder="Search by order number, customer, phone, or building..."
            className="w-full h-12 pl-11 pr-4 rounded-xl border border-[#ded5ca] bg-white text-sm outline-none focus:border-[#e84a25] transition"
          />
        </section>

        {orderMessage && (
          <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl px-4 py-3 text-sm">
            {orderMessage}
          </div>
        )}

        {loadingOrders &&
        orders.length === 0 ? (
          <div className="bg-white border border-[#ebe3da] rounded-[24px] p-14 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#f7f3ee] flex items-center justify-center">
              <Icon
                name="orders"
                size={21}
              />
            </div>

            <div className="font-bold mt-3">
              Loading orders...
            </div>

            <div className="text-xs text-[#81786f] mt-1">
              Please wait a moment.
            </div>
          </div>
        ) : filteredOrders.length ===
          0 ? (
          <div className="bg-white border border-[#ebe3da] rounded-[24px] p-14 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#f7f3ee] flex items-center justify-center">
              <Icon
                name="orders"
                size={24}
              />
            </div>

            <h2 className="font-bold text-lg mt-4">
              No orders found
            </h2>

            <p className="text-sm text-[#81786f] mt-1">
              Try changing the filter or
              search term.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map(
              (order) => (
                <OrderCard
                  key={order.order_id}
                  order={order}
                />
              )
            )}
          </div>
        )}
      </div>
    );
  }

  // =========================================================
  // MAIN UI
  // =========================================================

  return (
    <main className="min-h-screen bg-[#f8f6f3] text-[#211f1c]">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="flex-1 min-w-0">
          <Header />

          <main className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-[1600px] mx-auto">
            {activePage ===
              "overview" && (
              <OverviewPage />
            )}

            {activePage === "menu" && (
              <MenuPage />
            )}

            {activePage ===
              "orders" && (
              <OrdersPage />
            )}
          </main>
        </div>
      </div>

      {/* =====================================================
          VIEW ORDER MODAL
      ===================================================== */}

      {selectedOrder && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedOrder(null);
            }
          }}
        >
          <div className="bg-white rounded-[26px] w-full max-w-2xl max-h-[92vh] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.22)]">
            <div className="px-5 sm:px-6 py-5 border-b border-[#eee8e1] flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-[#9a9189]">
                  Order details
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <h2 className="text-2xl font-black">
                    #{selectedOrder.order_id}
                  </h2>

                  <span
                    className={`px-2.5 py-1 rounded-full border text-[10px] font-bold ${getStatusStyle(
                      selectedOrder.order_status
                    )}`}
                  >
                    {getStatusLabel(
                      selectedOrder.order_status
                    )}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedOrder(null)
                }
                className="w-10 h-10 rounded-xl bg-[#f7f3ee] flex items-center justify-center text-[#665d55] hover:bg-[#eee8e1] transition"
              >
                <Icon
                  name="close"
                  size={18}
                />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto max-h-[calc(92vh-150px)] space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-[#faf7f3] rounded-2xl p-4">
                  <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-[#9a9189]">
                    Customer
                  </div>

                  <div className="font-bold text-sm mt-2">
                    {selectedOrder.student_name ||
                      "Customer"}
                  </div>

                  <div className="text-xs text-[#81786f] mt-1">
                    {selectedOrder.delivery_phone ||
                      selectedOrder.student_phone ||
                      "No phone"}
                  </div>
                </div>

                <div className="bg-[#faf7f3] rounded-2xl p-4">
                  <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-[#9a9189]">
                    Fulfillment
                  </div>

                  <div className="font-bold text-sm mt-2">
                    {selectedOrder.fulfillment_type ===
                    "delivery"
                      ? "Delivery"
                      : "Customer Pickup"}
                  </div>

                  {selectedOrder.fulfillment_type ===
                    "delivery" && (
                    <div className="text-xs text-[#81786f] mt-1">
                      Building{" "}
                      {selectedOrder.building_number ||
                        "Not provided"}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-[#9a9189] mb-3">
                  Items
                </div>

                <div className="border border-[#eee8e1] rounded-2xl overflow-hidden divide-y divide-[#eee8e1]">
                  {(selectedOrder.items ||
                    []).map((item) => (
                    <div
                      key={
                        item.order_item_id
                      }
                      className="px-4 py-3.5 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="font-bold text-sm">
                          {item.menu_name}
                        </div>

                        <div className="text-xs text-[#81786f] mt-1">
                          Quantity:{" "}
                          {item.quantity}
                        </div>
                      </div>

                      <div className="font-bold text-sm">
                        ฿
                        {Number(
                          item.subtotal ||
                            0
                        ).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrder.fulfillment_type ===
                "delivery" && (
                <div className="bg-[#fff8f3] border border-[#f5e1d4] rounded-2xl p-4">
                  <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-[#9a9189] mb-2">
                    Delivery Information
                  </div>

                  <div className="text-sm">
                    <span className="font-bold">
                      Building:
                    </span>{" "}
                    {selectedOrder.building_number ||
                      "Not provided"}
                  </div>

                  {selectedOrder.delivery_note && (
                    <div className="text-sm mt-2">
                      <span className="font-bold">
                        Note:
                      </span>{" "}
                      {selectedOrder.delivery_note}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-[#eee8e1] flex items-end justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-[#9a9189]">
                    Total
                  </div>

                  <div className="text-xs text-[#81786f] mt-1">
                    Order #{selectedOrder.order_id}
                  </div>
                </div>

                <div className="text-2xl font-black">
                  ฿
                  {Number(
                    selectedOrder.total_amount ||
                      0
                  ).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="px-5 sm:px-6 py-4 border-t border-[#eee8e1] bg-[#fcfaf8] flex flex-wrap justify-end gap-2">
              {selectedOrder.order_status ===
                "pending" && (
                <button
                  type="button"
                  disabled={
                    updatingOrderId ===
                    selectedOrder.order_id
                  }
                  onClick={() =>
                    updateOrderStatus(
                      selectedOrder,
                      "confirmed"
                    )
                  }
                  className="h-10 px-4 rounded-xl bg-[#211f1c] text-white text-xs font-bold disabled:opacity-50"
                >
                  Confirm Order
                </button>
              )}

              {selectedOrder.order_status ===
                "confirmed" && (
                <button
                  type="button"
                  disabled={
                    updatingOrderId ===
                    selectedOrder.order_id
                  }
                  onClick={() =>
                    updateOrderStatus(
                      selectedOrder,
                      "preparing"
                    )
                  }
                  className="h-10 px-4 rounded-xl bg-[#e84a25] text-white text-xs font-bold disabled:opacity-50"
                >
                  Start Preparing
                </button>
              )}

              {selectedOrder.order_status ===
                "preparing" && (
                <button
                  type="button"
                  disabled={
                    updatingOrderId ===
                    selectedOrder.order_id
                  }
                  onClick={() =>
                    updateOrderStatus(
                      selectedOrder,
                      "ready"
                    )
                  }
                  className="h-10 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-50"
                >
                  Mark Ready
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setSelectedOrder(null)
                }
                className="h-10 px-4 rounded-xl border border-[#ded5ca] bg-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          ADD / EDIT MENU MODAL
      ===================================================== */}

      {showMenuModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowMenuModal(false);
            }
          }}
        >
          <div className="bg-white rounded-[26px] w-full max-w-xl max-h-[92vh] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.22)]">
            <div className="px-5 sm:px-6 py-5 border-b border-[#eee8e1] flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-[#e84a25]">
                  Menu
                </div>

                <h2 className="text-xl font-black mt-1">
                  {editingItem
                    ? "Edit Menu Item"
                    : "Add Menu Item"}
                </h2>

                <p className="text-xs text-[#81786f] mt-1">
                  {editingItem
                    ? "Update the information for this food item."
                    : "Add a new item to your food court menu."}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowMenuModal(false)
                }
                className="w-10 h-10 rounded-xl bg-[#f7f3ee] flex items-center justify-center text-[#665d55]"
              >
                <Icon
                  name="close"
                  size={18}
                />
              </button>
            </div>

            <form
              onSubmit={saveMenu}
              className="p-5 sm:p-6 overflow-y-auto max-h-[calc(92vh-130px)]"
            >
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-[#4d463f] mb-2">
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
                    placeholder="e.g. Chicken Teriyaki Rice"
                    className="w-full h-11 px-3.5 rounded-xl border border-[#ded5ca] bg-white text-sm outline-none focus:border-[#e84a25] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4d463f] mb-2">
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
                    placeholder="Describe the food item..."
                    className="w-full px-3.5 py-3 rounded-xl border border-[#ded5ca] bg-white text-sm outline-none focus:border-[#e84a25] transition resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#4d463f] mb-2">
                      Price
                    </label>

                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#81786f] text-sm">
                        ฿
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          menuForm.price
                        }
                        onChange={(event) =>
                          setMenuForm({
                            ...menuForm,
                            price:
                              event.target.value,
                          })
                        }
                        placeholder="0.00"
                        className="w-full h-11 pl-8 pr-3.5 rounded-xl border border-[#ded5ca] bg-white text-sm outline-none focus:border-[#e84a25] transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#4d463f] mb-2">
                      Category
                    </label>

                    <select
                      value={
                        menuForm.category
                      }
                      onChange={(event) =>
                        setMenuForm({
                          ...menuForm,
                          category:
                            event.target.value,
                        })
                      }
                      className="w-full h-11 px-3.5 rounded-xl border border-[#ded5ca] bg-white text-sm outline-none focus:border-[#e84a25] transition"
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
                  <label className="block text-xs font-bold text-[#4d463f] mb-2">
                    Food Image
                  </label>

                  <label className="block cursor-pointer">
                    <div className="border-2 border-dashed border-[#ded5ca] rounded-2xl overflow-hidden hover:border-[#e84a25] transition">
                      {menuImagePreview ? (
                        <div className="relative aspect-[16/8] bg-[#f7f3ee]">
                          <img
                            src={
                              menuImagePreview
                            }
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />

                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                            <span className="bg-white px-3 py-2 rounded-lg text-xs font-bold">
                              Change image
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-9 text-center">
                          <div className="w-11 h-11 mx-auto rounded-xl bg-[#f7f3ee] flex items-center justify-center">
                            <Icon
                              name="plus"
                              size={18}
                            />
                          </div>

                          <div className="text-sm font-bold mt-3">
                            Upload food image
                          </div>

                          <div className="text-xs text-[#81786f] mt-1">
                            JPG, PNG or WEBP
                          </div>
                        </div>
                      )}
                    </div>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={
                        handleMenuImageChange
                      }
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-7 pt-5 border-t border-[#eee8e1]">
                <button
                  type="button"
                  onClick={() =>
                    setShowMenuModal(false)
                  }
                  className="h-11 px-5 rounded-xl border border-[#ded5ca] text-xs font-bold hover:bg-[#f8f4ef] transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingMenu}
                  className="h-11 px-5 rounded-xl bg-[#e84a25] text-white text-xs font-bold hover:bg-[#d83d1d] disabled:opacity-50 transition"
                >
                  {savingMenu
                    ? "Saving..."
                    : editingItem
                    ? "Save Changes"
                    : "Add Menu Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          ACCOUNT MODAL
      ===================================================== */}

      {showAccountModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowAccountModal(false);
            }
          }}
        >
          <div className="bg-white rounded-[26px] w-full max-w-md max-h-[92vh] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.22)]">
            <div className="px-5 sm:px-6 py-5 border-b border-[#eee8e1] flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-[#e84a25]">
                  Account
                </div>

                <h2 className="text-xl font-black mt-1">
                  Shop Information
                </h2>

                <p className="text-xs text-[#81786f] mt-1">
                  Update the information shown
                  on your shop profile.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAccountModal(false)
                }
                className="w-10 h-10 rounded-xl bg-[#f7f3ee] flex items-center justify-center"
              >
                <Icon
                  name="close"
                  size={18}
                />
              </button>
            </div>

            <form
              onSubmit={saveAccount}
              className="p-5 sm:p-6 overflow-y-auto max-h-[calc(92vh-130px)]"
            >
              <div className="flex justify-center mb-6">
                <label className="relative cursor-pointer group">
                  <div className="w-24 h-24 rounded-[28px] bg-[#f5e9df] overflow-hidden flex items-center justify-center border-4 border-white shadow-[0_8px_25px_rgba(35,28,20,0.08)]">
                    {accountPreview ||
                    account?.shop_image ? (
                      <img
                        src={
                          accountPreview ||
                          account.shop_image
                        }
                        alt={
                          account?.name ||
                          "Shop"
                        }
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Icon
                        name="user"
                        size={30}
                      />
                    )}
                  </div>

                  <div className="absolute right-0 bottom-0 w-8 h-8 rounded-full bg-[#211f1c] text-white border-2 border-white flex items-center justify-center">
                    <Icon
                      name="edit"
                      size={13}
                    />
                  </div>

                  <input
                    type="file"
                    name="image"
                    accept="image/*"
                    onChange={
                      handleAccountChange
                    }
                    className="hidden"
                  />
                </label>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#4d463f] mb-2">
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
                    className="w-full h-11 px-3.5 rounded-xl border border-[#ded5ca] text-sm outline-none focus:border-[#e84a25] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4d463f] mb-2">
                    Email
                  </label>

                  <input
                    type="email"
                    value={
                      account?.email || ""
                    }
                    disabled
                    className="w-full h-11 px-3.5 rounded-xl border border-[#ded5ca] bg-[#f5f2ee] text-[#8a8178] text-sm outline-none"
                  />

                  <div className="text-[10px] text-[#9a9189] mt-1.5">
                    Email cannot be changed
                    here.
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4d463f] mb-2">
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
                    placeholder="Enter phone number"
                    className="w-full h-11 px-3.5 rounded-xl border border-[#ded5ca] text-sm outline-none focus:border-[#e84a25] transition"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-7 pt-5 border-t border-[#eee8e1]">
                <button
                  type="button"
                  onClick={() =>
                    setShowAccountModal(false)
                  }
                  className="h-11 px-5 rounded-xl border border-[#ded5ca] text-xs font-bold hover:bg-[#f8f4ef] transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    savingAccount
                  }
                  className="h-11 px-5 rounded-xl bg-[#e84a25] text-white text-xs font-bold hover:bg-[#d83d1d] disabled:opacity-50 transition"
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

// =========================================================
// SMALL COMPONENTS
// =========================================================

function MiniStat({
  label,
  value,
}) {
  return (
    <div className="bg-white border border-[#ebe3da] rounded-2xl p-4">
      <div className="text-[9px] uppercase tracking-[0.14em] font-bold text-[#9a9189]">
        {label}
      </div>

      <div className="text-xl font-black mt-1">
        {value}
      </div>
    </div>
  );
}

function PipelineStat({
  label,
  value,
}) {
  return (
    <div className="bg-[#2b2926] rounded-2xl p-4">
      <div className="text-[10px] text-[#a9a19a]">
        {label}
      </div>

      <div className="text-2xl font-black mt-1">
        {value}
      </div>
    </div>
  );
}

function OrderFilter({
  label,
  value,
  active,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-3 py-3 text-left border transition ${
        active
          ? "bg-[#211f1c] border-[#211f1c] text-white"
          : "bg-white border-[#ebe3da] text-[#514941] hover:bg-[#faf7f3]"
      }`}
    >
      <div
        className={`text-[9px] uppercase tracking-[0.12em] font-bold ${
          active
            ? "text-[#aaa19a]"
            : "text-[#9a9189]"
        }`}
      >
        {label}
      </div>

      <div className="text-lg font-black mt-1">
        {value}
      </div>
    </button>
  );
}

function MenuSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {Array.from({
        length: 6,
      }).map((_, index) => (
        <div
          key={index}
          className="bg-white border border-[#ebe3da] rounded-[22px] overflow-hidden animate-pulse"
        >
          <div className="aspect-[4/3] bg-[#eee8e1]" />

          <div className="p-5">
            <div className="h-5 bg-[#eee8e1] rounded w-2/3" />

            <div className="h-3 bg-[#f1ece6] rounded w-full mt-3" />

            <div className="h-3 bg-[#f1ece6] rounded w-4/5 mt-2" />

            <div className="h-10 bg-[#f1ece6] rounded-xl mt-5" />
          </div>
        </div>
      ))}
    </div>
  );
}