"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  const [students, setStudents] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [selectedSlip, setSelectedSlip] = useState(null);
  const [approvingPayment, setApprovingPayment] = useState(null);
  const [rejectingCheckout, setRejectingCheckout] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

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
        setOrders(data.orders || []);
      } else {
        setMessage(
          data.message || "Failed to load admin data."
        );
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
          data.message ||
            "Failed to load payment submissions."
        );
      }
    } catch (error) {
      console.error("PAYMENT LOAD ERROR:", error);
      setMessage(
        "Failed to load payment submissions."
      );
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
  //
  // IMPORTANT:
  // We no longer send food_court_id.
  //
  // The API automatically creates:
  //
  // Drink -> Drink Food Court
  // Japanese -> Japanese Food Court
  // etc.
  //
  // ==========================================

  async function handleApproval(userId, action) {
    try {
      setMessage("");

      const response = await fetch(
        "/api/admin/approve",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            action,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setMessage(data.message);
        await loadAdminData();
      } else {
        setMessage(
          data.message ||
            "Unable to update account."
        );
      }
    } catch (error) {
      console.error(
        "ACCOUNT APPROVAL ERROR:",
        error
      );

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
          data.message ||
            "Unable to approve payment."
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
      console.error(
        "APPROVE PAYMENT ERROR:",
        error
      );

      setMessage(
        "Unable to approve payment."
      );
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
      setMessage(
        "Please enter a rejection reason."
      );
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
          data.message ||
            "Unable to reject payment."
        );
        return;
      }

      setRejectingCheckout(null);
      setRejectReason("");

      setMessage(
        "Payment rejected successfully."
      );

      await loadPayments();
      await loadAdminData();
    } catch (error) {
      console.error(
        "REJECT PAYMENT ERROR:",
        error
      );

      setMessage(
        "Unable to reject payment."
      );
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
      console.error(
        "LOGOUT ERROR:",
        error
      );
    }

    router.push("/login");
  }

  // ==========================================
  // STATUS STYLE
  // ==========================================

  function getStatusClass(status) {
    switch (status) {
      case "approved":
      case "verified":
      case "payment_approved":
      case "collected":
        return "bg-green-100 text-green-700";

      case "pending":
      case "submitted":
      case "payment_submitted":
        return "bg-yellow-100 text-yellow-700";

      case "preparing":
        return "bg-blue-100 text-blue-700";

      case "ready":
        return "bg-purple-100 text-purple-700";

      case "rejected":
      case "payment_rejected":
      case "cancelled":
        return "bg-red-100 text-red-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  // ==========================================
  // PAYMENT STATUS LABEL
  // ==========================================

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

  // ==========================================
  // PAYMENT IMAGE URL
  // ==========================================

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
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f4ef] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-[#211e1a] rounded-full animate-spin mx-auto" />

          <p className="text-gray-600 text-sm mt-3">
            Loading Admin Dashboard...
          </p>
        </div>
      </main>
    );
  }

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <main className="min-h-screen bg-[#f7f4ef] text-[#211e1a]">

      {/* =====================================
          HEADER
      ===================================== */}

      <header className="sticky top-0 z-30 bg-[#211e1a] text-white px-5 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">

          <div className="flex items-center gap-4">

            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 text-gray-300 hover:text-white text-sm transition"
            >
              <span className="text-lg">
                ←
              </span>

              Back
            </button>

            <div className="h-5 w-px bg-white/20" />

            <div>
              <h1 className="text-lg font-bold">
                UniPlate Admin
              </h1>

              <p className="text-gray-400 text-xs">
                Administration Dashboard
              </p>
            </div>

          </div>

          <div className="flex items-center gap-2">

            <div className="bg-white/10 px-3 py-1.5 rounded-lg text-sm">
              Administrator
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="border border-white/20 hover:bg-white hover:text-[#211e1a] px-3 py-1.5 rounded-lg text-sm transition"
            >
              Logout
            </button>

          </div>

        </div>
      </header>

      {/* =====================================
          CONTENT
      ===================================== */}

      <div className="max-w-7xl mx-auto px-5 py-6">

        {/* =====================================
            MESSAGE
        ===================================== */}

        {message && (
          <div className="mb-5 bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">

            <p className="text-sm font-medium">
              {message}
            </p>

            <button
              type="button"
              onClick={() => setMessage("")}
              className="text-gray-400 hover:text-gray-700 text-lg"
            >
              ×
            </button>

          </div>
        )}

        {/* =====================================
            ACCOUNT APPROVAL
        ===================================== */}

        <section className="mb-8">

          <div className="mb-4 flex items-end justify-between">

            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-orange-600 font-semibold">
                Accounts
              </p>

              <h2 className="text-2xl font-bold mt-1">
                Account Approval
              </h2>

              <p className="text-gray-500 text-sm mt-1">
                Approve or reject Shop Owner and Delivery accounts.
              </p>
            </div>

            <span className="text-sm text-gray-500">
              {approvals.length} accounts
            </span>

          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-[#e6dfd6] overflow-hidden">

            {approvals.length === 0 ? (

              <div className="p-8 text-gray-500 text-sm">
                No Shop Owner or Delivery accounts found.
              </div>

            ) : (

              <div className="overflow-x-auto">

                <table className="w-full text-sm">

                  <thead className="bg-[#faf8f4] border-b border-[#e6dfd6]">

                    <tr>

                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-[0.15em] text-gray-500">
                        ID
                      </th>

                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-[0.15em] text-gray-500">
                        Name
                      </th>

                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-[0.15em] text-gray-500">
                        Contact
                      </th>

                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-[0.15em] text-gray-500">
                        Role
                      </th>

                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-[0.15em] text-gray-500">
                        Food Court
                      </th>

                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-[0.15em] text-gray-500">
                        Status
                      </th>

                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-[0.15em] text-gray-500">
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {approvals.map((user) => (

                      <tr
                        key={user.user_id}
                        className="border-b border-[#eee8df] last:border-b-0 hover:bg-[#fcfaf7] transition"
                      >

                        {/* ID */}

                        <td className="px-5 py-5 font-semibold text-gray-600">
                          #{user.user_id}
                        </td>

                        {/* NAME */}

                        <td className="px-5 py-5">

                          <div className="font-semibold text-[#211e1a]">
                            {user.name}
                          </div>

                        </td>

                        {/* CONTACT */}

                        <td className="px-5 py-5">

                          <div className="text-[#211e1a]">
                            {user.email}
                          </div>

                          <div className="text-xs text-gray-500 mt-1">
                            {user.phone || "-"}
                          </div>

                        </td>

                        {/* ROLE */}

                        <td className="px-5 py-5">

                          <span className="inline-flex items-center rounded-full border border-[#e6dfd6] bg-[#faf8f4] px-3 py-1 text-xs font-medium capitalize">
                            {user.role}
                          </span>

                        </td>

                        {/* FOOD COURT */}

                        <td className="px-5 py-5">

                          {user.role === "shopowner" ? (

                            user.food_court_name ? (

                              <span className="text-sm font-medium text-[#211e1a]">
                                {user.food_court_name}
                              </span>

                            ) : (

                              <div>
                                <span className="text-xs font-medium text-orange-600">
                                  Will be created automatically
                                </span>

                                {user.approval_status === "pending" && (
                                  <p className="text-[11px] text-gray-400 mt-1">
                                    {user.name} Food Court
                                  </p>
                                )}
                              </div>

                            )

                          ) : (

                            <span className="text-gray-400 text-sm">
                              —
                            </span>

                          )}

                        </td>

                        {/* STATUS */}

                        <td className="px-5 py-5">

                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusClass(
                              user.approval_status
                            )}`}
                          >
                            {user.approval_status}
                          </span>

                        </td>

                        {/* ACTION */}

                        <td className="px-5 py-5">

                          {user.approval_status === "pending" ? (

                            <div className="flex items-center gap-2">

                              {/* APPROVE */}

                              <button
                                type="button"
                                onClick={() =>
                                  handleApproval(
                                    user.user_id,
                                    "approve"
                                  )
                                }
                                className="bg-[#211e1a] text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-black transition"
                              >
                                Approve
                              </button>

                              {/* REJECT */}

                              <button
                                type="button"
                                onClick={() =>
                                  handleApproval(
                                    user.user_id,
                                    "reject"
                                  )
                                }
                                className="border border-red-200 bg-white text-red-600 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-red-50 transition"
                              >
                                Reject
                              </button>

                            </div>

                          ) : (

                            <span className="text-gray-400 text-xs">
                              No action
                            </span>

                          )}

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        </section>

        {/* =====================================
            PAYMENT VERIFICATION
        ===================================== */}

        <section className="mb-8">

          <div className="mb-4 flex items-end justify-between">

            <div>

              <p className="text-[11px] uppercase tracking-[0.18em] text-orange-600 font-semibold">
                Payments
              </p>

              <h2 className="text-2xl font-bold mt-1">
                Payment Verification
              </h2>

              <p className="text-gray-500 text-sm mt-1">
                Review student payment slips and approve or reject payments.
              </p>

            </div>

            <button
              type="button"
              onClick={loadPayments}
              disabled={paymentLoading}
              className="border border-[#ded7ce] bg-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#faf8f4] disabled:opacity-50 transition"
            >
              {paymentLoading
                ? "Refreshing..."
                : "Refresh"}
            </button>

          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-[#e6dfd6] overflow-hidden">

            {paymentLoading &&
            payments.length === 0 ? (

              <div className="p-8 text-center text-gray-500 text-sm">
                Loading payment submissions...
              </div>

            ) : payments.length === 0 ? (

              <div className="p-8 text-center text-gray-500 text-sm">
                No payment submissions found.
              </div>

            ) : (

              <div className="overflow-x-auto">

                <table className="w-full text-sm">

                  <thead className="bg-[#faf8f4] border-b border-[#e6dfd6]">

                    <tr>

                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-[0.15em] text-gray-500">
                        Checkout
                      </th>

                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-[0.15em] text-gray-500">
                        Student
                      </th>

                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-[0.15em] text-gray-500">
                        Amount
                      </th>

                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-[0.15em] text-gray-500">
                        Method
                      </th>

                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-[0.15em] text-gray-500">
                        Payment Slip
                      </th>

                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-[0.15em] text-gray-500">
                        Status
                      </th>

                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-[0.15em] text-gray-500">
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {payments.map((payment) => {

                      const slipUrl =
                        getSlipUrl(
                          payment.payment_proof
                        );

                      return (

                        <tr
                          key={payment.payment_id}
                          className="border-b border-[#eee8df] last:border-b-0 hover:bg-[#fcfaf7]"
                        >

                          <td className="px-5 py-5 font-semibold">
                            #{payment.checkout_id}
                          </td>

                          <td className="px-5 py-5">

                            <div className="font-medium">
                              {payment.student_name || "-"}
                            </div>

                            <div className="text-xs text-gray-500 mt-1">
                              {payment.student_email || "-"}
                            </div>

                          </td>

                          <td className="px-5 py-5 font-semibold">
                            ฿
                            {Number(
                              payment.amount ||
                                payment.total_amount ||
                                0
                            ).toFixed(2)}
                          </td>

                          <td className="px-5 py-5">
                            {payment.payment_method || "QR"}
                          </td>

                          <td className="px-5 py-5">

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
                                className="group"
                              >

                                <img
                                  src={slipUrl}
                                  alt="Payment slip"
                                  className="h-16 w-24 rounded-lg border border-gray-200 object-cover transition group-hover:opacity-70"
                                />

                                <span className="mt-1 block text-xs text-blue-600 group-hover:underline">
                                  View Slip
                                </span>

                              </button>

                            ) : (

                              <span className="text-gray-400 text-xs">
                                No slip
                              </span>

                            )}

                          </td>

                          <td className="px-5 py-5">

                            <span
                              className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(
                                payment.payment_status
                              )}`}
                            >
                              {getPaymentStatusLabel(payment)}
                            </span>

                          </td>

                          <td className="px-5 py-5">

                            {payment.payment_status ===
                            "submitted" ? (

                              <div className="flex flex-col gap-2">

                                <button
                                  type="button"
                                  onClick={() =>
                                    setApprovingPayment(payment)
                                  }
                                  disabled={paymentLoading}
                                  className="bg-[#211e1a] text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-black disabled:opacity-50"
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
                                  className="border border-red-200 bg-white text-red-600 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-red-50 disabled:opacity-50"
                                >
                                  Reject
                                </button>

                              </div>

                            ) : payment.payment_status ===
                              "approved" ? (

                              <span className="text-green-600 text-xs font-medium">
                                QR Generated
                              </span>

                            ) : payment.payment_status ===
                              "rejected" ? (

                              <div>

                                <span className="text-red-600 text-xs font-medium">
                                  Rejected
                                </span>

                                {payment.rejection_reason && (
                                  <p className="mt-1 max-w-xs text-xs text-gray-500">
                                    {payment.rejection_reason}
                                  </p>
                                )}

                              </div>

                            ) : (

                              <span className="text-gray-400 text-xs">
                                No action
                              </span>

                            )}

                          </td>

                        </tr>
                      );
                    })}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        </section>

        {/* =====================================
            STUDENT MANAGEMENT
        ===================================== */}

        <section className="mb-8">

          <div className="mb-4">

            <p className="text-[11px] uppercase tracking-[0.18em] text-orange-600 font-semibold">
              Students
            </p>

            <h2 className="text-2xl font-bold mt-1">
              Student Management
            </h2>

            <p className="text-gray-500 text-sm mt-1">
              View student account information.
            </p>

          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-[#e6dfd6] overflow-hidden">

            {students.length === 0 ? (

              <div className="p-6 text-gray-500 text-sm">
                No students found.
              </div>

            ) : (

              <div className="overflow-x-auto">

                <table className="w-full text-sm">

                  <thead className="bg-[#faf8f4] border-b border-[#e6dfd6]">

                    <tr>

                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-[0.15em] text-gray-500">
                        Student ID
                      </th>

                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-[0.15em] text-gray-500">
                        Student Name
                      </th>

                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-[0.15em] text-gray-500">
                        Gmail
                      </th>

                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-[0.15em] text-gray-500">
                        Phone
                      </th>

                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-[0.15em] text-gray-500">
                        Status
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {students.map((student) => (

                      <tr
                        key={student.student_id}
                        className="border-b border-[#eee8df] last:border-b-0 hover:bg-[#fcfaf7]"
                      >

                        <td className="px-5 py-4 font-medium">
                          {student.student_id}
                        </td>

                        <td className="px-5 py-4">
                          {student.name}
                        </td>

                        <td className="px-5 py-4">
                          {student.email}
                        </td>

                        <td className="px-5 py-4">
                          {student.phone || "-"}
                        </td>

                        <td className="px-5 py-4">

                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(
                              student.approval_status
                            )}`}
                          >
                            {student.approval_status}
                          </span>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        </section>

        {/* =====================================
            ORDER MANAGEMENT
        ===================================== */}

        <section>

          <div className="mb-4">

            <p className="text-[11px] uppercase tracking-[0.18em] text-orange-600 font-semibold">
              Orders
            </p>

            <h2 className="text-2xl font-bold mt-1">
              Order Management
            </h2>

            <p className="text-gray-500 text-sm mt-1">
              View all orders placed by students.
            </p>

          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-[#e6dfd6] overflow-hidden">

            {orders.length === 0 ? (

              <div className="p-6 text-gray-500 text-sm">
                No orders found.
              </div>

            ) : (

              <div className="overflow-x-auto">

                <table className="w-full text-sm">

                  <thead className="bg-[#faf8f4] border-b border-[#e6dfd6]">

                    <tr>

                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-[0.15em] text-gray-500">
                        Order ID
                      </th>

                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-[0.15em] text-gray-500">
                        Student Name
                      </th>

                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-[0.15em] text-gray-500">
                        Menu
                      </th>

                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-[0.15em] text-gray-500">
                        Shop Name
                      </th>

                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-[0.15em] text-gray-500">
                        Total
                      </th>

                      <th className="text-left px-5 py-4 text-[11px] uppercase tracking-[0.15em] text-gray-500">
                        Status
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {orders.map((order) => (

                      <tr
                        key={order.order_id}
                        className="border-b border-[#eee8df] last:border-b-0 hover:bg-[#fcfaf7]"
                      >

                        <td className="px-5 py-4 font-semibold">
                          #{order.order_id}
                        </td>

                        <td className="px-5 py-4">
                          {order.student_name}
                        </td>

                        <td className="px-5 py-4 max-w-xs">
                          {order.menu}
                        </td>

                        <td className="px-5 py-4">
                          {order.shop_name}
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          ฿
                          {Number(
                            order.total
                          ).toFixed(2)}
                        </td>

                        <td className="px-5 py-4">

                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusClass(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        </section>

      </div>

      {/* =====================================
          APPROVE PAYMENT MODAL
      ===================================== */}

      {approvingPayment && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5 backdrop-blur-sm"
          onClick={() => {
            if (!paymentLoading) {
              setApprovingPayment(null);
            }
          }}
        >

          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="border-b border-gray-100 px-6 py-5">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100">

                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>

                </div>

                <div>

                  <h3 className="text-lg font-bold text-gray-900">
                    Approve Payment
                  </h3>

                  <p className="text-sm text-gray-500">
                    Confirm payment verification
                  </p>

                </div>

              </div>

            </div>

            <div className="px-6 py-5">

              <p className="text-sm leading-6 text-gray-600">
                Are you sure you want to approve this payment?
              </p>

              <div className="mt-4 rounded-xl bg-gray-50 p-4">

                <div className="flex items-center justify-between">

                  <span className="text-sm text-gray-500">
                    Checkout
                  </span>

                  <span className="font-semibold text-gray-900">
                    #{approvingPayment.checkout_id}
                  </span>

                </div>

                <div className="mt-3 flex items-center justify-between">

                  <span className="text-sm text-gray-500">
                    Student
                  </span>

                  <span className="font-medium text-gray-900">
                    {approvingPayment.student_name || "-"}
                  </span>

                </div>

                <div className="mt-3 flex items-center justify-between">

                  <span className="text-sm text-gray-500">
                    Amount
                  </span>

                  <span className="text-lg font-bold text-gray-900">
                    ฿
                    {Number(
                      approvingPayment.amount ||
                        approvingPayment.total_amount ||
                        0
                    ).toFixed(2)}
                  </span>

                </div>

              </div>

              <div className="mt-4 rounded-lg border border-green-100 bg-green-50 px-4 py-3">

                <p className="text-xs leading-5 text-green-700">
                  Approving this payment will confirm the related orders and generate one QR receipt for this checkout.
                </p>

              </div>

            </div>

            <div className="flex gap-3 border-t border-gray-100 px-6 py-4">

              <button
                type="button"
                onClick={() =>
                  setApprovingPayment(null)
                }
                disabled={paymentLoading}
                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
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
                className="flex-1 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {paymentLoading
                  ? "Approving..."
                  : "Approve Payment"}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* =====================================
          PAYMENT SLIP MODAL
      ===================================== */}

      {selectedSlip && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm"
          onClick={() =>
            setSelectedSlip(null)
          }
        >

          <div
            className="relative max-h-[90vh] max-w-3xl rounded-2xl bg-white p-4 shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <button
              type="button"
              onClick={() =>
                setSelectedSlip(null)
              }
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-xl text-white hover:bg-black"
            >
              ×
            </button>

            <div className="mb-3 pr-10">

              <p className="font-semibold">
                Payment Slip
              </p>

              <p className="text-xs text-gray-500">
                Checkout #{selectedSlip.checkout}

                {selectedSlip.student
                  ? ` • ${selectedSlip.student}`
                  : ""}
              </p>

            </div>

            <div className="max-h-[75vh] overflow-auto rounded-lg bg-gray-100 p-2">

              <img
                src={selectedSlip.url}
                alt="Student payment slip"
                className="mx-auto max-h-[70vh] w-auto rounded-lg object-contain"
              />

            </div>

          </div>

        </div>
      )}

      {/* =====================================
          REJECT PAYMENT MODAL
      ===================================== */}

      {rejectingCheckout && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm"
          onClick={() => {

            if (!paymentLoading) {
              setRejectingCheckout(null);
              setRejectReason("");
            }

          }}
        >

          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="border-b border-gray-100 px-6 py-5">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100">

                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M6 6l12 12" />
                    <path d="M18 6L6 18" />
                  </svg>

                </div>

                <div>

                  <h3 className="text-lg font-bold text-gray-900">
                    Reject Payment
                  </h3>

                  <p className="text-sm text-gray-500">
                    Provide a reason for rejection
                  </p>

                </div>

              </div>

            </div>

            <div className="px-6 py-5">

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Rejection Reason
              </label>

              <textarea
                value={rejectReason}
                onChange={(event) =>
                  setRejectReason(
                    event.target.value
                  )
                }
                placeholder="Example: Payment amount does not match the order total."
                className="h-32 w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />

              <p className="mt-2 text-xs text-gray-400">
                This reason can be shown to the student.
              </p>

            </div>

            <div className="flex gap-3 border-t border-gray-100 px-6 py-4">

              <button
                type="button"
                onClick={() => {
                  setRejectingCheckout(null);
                  setRejectReason("");
                }}
                disabled={paymentLoading}
                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
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
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {paymentLoading
                  ? "Rejecting..."
                  : "Reject Payment"}
              </button>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}