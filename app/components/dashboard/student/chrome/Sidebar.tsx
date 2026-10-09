import { NavLink, useNavigate } from "react-router";

import { studentAsset } from "~/assets/student-app";

import { useStudentProfile } from "../hooks/useStudentProfile";
import { useStudentNavBase } from "../nav/useStudentNavBase";

/**
 * In-canvas hub sidebar — the prototype's `.today-sidebar`, copy-pasted across
 * the 6 hub pages (`today.html:49-119,500-534`; also journal/journey/sparks
 * :29). An 80px rail pinned inside the stage with the `Sparkz` logo, six
 * icon+label destinations, and the settings avatar.
 *
 * Destinations map the prototype's `window.location.href` targets onto the
 * migration's route table (research §F): Today `/student`, Journal
 * `/student/journal`, My toolkit `/student/toolkit`, Journey `/student/journey`,
 * Grades `/student/school`, Sparkz `/student/sparks`. Active state recolours the
 * icon to white (`filter: brightness(0) invert(1)`, `today.html:82`) over a
 * `#1f1f25` pill. Links resolve through {@link useStudentNavBase} so both the
 * `/student` and `/preview/student` mounts work.
 */

interface NavDestination {
  key: string;
  /** Mount-relative path segment; `""` is the index (Today). */
  to: string;
  label: string;
  /** Migrated icon asset (relative to `app/assets/student-app/`). */
  icon: string;
}

const NAV_DESTINATIONS: readonly NavDestination[] = [
  { key: "today", to: "", label: "Today", icon: "icon-02.svg" },
  { key: "journal", to: "journal", label: "Journal", icon: "icon-01.svg" },
  { key: "toolkit", to: "toolkit", label: "My toolkit", icon: "icon-03.svg" },
  { key: "journey", to: "journey", label: "Journey", icon: "icon-04.svg" },
  { key: "school", to: "school", label: "Grades", icon: "icon-05.svg" },
  { key: "sparks", to: "sparks", label: "Sparkz", icon: "icon-06.svg" },
];

export function Sidebar() {
  const base = useStudentNavBase();
  const navigate = useNavigate();
  const profile = useStudentProfile();

  return (
    <nav
      style={{
        position: "absolute",
        left: 24,
        top: "50%",
        transform: "translateY(-50%)",
        width: 80,
        height: 786,
        background: "#2b2b32",
        borderRadius: 20,
        padding: "24px 8px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 10,
      }}
    >
      {/* Logo */}
      <div
        style={{
          fontFamily: "var(--font-student-display)",
          fontWeight: 400,
          fontSize: 16,
          color: "#8e8b85",
          textTransform: "uppercase",
          textAlign: "center",
          letterSpacing: "0.5px",
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
        }}
      >
        Sparkz
      </div>

      {/* Destinations */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {NAV_DESTINATIONS.map((item) => {
          const isIndex = item.to === "";
          const to = isIndex ? base : `${base}/${item.to}`;
          return (
            <NavLink key={item.key} to={to} end={isIndex} style={{ textDecoration: "none" }}>
              {({ isActive }) => (
                <div
                  style={{
                    width: 64,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    padding: "8px 0",
                    cursor: "pointer",
                    borderRadius: 12,
                    background: isActive ? "#1f1f25" : "transparent",
                    transition: "background 140ms",
                  }}
                >
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={studentAsset(item.icon)}
                      alt={item.label}
                      width={24}
                      height={24}
                      style={{
                        width: 24,
                        height: 24,
                        display: "block",
                        filter: isActive ? "brightness(0) invert(1)" : undefined,
                      }}
                    />
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-student-body)",
                      fontSize: 12,
                      fontWeight: 500,
                      color: isActive ? "#f2f3e5" : "#a4a59f",
                      textAlign: "center",
                      lineHeight: "16px",
                      width: 64,
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Profile → settings */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          type="button"
          aria-label="Settings"
          onClick={() => navigate(`${base}/settings`)}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: `${profile.avatarBg} url("${profile.avatarSrc}") no-repeat center / cover`,
            border: "2px solid #36363f",
            overflow: "hidden",
            boxSizing: "border-box",
            padding: 0,
            cursor: "pointer",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-student-body)",
            fontSize: 12,
            fontWeight: 500,
            color: "#a4a59f",
            textAlign: "center",
            width: 64,
          }}
        >
          {profile.displayName}
        </span>
      </div>
    </nav>
  );
}
