"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function StudentAccountPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadAccount() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/student/account",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        router.push("/login");
        return;
      }

      setUser(data.user);
      setName(data.user.name || "");
      setEmail(data.user.email || "");
      setPhone(data.user.phone || "");
    } catch (error) {
      console.error(
        "LOAD STUDENT ACCOUNT ERROR:",
        error
      );

      setError(
        "Unable to load your account."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccount();
  }, []);

  async function handleSave() {
    try {
      setSaving(true);
      setMessage("");
      setError("");

      const response = await fetch(
        "/api/student/account",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name,
            phone,
            currentPassword,
            newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(
          data.message ||
            "Failed to update account"
        );
        return;
      }

      setMessage(
        "Account updated successfully."
      );

      setCurrentPassword("");
      setNewPassword("");

      await loadAccount();
    } catch (error) {
      console.error(
        "UPDATE STUDENT ACCOUNT ERROR:",
        error
      );

      setError(
        "Unable to update your account."
      );
    } finally {
      setSaving(false);
    }
  }

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

    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#faf7f2] flex items-center justify-center">
        <div className="text-center">

          <div className="w-8 h-8 border-2 border-[#d94825] border-t-transparent rounded-full animate-spin mx-auto mb-3" />

          <p className="text-sm text-[#77716a]">
            Loading your account...
          </p>

        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#faf7f2] text-[#211e1a]">

      {/* HEADER */}
      <header className="border-b border-[#e5ded5] bg-[#faf7f2]">

        <div className="max-w-[1200px] mx-auto px-5 h-[68px] flex items-center justify-between">

          <button
            onClick={() => router.push("/")}
            className="text-[27px] font-serif font-bold tracking-tight"
          >
            UniPlate
          </button>

          <button
            onClick={() => router.push("/")}
            className="text-sm font-semibold text-[#d94825] hover:underline"
          >
            ← Back to Food Shops
          </button>

        </div>

      </header>

      {/* CONTENT */}
      <div className="max-w-[900px] mx-auto px-5 py-10">

        {/* TITLE */}
        <div className="mb-7">

          <div className="flex items-center gap-4">

            {/* AVATAR */}
            <div className="w-14 h-14 rounded-full bg-[#211e1a] text-white flex items-center justify-center text-xl font-semibold">
              {name
                ? name.charAt(0).toUpperCase()
                : "S"}
            </div>

            <div>

              <h1 className="text-[32px] font-serif font-bold">
                My Account
              </h1>

              <p className="text-sm text-[#77716a] mt-1">
                Manage your UniPlate student account.
              </p>

            </div>

          </div>

        </div>

        {/* SUCCESS */}
        {message && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* PROFILE */}
        <section className="bg-white border border-[#e4ddd4] rounded-2xl p-6 mb-5">

          <div className="mb-5">

            <h2 className="text-lg font-semibold">
              Personal Information
            </h2>

            <p className="text-xs text-[#888078] mt-1">
              Update your personal information.
            </p>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* NAME */}
            <div>

              <label className="block text-xs font-semibold mb-2">
                Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                className="w-full h-11 rounded-lg border border-[#ddd6ce] bg-white px-3 text-sm outline-none focus:border-[#211e1a]"
                placeholder="Your name"
              />

            </div>

            {/* EMAIL */}
            <div>

              <label className="block text-xs font-semibold mb-2">
                Email
              </label>

              <input
                type="email"
                value={email}
                disabled
                className="w-full h-11 rounded-lg border border-[#e2ddd7] bg-[#f5f2ee] px-3 text-sm text-[#817a72]"
              />

              <p className="text-[10px] text-[#99918a] mt-1">
                Email cannot be changed.
              </p>

            </div>

            {/* PHONE */}
            <div>

              <label className="block text-xs font-semibold mb-2">
                Phone Number
              </label>

              <input
                type="text"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value)
                }
                className="w-full h-11 rounded-lg border border-[#ddd6ce] bg-white px-3 text-sm outline-none focus:border-[#211e1a]"
                placeholder="Your phone number"
              />

            </div>

            {/* ROLE */}
            <div>

              <label className="block text-xs font-semibold mb-2">
                Account Type
              </label>

              <div className="w-full h-11 rounded-lg border border-[#e2ddd7] bg-[#f5f2ee] px-3 flex items-center">

                <span className="text-sm">
                  Student
                </span>

              </div>

            </div>

          </div>

        </section>

        {/* PASSWORD */}
        <section className="bg-white border border-[#e4ddd4] rounded-2xl p-6 mb-5">

          <div className="mb-5">

            <h2 className="text-lg font-semibold">
              Change Password
            </h2>

            <p className="text-xs text-[#888078] mt-1">
              Leave these fields empty if you do not want to change your password.
            </p>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* CURRENT PASSWORD */}
            <div>

              <label className="block text-xs font-semibold mb-2">
                Current Password
              </label>

              <div className="relative">

                <input
                  type={
                    showCurrentPassword
                      ? "text"
                      : "password"
                  }
                  value={currentPassword}
                  onChange={(e) =>
                    setCurrentPassword(
                      e.target.value
                    )
                  }
                  className="w-full h-11 rounded-lg border border-[#ddd6ce] bg-white px-3 pr-11 text-sm outline-none focus:border-[#211e1a]"
                  placeholder="Current password"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowCurrentPassword(
                      !showCurrentPassword
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#77716a]"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    {showCurrentPassword ? (
                      <>
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                        />
                      </>
                    ) : (
                      <>
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.9 5.1A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a17.3 17.3 0 0 1-3.1 3.9" />
                        <path d="M6.1 6.1C3.5 8 2 12 2 12s3.5 7 10 7c1.7 0 3.2-.4 4.5-1" />
                      </>
                    )}
                  </svg>
                </button>

              </div>

            </div>

            {/* NEW PASSWORD */}
            <div>

              <label className="block text-xs font-semibold mb-2">
                New Password
              </label>

              <div className="relative">

                <input
                  type={
                    showNewPassword
                      ? "text"
                      : "password"
                  }
                  value={newPassword}
                  onChange={(e) =>
                    setNewPassword(
                      e.target.value
                    )
                  }
                  className="w-full h-11 rounded-lg border border-[#ddd6ce] bg-white px-3 pr-11 text-sm outline-none focus:border-[#211e1a]"
                  placeholder="New password"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowNewPassword(
                      !showNewPassword
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#77716a]"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    {showNewPassword ? (
                      <>
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                        />
                      </>
                    ) : (
                      <>
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.9 5.1A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a17.3 17.3 0 0 1-3.1 3.9" />
                        <path d="M6.1 6.1C3.5 8 2 12 2 12s3.5 7 10 7c1.7 0 3.2-.4 4.5-1" />
                      </>
                    )}
                  </svg>
                </button>

              </div>

            </div>

          </div>

        </section>

        {/* ACTIONS */}
        <div className="flex flex-col sm:flex-row gap-3">

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[#211e1a] text-white text-sm font-semibold hover:bg-[#d94825] transition disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : "Save Changes"}
          </button>

          <button
            onClick={handleLogout}
            className="px-7 py-3 rounded-xl border border-[#ddd6ce] bg-white text-sm font-semibold text-[#d94825] hover:bg-[#fff4f0]"
          >
            Logout
          </button>

        </div>

      </div>

    </main>
  );
}