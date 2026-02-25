import { Link } from "react-router-dom";
import {
    Brain,
    ArrowRight,
    FileText,
    MessageSquare,
    TrendingDown,
    AlertTriangle,
    BarChart3,
    Upload,
    CheckCircle2,
    Sparkles,
    Shield,
    Lock,
    Eye,
    Link2Off,
    Menu,
    X,
} from "lucide-react";
import { useState } from "react";
import {
    PieChart, Pie, Cell,
    LineChart, Line,
    BarChart, Bar,
    ResponsiveContainer, XAxis, YAxis,
} from "recharts";

// ── Data ──────────────────────────────────────────────────────────────────────

const spendingData = [
    { name: "Jan", value: 2400 },
    { name: "Feb", value: 2800 },
    { name: "Mar", value: 2600 },
    { name: "Apr", value: 3200 },
    { name: "May", value: 2900 },
    { name: "Jun", value: 3400 },
];

const categoryData = [
    { name: "Food & Dining",  value: 1200, color: "#6366F1" },
    { name: "Shopping",       value: 850,  color: "#8B5CF6" },
    { name: "Transport",      value: 450,  color: "#A78BFA" },
    { name: "Entertainment",  value: 320,  color: "#C4B5FD" },
    { name: "Bills",          value: 680,  color: "#DDD6FE" },
];

const weekdayData = [
    { day: "Mon", value: 15 },
    { day: "Tue", value: 18 },
    { day: "Wed", value: 12 },
    { day: "Thu", value: 20 },
    { day: "Fri", value: 45 },
    { day: "Sat", value: 52 },
    { day: "Sun", value: 38 },
];

const features = [
    {
        icon: FileText,
        title: "Smart PDF Parsing",
        description: "Upload bank or credit card statements, we handle the rest. Supports TD, RBC, and more.",
    },
    {
        icon: Brain,
        title: "Behavioral Intelligence",
        description: "Discover your spending personality. Are you a Weekend Spender? Convenience Spender? Disciplined Saver?",
    },
    {
        icon: MessageSquare,
        title: "AI Financial Chatbot",
        description: 'Ask questions like "How long to save $2000?" and get answers based on your real data.',
    },
    {
        icon: TrendingDown,
        title: "Debt Payoff Optimizer",
        description: "Avalanche or Snowball? See exactly when you'll be debt-free with interactive projections.",
    },
    {
        icon: AlertTriangle,
        title: "Anomaly Detection",
        description: "ML flags unusual transactions and spending spikes before they become problems.",
    },
    {
        icon: BarChart3,
        title: "Spending Forecasts",
        description: "Predict next month's spending based on your actual patterns, not guesswork.",
    },
];

const steps = [
    {
        number: "01",
        icon: Upload,
        title: "Upload Your Statement",
        description: "Upload any bank or credit card PDF. We parse it instantly — no bank credentials needed.",
        visual: "upload",
    },
    {
        number: "02",
        icon: CheckCircle2,
        title: "Review & Confirm",
        description: "Check your transactions, fix any categories, and link debt payments in one clean flow.",
        visual: "review",
    },
    {
        number: "03",
        icon: Sparkles,
        title: "Get Intelligent Insights",
        description: "See your spending personality, forecasts, anomalies, and chat with your financial AI.",
        visual: "insights",
    },
];

const privacyPoints = [
    {
        icon: Lock,
        title: "No Bank Account Linking",
        description: "We never ask for your banking credentials. Upload PDFs on your terms.",
    },
    {
        icon: Eye,
        title: "No Third-Party Sharing",
        description: "Your data stays with you. We never sell or share your financial information.",
    },
    {
        icon: Shield,
        title: "Secure Parsing",
        description: "Your statements are parsed securely and encrypted. We only extract what you need.",
    },
    {
        icon: CheckCircle2,
        title: "Complete Control",
        description: "Delete your data anytime. Export everything. You own your financial story.",
    },
];

