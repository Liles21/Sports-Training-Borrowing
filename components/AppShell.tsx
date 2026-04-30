"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/client/api";
import type { Notification, UserRole } from "@/lib/types";
import {
  HiOutlineSparkles,
  HiOutlineSquares2X2,
  HiOutlineCubeTransparent,
  HiOutlineCog6Tooth,
  HiOutlineClock,
  HiOutlineBell,
  HiOutlineArrowRightStartOnRectangle,
  HiOutlineUser,
  HiOutlineXMark,
  HiOutlineUserCircle,
  HiOutlineEnvelope,
  HiOutlineLockClosed,
  HiOutlineIdentification,
  HiOutlineBookmarkSquare,
  HiOutlineTrash,
} from "react-icons/hi2";

type NavLink = {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};

const adminLinks: NavLink[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: HiOutlineSquares2X2 },
  { href: "/admin/equipment", label: "Equipment", icon: HiOutlineCubeTransparent },
  { href: "/admin/borrow", label: "Borrow Requests", icon: HiOutlineCog6Tooth },
  { href: "/admin/history", label: "History", icon: HiOutlineClock },
];

const borrowerLinks: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: HiOutlineSquares2X2 },
  { href: "/equipment", label: "Equipment", icon: HiOutlineCubeTransparent },
  { href: "/borrow", label: "My Requests", icon: HiOutlineCog6Tooth },
  { href: "/history", label: "History", icon: HiOutlineClock },
];

