"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  const [students, setStudents] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [foodCourts, setFoodCourts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [selectedSlip, setSelectedSlip] = useState(null);
  const [approvingPayment, setApprovingPayment] = useState(null);
  const [rejectingCheckout, setRejectingCheckout] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const [selectedFoodCourts, setSelectedFoodCourts] = useState({});
  const [activeSection, setActiveSection] = useState("overview");

  // ==========================================
  // LOAD ADMIN DATA
  // ==========================================

  async function loadAdminData() {
    try {
      setLoading(true);

      const response = await fetch("/api/admin/data");
      const data = await response.json();

      if (data.success) {
        setStudents(data.students || []);
        setApprovals(data.approvals || []);
        setFoodCourts(data.foodCourts || []);
        setOrders(data.orders || []);
      } else {
        setMessage(data.message || "Failed to load admin data.");
      }
    } catch (error) {
      console.error("ADMIN DATA ERROR:", error);
      setMessage("Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // LOAD PAYMENT SUBMISSIONS
  // ==========================================

  async function loadPayments() {
    try {
      setPaymentLoading(true);

      const response = await fetch("/api/admin/payments");
      const data = await response.json();

      if (data.success) {
        setPayments(data.payments || []);
      } else {
        setMessage(
          data.message || "Failed to load payment submissions."
        );
      }
    } catch (error) {
      console.error("PAYMENT LOAD ERROR:", error);
      setMessage("Failed to load payment submissions.");
    } finally {
      setPaymentLoading(false);
    }
  }

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    loadAdminData();
    loadPayments();
  }, []);

  // ==========================================
  // APPROVE / REJECT ACCOUNT
  // ==========================================

  async function handleApproval(
    userId,
    action,
    foodCourtId = null
  ) {
    try {
      const response = await fetch("/api/admin/approve", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          action,
          food_court_id: foodCourtId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(data.message);
        await loadAdminData();

        setSelectedFoodCourts((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      console.error("ACCOUNT APPROVAL ERROR:", error);
      setMessage("Something went wrong.");
    }
  }

  // ==========================================
  // APPROVE PAYMENT
  // ==========================================

  async function handlePaymentApprove(checkoutId) {
    try {
      setPaymentLoading(true);
      setMessage("");

      const response = await fetch(
        "/api/admin/payments/approve",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            checkout_id: checkoutId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessage(
          data.message || "Unable to approve payment."
        );
        return;
      }

      setApprovingPayment(null);

      setMessage(
        "Payment approved successfully. The order has been confirmed and the QR receipt has been generated."
      );

      await loadPayments();
      await loadAdminData();
    } catch (error) {
      console.error("APPROVE PAYMENT ERROR:", error);
      setMessage("Unable to approve payment.");
    } finally {
      setPaymentLoading(false);
    }
  }

  // ==========================================
  // OPEN REJECT MODAL
  // ==========================================

  function openRejectModal(checkoutId) {
    setRejectingCheckout(checkoutId);
    setRejectReason("");
  }

  // ==========================================
  // REJECT PAYMENT
  // ==========================================

  async function handlePaymentReject() {
    if (!rejectingCheckout) {
      return;
    }

    if (!rejectReason.trim()) {
      setMessage("Please enter a rejection reason.");
      return;
    }

    try {
      setPaymentLoading(true);
      setMessage("");

      const response = await fetch(
        "/api/admin/payments/reject",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            checkout_id: rejectingCheckout,
            reason: rejectReason.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessage(
          data.message || "Unable to reject payment."
        );
        return;
      }

      setRejectingCheckout(null);
      setRejectReason("");

      setMessage("Payment rejected successfully.");

      await loadPayments();
      await loadAdminData();
    } catch (error) {
      console.error("REJECT PAYMENT ERROR:", error);
      setMessage("Unable to reject payment.");
    } finally {
      setPaymentLoading(false);
    }
  }

  // ==========================================
  // LOGOUT
  // ==========================================

  async function handleLogout() {
    try {
      await fetch("/api/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("LOGOUT ERROR:", error);
    }

    router.push("/login");
  }

  // ==========================================
  // STATUS
  // ==========================================

  function getStatusClass(status) {
    switch (status) {
      case "approved":
      case "verified":
      case "payment_approved":
      case "collected":
        return "bg-[#edf7ef] text-[#347a43] border-[#d6ead9]";

      case "pending":
      case "submitted":
      case "payment_submitted":
        return "bg-[#fff7e8] text-[#a66a00] border-[#f3dfb4]";

      case "preparing":
        return "bg-[#edf4ff] text-[#3569a8] border-[#d9e7fa]";

      case "ready":
        return "bg-[#f3edff] text-[#7251a5] border-[#e5dbf8]";

      case "rejected":
      case "payment_rejected":
      case "cancelled":
        return "bg-[#fff0ef] text-[#b8443d] border-[#f2d4d1]";

      default:
        return "bg-[#f4f2ef] text-[#6c6761] border-[#e7e2dc]";
    }
  }

  function getPaymentStatusLabel(payment) {
    if (payment.payment_status === "submitted") {
      return "Payment Submitted";
    }

    if (payment.payment_status === "approved") {
      return "Approved";
    }

    if (payment.payment_status === "rejected") {
      return "Rejected";
    }

    return payment.payment_status || "Pending";
  }

  function getSlipUrl(paymentProof) {
    if (!paymentProof) {
      return null;
    }

    if (
      paymentProof.startsWith("http://") ||
      paymentProof.startsWith("https://") ||
      paymentProof.startsWith("/")
    ) {
      return paymentProof;
    }

    return `/${paymentProof}`;
  }

  // ==========================================
  // SUMMARY DATA
  // ==========================================

  const pendingApprovals = useMemo(
    () =>
      approvals.filter(
        (user) => user.approval_status === "pending"
      ).length,
    [approvals]
  );

  const pendingPayments = useMemo(
    () =>
      payments.filter(
        (payment) => payment.payment_status === "submitted"
      ).length,
    [payments]
  );

  const activeOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          !["completed", "cancelled", "collected"].includes(
            order.status
          )
      ).length,
    [orders]
  );

  // ==========================================
  // ICONS
  // ==========================================

  function Icon({ name, size = 20, stroke = 1.8 }) {
    const common = {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: stroke,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    };

    const paths = {
      grid: (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </>
      ),

      users: (
        <>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </>
      ),

      store: (
        <>
          <path d="M3 10h18" />
          <path d="M5 10v10h14V10" />
          <path d="M3 10l2-6h14l2 6" />
          <path d="M9 20v-6h6v6" />
        </>
      ),

      receipt: (
        <>
          <path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3z" />
          <path d="M8 7h8" />
          <path d="M8 11h8" />
          <path d="M8 15h5" />
        </>
      ),

      credit: (
        <>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
          <path d="M6 15h4" />
        </>
      ),

      logout: (
        <>
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
          <path d="M21 19V5a2 2 0 0 0-2-2h-5" />
        </>
      ),

      arrow: (
        <>
          <path d="M5 12h14" />
          <path d="M13 6l6 6-6 6" />
        </>
      ),

      check: (
        <>
          <path d="M20 6L9 17l-5-5" />
        </>
      ),

      close: (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </>
      ),

      refresh: (
        <>
          <path d="M20 11a8.1 8.1 0 0 0-15.5-2" />
          <path d="M4 4v5h5" />
          <path d="M4 13a8.1 8.1 0 0 0 15.5 2" />
          <path d="M20 20v-5h-5" />
        </>
      ),

      image: (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="8.5" cy="9" r="1.5" />
          <path d="M21 15l-5-5L5 20" />
        </>
      ),

      eye: (
        <>
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
          <circle cx="12" cy="12" r="2.5" />
        </>
      ),
    };

    return <svg {...common}>{paths[name]}</svg>;
  }

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f5f0] flex items-center justify-center text-[#211e1a]">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-[#ded8d0] border-t-[#e87524] rounded-full animate-spin mx-auto" />

          <p className="text-sm font-medium mt-4 text-[#625c55]">
            Loading admin dashboard...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f5f0] text-[#211e1a]">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="sticky top-0 z-40 bg-[#f8f5f0]/95 backdrop-blur-md border-b border-[#e8e2da]">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8">
          <div className="h-[72px] flex items-center justify-between gap-4">

            <div className="flex items-center gap-4 min-w-0">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="hidden sm:flex items-center gap-2 text-[#756e66] hover:text-[#211e1a] transition text-sm"
              >
                <span className="text-lg">←</span>
                Back
              </button>

              <div className="hidden sm:block h-7 w-px bg-[#ddd7cf]" />

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#211e1a] text-white flex items-center justify-center font-bold text-sm">
                  U
                </div>

                <div className="min-w-0">
                  <h1 className="font-bold tracking-tight text-[17px]">
                    UniPlate
                  </h1>

                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#8b837b]">
                    Administration
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:block text-right mr-2">
                <p className="text-sm font-semibold">
                  Administrator
                </p>
                <p className="text-[11px] text-[#8b837b]">
                  Control Center
                </p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="h-10 px-3 sm:px-4 rounded-xl border border-[#ded8d0] bg-white hover:bg-[#211e1a] hover:text-white transition flex items-center gap-2 text-sm font-medium"
              >
                <Icon name="logout" size={17} />
                <span className="hidden sm:inline">
                  Logout
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 py-7 sm:py-9">

        {/* ===================================================
            PAGE INTRO
        =================================================== */}

        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.18em] text-[#e87524] font-semibold mb-2">
            Admin Dashboard
          </p>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.04em]">
                Welcome back.
              </h2>

              <p className="mt-2 text-[#756e66] text-sm sm:text-[15px]">
                Manage UniPlate accounts, payments, students and orders.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                loadAdminData();
                loadPayments();
              }}
              disabled={paymentLoading}
              className="self-start lg:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#ded8d0] bg-white hover:bg-[#211e1a] hover:text-white transition text-sm font-medium"
            >
              <Icon name="refresh" size={16} />
              Refresh Dashboard
            </button>
          </div>
        </div>

        {/* ===================================================
            MESSAGE
        =================================================== */}

        {message && (
          <div className="mb-6 bg-white border border-[#e4ddd5] rounded-2xl px-4 py-3.5 flex items-start gap-3 shadow-[0_4px_18px_rgba(33,30,26,0.04)]">
            <div className="w-7 h-7 rounded-full bg-[#fff1e6] text-[#e87524] flex items-center justify-center shrink-0">
              <Icon name="check" size={15} stroke={2.2} />
            </div>

            <p className="text-sm font-medium text-[#4e4842] flex-1 pt-1">
              {message}
            </p>

            <button
              type="button"
              onClick={() => setMessage("")}
              className="text-[#aaa29a] hover:text-[#211e1a] transition"
            >
              <Icon name="close" size={17} />
            </button>
          </div>
        )}

        {/* ===================================================
            SUMMARY CARDS
        =================================================== */}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-9">

          <SummaryCard
            icon="users"
            label="Students"
            value={students.length}
            detail="Registered accounts"
          />

          <SummaryCard
            icon="store"
            label="Food Shops"
            value={approvals.filter(
              (user) => user.role === "shopowner"
            ).length}
            detail={`${pendingApprovals} pending approval`}
            accent={pendingApprovals > 0}
          />

          <SummaryCard
            icon="receipt"
            label="Orders"
            value={orders.length}
            detail={`${activeOrders} active orders`}
          />

          <SummaryCard
            icon="credit"
            label="Payments"
            value={payments.length}
            detail={`${pendingPayments} awaiting review`}
            accent={pendingPayments > 0}
          />
        </div>

        {/* ===================================================
            QUICK NAV
        =================================================== */}

        <div className="flex gap-2 overflow-x-auto pb-1 mb-8 scrollbar-hide">
          <NavButton
            active={activeSection === "overview"}
            onClick={() => setActiveSection("overview")}
          >
            Overview
          </NavButton>

          <NavButton
            active={activeSection === "accounts"}
            onClick={() => setActiveSection("accounts")}
          >
            Account Approval
            {pendingApprovals > 0 && (
              <span className="ml-2 bg-[#e87524] text-white text-[10px] min-w-5 h-5 px-1.5 rounded-full inline-flex items-center justify-center">
                {pendingApprovals}
              </span>
            )}
          </NavButton>

          <NavButton
            active={activeSection === "payments"}
            onClick={() => setActiveSection("payments")}
          >
            Payments
            {pendingPayments > 0 && (
              <span className="ml-2 bg-[#e87524] text-white text-[10px] min-w-5 h-5 px-1.5 rounded-full inline-flex items-center justify-center">
                {pendingPayments}
              </span>
            )}
          </NavButton>

          <NavButton
            active={activeSection === "students"}
            onClick={() => setActiveSection("students")}
          >
            Students
          </NavButton>

          <NavButton
            active={activeSection === "orders"}
            onClick={() => setActiveSection("orders")}
          >
            Orders
          </NavButton>
        </div>

        {/* ===================================================
            ACCOUNT APPROVAL
        =================================================== */}

        {(activeSection === "overview" ||
          activeSection === "accounts") && (
          <AdminSection
            eyebrow="Accounts"
            title="Account Approval"
            description="Review Shop Owner and Delivery registration requests."
            action={
              <span className="text-xs text-[#8b837b]">
                {approvals.length} accounts
              </span>
            }
          >
            {approvals.length === 0 ? (
              <EmptyState text="No Shop Owner or Delivery accounts found." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px]">
                  <thead>
                    <tr className="border-b border-[#eee9e3]">
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Food Court</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </tr>
                  </thead>

                  <tbody>
                    {approvals.map((user) => (
                      <tr
                        key={user.user_id}
                        className="border-b border-[#f0ebe6] last:border-0 hover:bg-[#fcfaf8] transition"
                      >
                        <TableCell>
                          <span className="font-semibold text-[#7b746d]">
                            #{user.user_id}
                          </span>
                        </TableCell>

                        <TableCell>
                          <p className="font-semibold">
                            {user.name}
                          </p>
                        </TableCell>

                        <TableCell>
                          <p className="text-sm">
                            {user.email}
                          </p>

                          <p className="text-xs text-[#958d84] mt-1">
                            {user.phone || "No phone"}
                          </p>
                        </TableCell>

                        <TableCell>
                          <span className="inline-flex px-2.5 py-1 rounded-full bg-[#f4f1ed] border border-[#e7e1da] text-xs font-medium capitalize">
                            {user.role}
                          </span>
                        </TableCell>

                        <TableCell>
                          {user.role === "shopowner" ? (
                            user.food_court_name ? (
                              <span className="text-sm font-medium">
                                {user.food_court_name}
                              </span>
                            ) : (
                              <span className="text-xs text-[#b8443d]">
                                Not assigned
                              </span>
                            )
                          ) : (
                            <span className="text-[#aaa29a]">
                              —
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          <StatusBadge
                            status={user.approval_status}
                          />
                        </TableCell>

                        <TableCell>
                          {user.approval_status === "pending" ? (
                            <div className="flex flex-col gap-2 min-w-[180px]">
                              {user.role === "shopowner" && (
                                <select
                                  value={
                                    selectedFoodCourts[
                                      user.user_id
                                    ] || ""
                                  }
                                  onChange={(event) =>
                                    setSelectedFoodCourts(
                                      (prev) => ({
                                        ...prev,
                                        [user.user_id]:
                                          event.target.value,
                                      })
                                    )
                                  }
                                  className="h-9 rounded-lg border border-[#ded8d0] bg-white px-3 text-xs outline-none focus:border-[#e87524] focus:ring-2 focus:ring-[#e87524]/10"
                                >
                                  <option value="">
                                    Select Food Court
                                  </option>

                                  {foodCourts.map(
                                    (foodCourt) => (
                                      <option
                                        key={
                                          foodCourt.food_court_id
                                        }
                                        value={
                                          foodCourt.food_court_id
                                        }
                                      >
                                        {foodCourt.name}
                                      </option>
                                    )
                                  )}
                                </select>
                              )}

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const foodCourtId =
                                      selectedFoodCourts[
                                        user.user_id
                                      ] || null;

                                    if (
                                      user.role === "shopowner" &&
                                      !foodCourtId
                                    ) {
                                      setMessage(
                                        "Please select a Food Court before approving this Shop Owner."
                                      );
                                      return;
                                    }

                                    handleApproval(
                                      user.user_id,
                                      "approve",
                                      foodCourtId
                                    );
                                  }}
                                  className="flex-1 h-9 rounded-lg bg-[#211e1a] text-white text-xs font-semibold hover:bg-[#e87524] transition"
                                >
                                  Approve
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleApproval(
                                      user.user_id,
                                      "reject"
                                    )
                                  }
                                  className="flex-1 h-9 rounded-lg border border-[#e5d3d0] bg-[#fff8f7] text-[#b8443d] text-xs font-semibold hover:bg-[#fff0ef] transition"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-[#aaa29a]">
                              No action
                            </span>
                          )}
                        </TableCell>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminSection>
        )}

        {/* ===================================================
            PAYMENT VERIFICATION
        =================================================== */}

        {(activeSection === "overview" ||
          activeSection === "payments") && (
          <AdminSection
            eyebrow="Transactions"
            title="Payment Verification"
            description="Review payment slips submitted by students."
            action={
              <button
                type="button"
                onClick={loadPayments}
                disabled={paymentLoading}
                className="flex items-center gap-2 h-9 px-3 rounded-lg border border-[#ded8d0] bg-white text-xs font-semibold hover:bg-[#211e1a] hover:text-white transition disabled:opacity-50"
              >
                <Icon name="refresh" size={14} />
                {paymentLoading
                  ? "Refreshing..."
                  : "Refresh"}
              </button>
            }
          >
            {paymentLoading && payments.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-7 h-7 border-2 border-[#ded8d0] border-t-[#e87524] rounded-full animate-spin mx-auto" />
                <p className="text-sm text-[#8b837b] mt-3">
                  Loading payment submissions...
                </p>
              </div>
            ) : payments.length === 0 ? (
              <EmptyState text="No payment submissions found." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px]">
                  <thead>
                    <tr className="border-b border-[#eee9e3]">
                      <TableHead>Checkout</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Payment Slip</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </tr>
                  </thead>

                  <tbody>
                    {payments.map((payment) => {
                      const slipUrl = getSlipUrl(
                        payment.payment_proof
                      );

                      return (
                        <tr
                          key={payment.payment_id}
                          className="border-b border-[#f0ebe6] last:border-0 hover:bg-[#fcfaf8] transition"
                        >
                          <TableCell>
                            <span className="font-bold">
                              #{payment.checkout_id}
                            </span>
                          </TableCell>

                          <TableCell>
                            <p className="font-semibold">
                              {payment.student_name || "-"}
                            </p>

                            <p className="text-xs text-[#958d84] mt-1">
                              {payment.student_email || "-"}
                            </p>
                          </TableCell>

                          <TableCell>
                            <span className="font-bold text-base">
                              ฿
                              {Number(
                                payment.amount ||
                                  payment.total_amount ||
                                  0
                              ).toFixed(2)}
                            </span>
                          </TableCell>

                          <TableCell>
                            <span className="text-sm">
                              {payment.payment_method ||
                                "QR"}
                            </span>
                          </TableCell>

                          <TableCell>
                            {slipUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedSlip({
                                    url: slipUrl,
                                    student:
                                      payment.student_name,
                                    checkout:
                                      payment.checkout_id,
                                  })
                                }
                                className="group flex items-center gap-3"
                              >
                                <img
                                  src={slipUrl}
                                  alt="Payment slip"
                                  className="w-14 h-14 rounded-xl object-cover border border-[#e4ddd5] group-hover:opacity-70 transition"
                                />

                                <span className="text-xs font-semibold text-[#e87524] group-hover:underline">
                                  View
                                </span>
                              </button>
                            ) : (
                              <span className="text-xs text-[#aaa29a]">
                                No slip
                              </span>
                            )}
                          </TableCell>

                          <TableCell>
                            <StatusBadge
                              status={payment.payment_status}
                              label={getPaymentStatusLabel(
                                payment
                              )}
                            />
                          </TableCell>

                          <TableCell>
                            {payment.payment_status ===
                            "submitted" ? (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setApprovingPayment(payment)
                                  }
                                  disabled={paymentLoading}
                                  className="h-9 px-3 rounded-lg bg-[#211e1a] text-white text-xs font-semibold hover:bg-[#e87524] transition disabled:opacity-50"
                                >
                                  Approve
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    openRejectModal(
                                      payment.checkout_id
                                    )
                                  }
                                  disabled={paymentLoading}
                                  className="h-9 px-3 rounded-lg border border-[#e5d3d0] bg-[#fff8f7] text-[#b8443d] text-xs font-semibold hover:bg-[#fff0ef] transition disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : payment.payment_status ===
                              "approved" ? (
                              <span className="text-xs font-semibold text-[#347a43]">
                                QR Generated
                              </span>
                            ) : payment.payment_status ===
                              "rejected" ? (
                              <div className="max-w-[220px]">
                                <span className="text-xs font-semibold text-[#b8443d]">
                                  Rejected
                                </span>

                                {payment.rejection_reason && (
                                  <p className="text-xs text-[#8b837b] mt-1 leading-5">
                                    {payment.rejection_reason}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-[#aaa29a]">
                                No action
                              </span>
                            )}
                          </TableCell>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </AdminSection>
        )}

        {/* ===================================================
            STUDENT MANAGEMENT
        =================================================== */}

        {(activeSection === "overview" ||
          activeSection === "students") && (
          <AdminSection
            eyebrow="Users"
            title="Student Management"
            description="View registered student account information."
          >
            {students.length === 0 ? (
              <EmptyState text="No students found." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[750px]">
                  <thead>
                    <tr className="border-b border-[#eee9e3]">
                      <TableHead>Student ID</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                    </tr>
                  </thead>

                  <tbody>
                    {students.map((student) => (
                      <tr
                        key={student.student_id}
                        className="border-b border-[#f0ebe6] last:border-0 hover:bg-[#fcfaf8] transition"
                      >
                        <TableCell>
                          <span className="font-semibold">
                            #{student.student_id}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span className="font-semibold">
                            {student.name}
                          </span>
                        </TableCell>

                        <TableCell>
                          {student.email}
                        </TableCell>

                        <TableCell>
                          {student.phone || "-"}
                        </TableCell>

                        <TableCell>
                          <StatusBadge
                            status={student.approval_status}
                          />
                        </TableCell>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminSection>
        )}

        {/* ===================================================
            ORDER MANAGEMENT
        =================================================== */}

        {(activeSection === "overview" ||
          activeSection === "orders") && (
          <AdminSection
            eyebrow="Operations"
            title="Order Management"
            description="Monitor orders placed across UniPlate food courts."
          >
            {orders.length === 0 ? (
              <EmptyState text="No orders found." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-[#eee9e3]">
                      <TableHead>Order</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Menu</TableHead>
                      <TableHead>Shop</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                    </tr>
                  </thead>

                  <tbody>
                    {orders.map((order) => (
                      <tr
                        key={order.order_id}
                        className="border-b border-[#f0ebe6] last:border-0 hover:bg-[#fcfaf8] transition"
                      >
                        <TableCell>
                          <span className="font-bold">
                            #{order.order_id}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span className="font-medium">
                            {order.student_name}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span className="text-sm text-[#625c55]">
                            {order.menu}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span className="font-medium">
                            {order.shop_name}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span className="font-bold">
                            ฿
                            {Number(order.total).toFixed(2)}
                          </span>
                        </TableCell>

                        <TableCell>
                          <StatusBadge
                            status={order.status}
                            label={order.status}
                          />
                        </TableCell>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminSection>
        )}
      </div>

      {/* =====================================================
          APPROVE PAYMENT MODAL
      ===================================================== */}

      {approvingPayment && (
        <ModalOverlay
          onClose={() => {
            if (!paymentLoading) {
              setApprovingPayment(null);
            }
          }}
        >
          <div className="w-full max-w-md bg-white rounded-[24px] shadow-[0_24px_80px_rgba(33,30,26,0.2)] overflow-hidden">
            <div className="px-6 pt-6 pb-5 border-b border-[#eee9e3]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#edf7ef] text-[#347a43] flex items-center justify-center">
                  <Icon name="check" size={21} stroke={2.2} />
                </div>

                <div>
                  <h3 className="font-bold text-lg">
                    Approve Payment
                  </h3>

                  <p className="text-sm text-[#8b837b] mt-0.5">
                    Confirm payment verification
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm leading-6 text-[#625c55]">
                Are you sure you want to approve this payment?
              </p>

              <div className="mt-5 rounded-2xl bg-[#f8f5f0] border border-[#eee9e3] p-4">
                <InfoRow
                  label="Checkout"
                  value={`#${approvingPayment.checkout_id}`}
                />

                <InfoRow
                  label="Student"
                  value={
                    approvingPayment.student_name || "-"
                  }
                />

                <InfoRow
                  label="Amount"
                  value={`฿${Number(
                    approvingPayment.amount ||
                      approvingPayment.total_amount ||
                      0
                  ).toFixed(2)}`}
                  strong
                />
              </div>

              <div className="mt-4 rounded-xl bg-[#fff7ee] border border-[#f2dfc9] px-4 py-3">
                <p className="text-xs leading-5 text-[#8c5a25]">
                  Approving this payment will confirm the
                  related orders and generate one QR receipt
                  for this checkout.
                </p>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-5 border-t border-[#eee9e3]">
              <button
                type="button"
                onClick={() =>
                  setApprovingPayment(null)
                }
                disabled={paymentLoading}
                className="flex-1 h-11 rounded-xl border border-[#ded8d0] text-sm font-semibold hover:bg-[#f8f5f0] transition disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  handlePaymentApprove(
                    approvingPayment.checkout_id
                  )
                }
                disabled={paymentLoading}
                className="flex-1 h-11 rounded-xl bg-[#211e1a] text-white text-sm font-semibold hover:bg-[#e87524] transition disabled:opacity-50"
              >
                {paymentLoading
                  ? "Approving..."
                  : "Approve Payment"}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* =====================================================
          PAYMENT SLIP MODAL
      ===================================================== */}

      {selectedSlip && (
        <ModalOverlay
          dark
          onClose={() => setSelectedSlip(null)}
        >
          <div
            className="relative max-w-4xl max-h-[92vh] bg-white rounded-[24px] shadow-2xl overflow-hidden"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              onClick={() => setSelectedSlip(null)}
              className="absolute right-4 top-4 z-10 w-10 h-10 rounded-full bg-[#211e1a] text-white flex items-center justify-center hover:bg-[#e87524] transition"
            >
              <Icon name="close" size={19} />
            </button>

            <div className="px-6 py-5 border-b border-[#eee9e3] pr-16">
              <p className="font-bold">
                Payment Slip
              </p>

              <p className="text-xs text-[#8b837b] mt-1">
                Checkout #{selectedSlip.checkout}
                {selectedSlip.student
                  ? ` • ${selectedSlip.student}`
                  : ""}
              </p>
            </div>

            <div className="max-h-[78vh] overflow-auto bg-[#f2eee9] p-5">
              <img
                src={selectedSlip.url}
                alt="Student payment slip"
                className="mx-auto max-h-[72vh] w-auto rounded-xl shadow-lg object-contain"
              />
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* =====================================================
          REJECT PAYMENT MODAL
      ===================================================== */}

      {rejectingCheckout && (
        <ModalOverlay
          onClose={() => {
            if (!paymentLoading) {
              setRejectingCheckout(null);
              setRejectReason("");
            }
          }}
        >
          <div className="w-full max-w-md bg-white rounded-[24px] shadow-[0_24px_80px_rgba(33,30,26,0.2)] overflow-hidden">
            <div className="px-6 pt-6 pb-5 border-b border-[#eee9e3]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#fff0ef] text-[#b8443d] flex items-center justify-center">
                  <Icon name="close" size={21} />
                </div>

                <div>
                  <h3 className="font-bold text-lg">
                    Reject Payment
                  </h3>

                  <p className="text-sm text-[#8b837b] mt-0.5">
                    Provide a reason for rejection
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <label className="block text-sm font-semibold mb-2">
                Rejection Reason
              </label>

              <textarea
                value={rejectReason}
                onChange={(event) =>
                  setRejectReason(event.target.value)
                }
                placeholder="Example: Payment amount does not match the order total."
                className="w-full h-32 resize-none rounded-xl border border-[#ded8d0] bg-[#fcfaf8] px-4 py-3 text-sm outline-none focus:border-[#e87524] focus:ring-2 focus:ring-[#e87524]/10 transition"
              />

              <p className="mt-2 text-xs text-[#9a9289]">
                This reason can be shown to the student.
              </p>
            </div>

            <div className="flex gap-3 px-6 py-5 border-t border-[#eee9e3]">
              <button
                type="button"
                onClick={() => {
                  setRejectingCheckout(null);
                  setRejectReason("");
                }}
                disabled={paymentLoading}
                className="flex-1 h-11 rounded-xl border border-[#ded8d0] text-sm font-semibold hover:bg-[#f8f5f0] transition disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handlePaymentReject}
                disabled={
                  paymentLoading ||
                  !rejectReason.trim()
                }
                className="flex-1 h-11 rounded-xl bg-[#b8443d] text-white text-sm font-semibold hover:bg-[#9f3933] transition disabled:opacity-50"
              >
                {paymentLoading
                  ? "Rejecting..."
                  : "Reject Payment"}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </main>
  );
}

/* ============================================================
   SUMMARY CARD
============================================================ */

function SummaryCard({
  icon,
  label,
  value,
  detail,
  accent = false,
}) {
  return (
    <div className="bg-white border border-[#e8e2da] rounded-2xl p-4 sm:p-5 shadow-[0_4px_18px_rgba(33,30,26,0.035)] hover:shadow-[0_8px_28px_rgba(33,30,26,0.07)] transition">
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#f7f1eb] text-[#e87524] flex items-center justify-center">
          <AdminIcon name={icon} size={19} />
        </div>

        {accent && (
          <span className="w-2 h-2 rounded-full bg-[#e87524] mt-1" />
        )}
      </div>

      <p className="text-xs uppercase tracking-[0.12em] text-[#958d84] font-semibold mt-5">
        {label}
      </p>

      <p className="text-2xl sm:text-3xl font-bold tracking-[-0.04em] mt-1">
        {value}
      </p>

      <p className="text-xs text-[#8b837b] mt-1">
        {detail}
      </p>
    </div>
  );
}

/* ============================================================
   SECTION
============================================================ */

function AdminSection({
  eyebrow,
  title,
  description,
  action,
  children,
}) {
  return (
    <section className="mb-7">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#e87524] font-bold mb-1">
            {eyebrow}
          </p>

          <h3 className="text-xl sm:text-2xl font-bold tracking-[-0.035em]">
            {title}
          </h3>

          <p className="text-sm text-[#817970] mt-1">
            {description}
          </p>
        </div>

        {action}
      </div>

      <div className="bg-white border border-[#e8e2da] rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(33,30,26,0.035)]">
        {children}
      </div>
    </section>
  );
}

/* ============================================================
   TABLE
============================================================ */

function TableHead({ children }) {
  return (
    <th className="text-left px-5 py-3.5 text-[10px] uppercase tracking-[0.12em] font-bold text-[#958d84] whitespace-nowrap">
      {children}
    </th>
  );
}

function TableCell({ children }) {
  return (
    <td className="px-5 py-4 text-sm text-[#514b45] align-middle">
      {children}
    </td>
  );
}

/* ============================================================
   STATUS
============================================================ */

function StatusBadge({ status, label }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1.5 rounded-full border text-[11px] font-semibold capitalize whitespace-nowrap ${getStatusClassStatic(
        status
      )}`}
    >
      {label || status || "Unknown"}
    </span>
  );
}

function getStatusClassStatic(status) {
  switch (status) {
    case "approved":
    case "verified":
    case "payment_approved":
    case "collected":
      return "bg-[#edf7ef] text-[#347a43] border-[#d6ead9]";

    case "pending":
    case "submitted":
    case "payment_submitted":
      return "bg-[#fff7e8] text-[#a66a00] border-[#f3dfb4]";

    case "preparing":
      return "bg-[#edf4ff] text-[#3569a8] border-[#d9e7fa]";

    case "ready":
      return "bg-[#f3edff] text-[#7251a5] border-[#e5dbf8]";

    case "rejected":
    case "payment_rejected":
    case "cancelled":
      return "bg-[#fff0ef] text-[#b8443d] border-[#f2d4d1]";

    default:
      return "bg-[#f4f2ef] text-[#6c6761] border-[#e7e2dc]";
  }
}

/* ============================================================
   EMPTY STATE
============================================================ */

function EmptyState({ text }) {
  return (
    <div className="py-14 px-5 text-center">
      <div className="w-12 h-12 rounded-2xl bg-[#f5f1ec] text-[#aaa29a] mx-auto flex items-center justify-center">
        <AdminIcon name="grid" size={20} />
      </div>

      <p className="text-sm text-[#8b837b] mt-4">
        {text}
      </p>
    </div>
  );
}

/* ============================================================
   NAV BUTTON
============================================================ */

function NavButton({ active, onClick, children }) {
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

/* ============================================================
   INFO ROW
============================================================ */

function InfoRow({ label, value, strong = false }) {
  return (
    <div className="flex items-center justify-between gap-5 py-2">
      <span className="text-sm text-[#8b837b]">
        {label}
      </span>

      <span
        className={`text-sm text-right ${
          strong
            ? "font-bold text-lg"
            : "font-semibold text-[#211e1a]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/* ============================================================
   MODAL
============================================================ */

function ModalOverlay({
  children,
  onClose,
  dark = false,
}) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 ${
        dark
          ? "bg-[#211e1a]/75"
          : "bg-[#211e1a]/45"
      } backdrop-blur-sm`}
      onClick={onClose}
    >
      <div onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

/* ============================================================
   ICON COMPONENT FOR CHILD COMPONENTS
============================================================ */

function AdminIcon({ name, size = 20 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  switch (name) {
    case "users":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );

    case "store":
      return (
        <svg {...common}>
          <path d="M3 10h18" />
          <path d="M5 10v10h14V10" />
          <path d="M3 10l2-6h14l2 6" />
          <path d="M9 20v-6h6v6" />
        </svg>
      );

    case "receipt":
      return (
        <svg {...common}>
          <path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3z" />
          <path d="M8 7h8" />
          <path d="M8 11h8" />
          <path d="M8 15h5" />
        </svg>
      );

    case "credit":
      return (
        <svg {...common}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
          <path d="M6 15h4" />
        </svg>
      );

    case "grid":
    default:
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
  }
}