const badges = [
    { icon: Shield,   label: "Privacy-First" },
    { icon: Link2Off, label: "No Bank Linking Required" },
    { icon: Brain,    label: "ML-Powered Insights" },
    { icon: Sparkles, label: "Free to Start" },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function AppMockup() {
    return (
        <div className="relative">
            <div className="relative bg-gradient-to-br from-[#1A1F35] to-[#0C0F1A] rounded-2xl border border-white/10 shadow-2xl p-5 backdrop-blur-xl">
                {/* Traffic lights */}
                <div className="flex items-center gap-1.5 mb-5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-3 gap-2.5 mb-5">
                    {[
                        { label: "Total Spent",    value: "$3,480", sub: "−12% vs last month", pos: true },
                        { label: "Cash Flow",      value: "+$1,760", sub: "+51% vs last month",  pos: true },
                        { label: "Debts Tracked",  value: "3",       sub: "Total: $12,450",      pos: false },
                    ].map(({ label, value, sub, pos }) => (
                        <div key={label} className="bg-white/5 rounded-xl p-3 border border-white/5">
                            <div className="text-[#8B92A8] text-[10px] mb-1">{label}</div>
                            <div className="text-[#F0F2F8] text-base font-bold leading-tight">{value}</div>
                            <div className={`text-[10px] mt-0.5 ${pos ? "text-emerald-400" : "text-[#8B92A8]"}`}>{sub}</div>
                        </div>
                    ))}
                </div>

                {/* Trend chart */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/5 mb-3">
                    <div className="text-[#F0F2F8] font-semibold mb-2 text-xs">Spending Trend</div>
                    <ResponsiveContainer width="100%" height={100}>
                        <LineChart data={spendingData}>
                            <XAxis dataKey="name" stroke="#8B92A8" fontSize={9} tickLine={false} axisLine={false} />
                            <YAxis stroke="#8B92A8" fontSize={9} tickLine={false} axisLine={false} />
                            <Line type="monotone" dataKey="value" stroke="#6366F1" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Category donut */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <div className="text-[#F0F2F8] font-semibold mb-2 text-xs">Category Breakdown</div>
                    <div className="flex items-center gap-3">
                        <div className="w-24 h-24 flex-shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={22} outerRadius={44} paddingAngle={2} dataKey="value">
                                        {categoryData.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex-1 space-y-1.5">
                            {categoryData.map((cat) => (
                                <div key={cat.name} className="flex items-center justify-between text-[10px]">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                                        <span className="text-[#8B92A8]">{cat.name}</span>
                                    </div>
                                    <span className="text-[#F0F2F8] font-medium">${cat.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {/* Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur-2xl -z-10 opacity-50" />
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Landing() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const scrollTo = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
        setMobileMenuOpen(false);
    };

    return (
        <div className="min-h-screen bg-[#0C0F1A] text-[#F0F2F8]">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0C0F1A]/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
                                <Brain className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-lg font-bold">Money Mind</span>
                        </div>

                        {/* Desktop nav */}
                        <nav className="hidden md:flex items-center gap-8">
                            {[
                                { label: "Features",    id: "features" },
                                { label: "How It Works",id: "how-it-works" },
                                { label: "Privacy",     id: "privacy" },
                            ].map(({ label, id }) => (
                                <button
                                    key={id}
                                    onClick={() => scrollTo(id)}
                                    className="text-[#8B92A8] hover:text-[#F0F2F8] transition-colors text-sm"
                                >
                                    {label}
                                </button>
                            ))}
                        </nav>

                        {/* Desktop CTA */}
                        <div className="hidden md:flex items-center gap-4">
                            <Link
                                to="/login"
                                className="text-[#8B92A8] hover:text-[#F0F2F8] transition-colors text-sm font-medium"
                            >
                                Login
                            </Link>
                            <Link
                                to="/login"
                                className="px-5 py-2 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white text-sm font-semibold rounded-lg hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
                            >
                                Get Started Free
                            </Link>
                        </div>

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMobileMenuOpen((v) => !v)}
                            className="md:hidden p-1.5 text-[#8B92A8] hover:text-[#F0F2F8] transition-colors"
                            aria-label="Toggle menu"
                        >
                            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>

                    {/* Mobile dropdown */}
                    {mobileMenuOpen && (
                        <div className="md:hidden pt-4 pb-2 border-t border-white/5 mt-4 space-y-3">
                            {[
                                { label: "Features",    id: "features" },
                                { label: "How It Works",id: "how-it-works" },
                                { label: "Privacy",     id: "privacy" },
                            ].map(({ label, id }) => (
                                <button
                                    key={id}
                                    onClick={() => scrollTo(id)}
                                    className="block w-full text-left text-[#8B92A8] hover:text-[#F0F2F8] transition-colors text-sm py-1"
                                >
                                    {label}
                                </button>
                            ))}
                            <div className="flex gap-3 pt-2">
                                <Link
                                    to="/login"
                                    className="flex-1 text-center border border-white/10 text-[#8B92A8] text-sm py-2 rounded-lg hover:text-[#F0F2F8] transition-colors"
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/login"
                                    className="flex-1 text-center bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white text-sm font-semibold py-2 rounded-lg"
                                >
                                    Get Started
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* ── Hero ────────────────────────────────────────────────────── */}
            <section className="relative overflow-hidden border-b border-white/5">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
                </div>

                <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 lg:pt-32 lg:pb-32">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                        {/* Left */}
                        <div className="space-y-8">
                            <div className="space-y-5">
                                <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-tight">
                                    Your Money.<br />
                                    Your Patterns.<br />
                                    <span className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] bg-clip-text text-transparent">
                                        Your Power.
                                    </span>
                                </h1>
                                <p className="text-lg lg:text-xl text-[#8B92A8] leading-relaxed max-w-xl">
                                    Money Mind transforms your bank and credit card statements into personalized spending intelligence.
                                    No bank linking required — just upload a PDF.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                <Link
                                    to="/login"
                                    className="group px-8 py-4 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-300 flex items-center gap-2"
                                >
                                    Get Started Free
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                                <button
                                    onClick={() => scrollTo("how-it-works")}
                                    className="text-[#8B92A8] hover:text-[#F0F2F8] font-medium transition-colors flex items-center gap-2"
                                >
                                    See How It Works
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Right — App Mockup */}
                        <div className="relative">
                            <AppMockup />
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Social proof badges ──────────────────────────────────────── */}
            <section className="border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 py-10">
                    <div className="flex flex-wrap justify-center gap-8 lg:gap-12">
                        {badges.map(({ icon: Icon, label }) => (
                            <div key={label} className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                                    <Icon className="w-4 h-4 text-[#6366F1]" />
                                </div>
                                <span className="text-[#8B92A8] font-medium text-sm">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Features ─────────────────────────────────────────────────── */}
            <section id="features" className="py-24 lg:py-32">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl lg:text-5xl font-bold mb-4">More Than a Budget App</h2>
                        <p className="text-[#8B92A8] text-lg max-w-2xl mx-auto">
                            Every feature is built around your actual spending behaviour, not generic advice.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map(({ icon: Icon, title, description }, i) => (
                            <div
                                key={i}
                                className="group relative bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/5 hover:border-[#6366F1]/50 transition-all duration-300 hover:bg-white/[0.08]"
                            >
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6366F1]/20 to-[#8B5CF6]/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Icon className="w-6 h-6 text-[#6366F1]" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">{title}</h3>
                                <p className="text-[#8B92A8] leading-relaxed text-sm">{description}</p>
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#6366F1]/0 to-[#8B5CF6]/0 group-hover:from-[#6366F1]/5 group-hover:to-[#8B5CF6]/5 transition-all duration-300 pointer-events-none" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Behavioral Showcase ──────────────────────────────────────── */}
            <section className="py-24 lg:py-32 border-t border-white/5">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl lg:text-5xl font-bold mb-4">
                            Insights No Other App Gives You
                        </h2>
                        <p className="text-xl text-[#8B92A8]">
                            Most apps show you charts. Money Mind tells you{" "}
                            <span className="text-[#6366F1] font-semibold">why</span> you spend the way you do.
                        </p>
                    </div>

                    <div className="relative bg-gradient-to-br from-[#1A1F35] to-[#0C0F1A] rounded-3xl p-8 lg:p-12 border border-white/10 shadow-2xl">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 bg-[#6366F1]/20 border border-[#6366F1]/30 rounded-full px-4 py-2 mb-6">
                            <div className="w-2 h-2 rounded-full bg-[#6366F1] animate-pulse" />
                            <span className="text-[#6366F1] font-semibold text-sm">Behavioral Insight</span>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-8 items-center">
                            {/* Left */}
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-2xl lg:text-3xl font-bold mb-4">You're a Weekend Spender</h3>
                                    <p className="text-lg text-[#8B92A8] leading-relaxed">
                                        <span className="text-[#6366F1] font-bold text-2xl">62%</span> of your discretionary
                                        spending happens Friday through Sunday. Consider setting a weekend budget cap.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[#8B92A8]">Confidence</span>
                                        <span className="font-semibold">87%</span>
                                    </div>
                                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full w-[87%] bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] rounded-full" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                        <div className="text-[#8B92A8] text-sm mb-1">Weekend Avg</div>
                                        <div className="text-2xl font-bold">$245</div>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                        <div className="text-[#8B92A8] text-sm mb-1">Weekday Avg</div>
                                        <div className="text-2xl font-bold">$68</div>
                                    </div>
                                </div>
                            </div>

                            {/* Right — bar chart */}
                            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                                <div className="font-semibold mb-4 text-sm">Spending by Day of Week</div>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={weekdayData}>
                                        <XAxis dataKey="day" stroke="#8B92A8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#8B92A8" fontSize={12} tickLine={false} axisLine={false} />
                                        <Bar dataKey="value" fill="#6366F1" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── How It Works ─────────────────────────────────────────────── */}
            <section id="how-it-works" className="py-24 lg:py-32 border-y border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl lg:text-5xl font-bold mb-4">Three Steps to Financial Clarity</h2>
                        <p className="text-[#8B92A8] text-lg max-w-xl mx-auto">
                            From raw PDF to personalised insights in minutes.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {steps.map(({ number, icon: Icon, title, description, visual }, i) => (
                            <div key={i} className="relative">
                                {i < steps.length - 1 && (
                                    <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-[#6366F1]/50 to-transparent" />
                                )}
                                <div className="relative text-center space-y-4">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white font-bold text-xl mb-2">
                                        {number}
                                    </div>

                                    <div className="flex justify-center">
                                        <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                            <Icon className="w-10 h-10 text-[#6366F1]" />
                                        </div>
                                    </div>

                                    {/* Visual placeholder */}
                                    <div className="bg-white/5 rounded-xl p-5 border border-white/10 min-h-[160px] flex items-center justify-center">
                                        {visual === "upload" && (
                                            <div className="w-full space-y-3">
                                                <div className="w-full h-2 bg-white/10 rounded-full" />
                                                <div className="w-3/4 h-2 bg-white/10 rounded-full" />
                                                <div className="w-1/2 h-2 bg-[#6366F1]/30 rounded-full" />
                                                <div className="w-5/6 h-2 bg-white/10 rounded-full mt-4" />
                                                <div className="w-2/3 h-2 bg-white/10 rounded-full" />
                                            </div>
                                        )}
                                        {visual === "review" && (
                                            <div className="w-full space-y-2.5">
                                                {[1, 2, 3, 4].map((i) => (
                                                    <div key={i} className="flex items-center gap-2">
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                                        <div className="flex-1 h-2 bg-white/10 rounded-full" />
                                                        <div className="w-12 h-2 bg-[#6366F1]/20 rounded-full" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {visual === "insights" && (
                                            <div className="w-full space-y-2">
                                                <div className="w-full h-14 bg-gradient-to-r from-[#6366F1]/20 to-[#8B5CF6]/20 rounded-lg" />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="h-10 bg-white/10 rounded-lg" />
                                                    <div className="h-10 bg-white/10 rounded-lg" />
                                                </div>
                                                <div className="w-full h-2 bg-[#6366F1]/30 rounded-full" />
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold mb-2">{title}</h3>
                                        <p className="text-[#8B92A8] leading-relaxed text-sm">{description}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Privacy ──────────────────────────────────────────────────── */}
            <section id="privacy" className="py-24 lg:py-32">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#6366F1]/20 to-[#8B5CF6]/20 mb-6">
                            <Shield className="w-10 h-10 text-[#6366F1]" />
                        </div>
                        <h2 className="text-4xl lg:text-5xl font-bold mb-4">Your Data Stays Yours</h2>
                        <p className="text-xl text-[#8B92A8] max-w-3xl mx-auto leading-relaxed">
                            No bank account linking. No third-party data sharing. Your statements are parsed
                            securely and never shared. You're in complete control.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 mt-12">
                        {privacyPoints.map(({ icon: Icon, title, description }, i) => (
                            <div
                                key={i}
                                className="bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-[#6366F1]/30 transition-all"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6366F1]/20 to-[#8B5CF6]/20 flex items-center justify-center flex-shrink-0">
                                        <Icon className="w-6 h-6 text-[#6366F1]" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold mb-2">{title}</h3>
                                        <p className="text-[#8B92A8] leading-relaxed text-sm">{description}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Final CTA ─────────────────────────────────────────────────── */}
            <section className="py-24 lg:py-32 relative overflow-hidden border-t border-white/5">
                <div className="absolute inset-0 bg-gradient-to-br from-[#6366F1]/10 via-[#8B5CF6]/5 to-transparent pointer-events-none" />
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
                </div>

                <div className="relative max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
                        Ready to Understand Your Money?
                    </h2>
                    <p className="text-xl lg:text-2xl text-[#8B92A8] mb-10 max-w-2xl mx-auto">
                        Join Money Mind free and discover your spending personality today.
                    </p>

                    <div className="flex flex-col items-center gap-4">
                        <Link
                            to="/login"
                            className="group px-10 py-5 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white text-lg font-semibold rounded-xl hover:shadow-2xl hover:shadow-indigo-500/40 transition-all duration-300 flex items-center gap-3"
                        >
                            Get Started Free
                            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <p className="text-[#8B92A8] text-sm">No credit card required.</p>
                    </div>
                </div>
            </section>

            {/* ── Footer ───────────────────────────────────────────────────── */}
            <footer className="border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6 py-12">
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        {/* Brand */}
                        <div className="md:col-span-2">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
                                    <Brain className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-lg font-bold">Money Mind</span>
                            </div>
                            <p className="text-[#8B92A8] max-w-sm leading-relaxed text-sm">
                                Transform your bank statements into personalized spending intelligence.
                                Privacy-first financial clarity.
                            </p>
                        </div>

                        {/* Product */}
                        <div>
                            <h4 className="font-semibold mb-4 text-sm">Product</h4>
                            <ul className="space-y-3">
                                {[
                                    { label: "Features",    id: "features" },
                                    { label: "How It Works",id: "how-it-works" },
                                    { label: "Privacy",     id: "privacy" },
                                ].map(({ label, id }) => (
                                    <li key={id}>
                                        <button
                                            onClick={() => scrollTo(id)}
                                            className="text-[#8B92A8] hover:text-[#F0F2F8] transition-colors text-sm"
                                        >
                                            {label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* App */}
                        <div>
                            <h4 className="font-semibold mb-4 text-sm">App</h4>
                            <ul className="space-y-3">
                                <li>
                                    <Link
                                        to="/login"
                                        className="text-[#8B92A8] hover:text-[#F0F2F8] transition-colors text-sm"
                                    >
                                        Login
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        to="/login"
                                        className="text-[#8B92A8] hover:text-[#F0F2F8] transition-colors text-sm"
                                    >
                                        Sign Up
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        to="/dashboard"
                                        className="text-[#8B92A8] hover:text-[#F0F2F8] transition-colors text-sm"
                                    >
                                        Dashboard
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/5">
                        <p className="text-[#8B92A8] text-sm text-center">
                            © 2026 Money Mind. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
