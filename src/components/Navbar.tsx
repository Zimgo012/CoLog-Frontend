import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import ProfileModal from "./ProfileModal";

interface NavbarProps {
  /** Content rendered in the left / flex-1 slot. Defaults to CoLog wordmark. */
  left?:    ReactNode;
  /** Extra buttons injected before the avatar dropdown. */
  actions?: ReactNode;
}

export default function Navbar({ left, actions }: NavbarProps) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const [profileOpen, setProfileOpen] = useState(false);

  const signout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  // Build initials from stored profile, fall back to "U"
  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "U"
    : "U";

  return (
    <>
      <div className="navbar bg-base-100 shadow-sm px-4 shrink-0">
        {/* Left slot */}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          {left ?? (
            <Link to="/" className="btn btn-ghost text-xl font-bold text-primary">
              CoLog
            </Link>
          )}
        </div>

        {/* Right slot */}
        <div className="flex items-center gap-2">
          {actions}

          <div className="dropdown dropdown-end">
            <div
              tabIndex={0}
              role="button"
              className="btn btn-ghost btn-circle avatar placeholder"
            >
              <div className="bg-primary text-primary-content rounded-full w-9 flex items-center justify-center font-bold text-sm">
                {initials}
              </div>
            </div>

            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-48"
            >
              <li>
                <button type="button" onClick={() => setProfileOpen(true)}>
                  Profile
                </button>
              </li>
              <li>
                <button type="button">Settings</button>
              </li>
              <li>
                <button type="button" onClick={signout} className="text-error">
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
