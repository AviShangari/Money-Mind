import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    ArrowLeftRight,
    PiggyBank,
    CreditCard,
    TrendingUp,
    MessageSquare,
    Sun,
    Moon,
    LogOut,
    Menu,
    X,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";

const NAV_ITEMS = [
    { label: "Dashboard",    icon: LayoutDashboard, to: "/dashboard",             end: true },
    { label: "Transactions", icon: ArrowLeftRight,  to: "/dashboard/transactions"            },
    { label: "Budgets",      icon: PiggyBank,       to: "/dashboard/budgets"                 },
    { label: "Debt",         icon: CreditCard,      to: "/dashboard/debt"                    },
    { label: "Insights",     icon: TrendingUp,      to: "/dashboard/insights"                },
    { label: "Chat",         icon: MessageSquare,   to: "/dashboard/chat"                    },
];

function Avatar({ email }) {
    const initial = email?.[0]?.toUpperCase() ?? "?";
    return (
        <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            {initial}
        </div>
    );
}

function SidebarNav({ onClose }) {
    const { theme, toggleTheme } = useTheme();
    const { user, logout } = useAuth();

    return (
        <>
            {/* Logo */}
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-2.5">
                    <span className="text-xl">💸</span>
                    <span className="font-bold text-lg text-text-primary">Money Mind</span>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        aria-label="Close menu"
                        className="p-1 text-text-secondary hover:text-text-primary transition-colors"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Nav links */}
            <nav className="flex-1 flex flex-col gap-0.5">
                {NAV_ITEMS.map(({ label, icon: Icon, to, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={end}
                        onClick={() => onClose?.()}
                        className={({ isActive }) =>
                            cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-all duration-150",
                                isActive
                                    ? "bg-brand text-white"
                                    : "text-text-secondary hover:bg-bg-accent hover:text-text-primary"
                            )
                        }
                    >
                        <Icon size={17} strokeWidth={1.8} />
                        {label}
                    </NavLink>
                ))}
            </nav>

            {/* User section */}
            <div className="border-t border-border pt-5 space-y-4">
                {/* Avatar + email + plan badge */}
                <div className="flex items-center gap-3 min-w-0">
                    <Avatar email={user?.email} />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm text-text-primary font-medium truncate">{user?.email}</p>
                        <span className="inline-block mt-0.5 text-[11px] bg-brand-subtle text-brand font-semibold px-1.5 py-0.5 rounded leading-none">
                            Free
                        </span>
                    </div>
                </div>

                {/* Theme toggle + sign out */}
                <div className="flex gap-2">
                    <button
                        onClick={toggleTheme}
                        aria-label="Toggle theme"
                        className="flex-1 flex items-center justify-center gap-1.5 border border-border text-text-secondary text-xs font-medium py-2 rounded-sm hover:bg-bg-accent hover:text-text-primary transition-colors"
                    >
                        {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
                        {theme === "dark" ? "Light" : "Dark"}
                    </button>
                    <button
                        onClick={logout}
                        aria-label="Sign out"
                        className="flex items-center justify-center px-3 py-2 border border-border text-text-secondary rounded-sm hover:bg-danger/10 hover:text-danger hover:border-danger/20 transition-colors"
                    >
                        <LogOut size={14} />
                    </button>
                </div>
            </div>
        </>
    );
}

export default function AppShell() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();

    const currentPage =
        NAV_ITEMS.find((item) =>
            item.end
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to)
        )?.label ?? "";

    return (
        <div className="flex min-h-screen bg-bg-primary text-text-primary">
            {/* ── Desktop sidebar ── */}
            <aside className="hidden lg:flex flex-col w-[260px] bg-bg-secondary border-r border-border p-6 fixed h-screen">
                <SidebarNav />
            </aside>

            {/* ── Mobile backdrop ── */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* ── Mobile sidebar (Sheet-style slide-in) ── */}
            <aside
                className={cn(
                    "fixed top-0 left-0 z-50 h-full w-[260px] flex flex-col bg-bg-secondary border-r border-border p-6 transition-transform duration-300 ease-in-out lg:hidden",
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <SidebarNav onClose={() => setMobileOpen(false)} />
            </aside>

            {/* ── Main content ── */}
            <main className="lg:ml-[260px] flex-1 flex flex-col min-w-0">
                <header className="sticky top-0 z-10 h-[60px] bg-bg-secondary border-b border-border flex items-center gap-3 px-5">
                    <button
                        onClick={() => setMobileOpen(true)}
                        aria-label="Open navigation"
                        className="lg:hidden p-1.5 text-text-secondary hover:text-text-primary transition-colors"
                    >
                        <Menu size={20} />
                    </button>
                    <span className="text-sm font-medium text-text-secondary">{currentPage}</span>
                </header>

                <div className="flex-1 p-6 lg:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