export function AppShell({
  title,
  role,
  children,
}: {
  title: string;
  role: UserRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, updateProfile, changePassword } = useAuth();

  const [showProfile, setShowProfile] = useState(false);
  const [profileTab, setProfileTab] = useState<"profile" | "password">("profile");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const navLinks = role === "admin" ? adminLinks : borrowerLinks;
  const unread = notifications.filter((entry) => !entry.read).length;

  const initials = (() => {
    if (!user?.name) {
      return "U";
    }

    return user.name
      .split(" ")
      .map((token) => token[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  })();

  useEffect(() => {
    apiFetch<{ notifications: Notification[] }>("/api/notifications")
      .then((data) => setNotifications(data.notifications))
      .catch(() => setNotifications([]));
  }, [pathname]);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  async function saveProfile() {
    setError(null);
    setBanner(null);

    try {
      await updateProfile({ name, email });
      setBanner("Profile updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update profile.");
    }
  }

  async function savePassword() {
    setError(null);
    setBanner(null);

    try {
      await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setBanner("Password updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to change password.");
    }
  }

  async function markAllRead() {
    await apiFetch<{ message: string }>("/api/notifications/read-all", {
      method: "PATCH",
      body: "{}",
    });
    setNotifications((prev) => prev.map((entry) => ({ ...entry, read: true })));
  }

  async function openNotification(entry: Notification) {
    if (!entry.read) {
      try {
        await apiFetch<{ message: string }>(`/api/notifications/${entry.id}`, {
          method: "PATCH",
          body: "{}",
        });
      } catch {
        // Ignore read-state failures and continue navigation.
      }

      setNotifications((prev) =>
        prev.map((current) =>
          current.id === entry.id ? { ...current, read: true } : current,
        ),
      );
    }

    setShowNotifications(false);
    router.push(role === "admin" ? "/admin/borrow" : "/borrow");
  }

  async function deleteNotification(event: React.MouseEvent, id: string) {
    event.stopPropagation();
    try {
      await apiFetch(`/api/notifications/${id}`, { method: "DELETE" });
      setNotifications((prev) => prev.filter((entry) => entry.id !== id));
    } catch {
      // Ignore failures
    }
  }

  return (
    <div className="app-layout">
      <header className="topbar">
        <Link href={role === "admin" ? "/admin/dashboard" : "/dashboard"} className="topbar-brand">
          <span className="brand-mark">
            <HiOutlineSparkles />
          </span>
          <span className="brand-copy">
            <span className="brand-title">Gym Equipment</span>
            <span className="brand-subtitle">Borrowing System</span>
          </span>
        </Link>

        <div className="topbar-actions">
          <button
            type="button"
            className="icon-button"
            onClick={() => {
              setShowNotifications((prev) => !prev);
              setShowMenu(false);
            }}
          >
            <HiOutlineBell />
            Notifications
            {unread > 0 && <span className="badge-count">{unread}</span>}
          </button>

          <button
            type="button"
            className="profile-button"
            onClick={() => {
              setShowMenu((prev) => !prev);
              setShowNotifications(false);
            }}
          >
            <span className="avatar">{initials}</span>
            <span className="profile-copy">
              <span className="profile-name">{user?.name ?? "User"}</span>
              <span className="profile-role">{role === "admin" ? "Admin" : "Borrower"}</span>
            </span>
          </button>

          {showNotifications && (
            <div className="dropdown-panel notifications-panel">
              <div className="panel-head">
                <strong>Notifications</strong>
                <button type="button" className="text-button" onClick={markAllRead}>
                  Mark all read
                </button>
              </div>
              {notifications.length === 0 ? (
                <p className="muted">No notifications yet.</p>
              ) : (
                notifications.map((entry) => (
                  <div
                    key={entry.id}
                    className={entry.read ? "notification-row" : "notification-row unread"}
                    role="button"
                    tabIndex={0}
                    onClick={() => openNotification(entry)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void openNotification(entry);
                      }
                    }}
                  >
                    <p>{entry.message}</p>
                    <div className="notification-meta">
                      <small>{new Date(entry.createdAt).toLocaleString()}</small>
                      <button
                        type="button"
                        className="delete-notification"
                        onClick={(event) => deleteNotification(event, entry.id)}
                        aria-label="Delete notification"
                      >
                        <HiOutlineTrash />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {showMenu && (
            <div className="dropdown-panel profile-panel">
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setName(user?.name ?? "");
                  setEmail(user?.email ?? "");
                  setShowProfile(true);
                  setShowMenu(false);
                  setProfileTab("profile");
                }}
              >
                <HiOutlineUser />
                My Profile
              </button>
              <button type="button" className="dropdown-item logout" onClick={handleLogout}>
                <HiOutlineArrowRightStartOnRectangle />
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="app-body">
        <aside className="app-sidebar">
          <nav className="sidebar-links">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={pathname === link.href ? "nav-link active" : "nav-link"}
              >
                {link.icon && (
                  <span className="nav-link-icon">
                    <link.icon />
                  </span>
                )}
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="content-scroll">
          <div className="content-panel">{children}</div>
        </main>
      </div>

      {showProfile && (
        <div className="modal-overlay" onClick={() => setShowProfile(false)}>
          <section className="modal-card profile-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head profile-modal-head">
              <h3>My Profile</h3>
              <button
                type="button"
                className="profile-close"
                onClick={() => setShowProfile(false)}
                aria-label="Close profile modal"
              >
                <HiOutlineXMark />
              </button>
            </div>

            <div className="tab-row profile-tab-row">
              <button
                type="button"
                className={profileTab === "profile" ? "tab-button profile-tab-button active" : "tab-button profile-tab-button"}
                onClick={() => setProfileTab("profile")}
              >
                <HiOutlineUser />
                Profile Information
              </button>
              <button
                type="button"
                className={profileTab === "password" ? "tab-button profile-tab-button active" : "tab-button profile-tab-button"}
                onClick={() => setProfileTab("password")}
              >
                <HiOutlineLockClosed />
                Change Password
              </button>
            </div>

            {banner && <p className="alert success">{banner}</p>}
            {error && <p className="alert error">{error}</p>}

            {profileTab === "profile" ? (
              <div className="form-grid profile-form-grid">
                <div className="profile-role-card">
                  <span className="profile-role-icon">
                    <HiOutlineUserCircle />
                  </span>
                  <div>
                    <p className="muted">Account Role</p>
                    <strong>{user?.role === "admin" ? "Admin" : "Borrower"}</strong>
                  </div>
                </div>
                <label>
                  Full Name
                  <div className="profile-input-wrap">
                    <HiOutlineIdentification />
                    <input value={name} onChange={(event) => setName(event.target.value)} />
                  </div>
                </label>
                <label>
                  Email
                  <div className="profile-input-wrap">
                    <HiOutlineEnvelope />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                </label>
                <div className="profile-action-row">
                  <button type="button" className="btn ghost" onClick={() => setShowProfile(false)}>
                    Cancel
                  </button>
                  <button type="button" className="btn primary" onClick={saveProfile}>
                    <HiOutlineBookmarkSquare />
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="form-grid profile-form-grid">
                <label>
                  Current Password
                  <div className="profile-input-wrap">
                    <HiOutlineLockClosed />
                    <input
                      type="password"
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                    />
                  </div>
                </label>
                <label>
                  New Password
                  <div className="profile-input-wrap">
                    <HiOutlineLockClosed />
                    <input
                      type="password"
                      placeholder="Enter new password (min 6 characters)"
                      minLength={6}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                    />
                  </div>
                </label>
                <label>
                  Confirm Password
                  <div className="profile-input-wrap">
                    <HiOutlineLockClosed />
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      minLength={6}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                  </div>
                </label>
                <div className="profile-action-row">
                  <button type="button" className="btn ghost" onClick={() => setShowProfile(false)}>
                    Cancel
                  </button>
                  <button type="button" className="btn primary" onClick={savePassword}>
                    <HiOutlineLockClosed />
                    Change Password
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
