import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Archive,
  ArrowRight,
  ArrowLeftRight,
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Camera,
  Eye,
  EyeOff,
  FileText,
  Home,
  Image as ImageIcon,
  ListChecks,
  LockKeyhole,
  LogOut,
  Maximize2,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  ReceiptText,
  History,
  Share2,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Upload,
  X
} from "lucide-react";
import "./styles.css";

const avatarOptions = Array.from({ length: 28 }, (_, index) => ({
  id: `avatar-${String(index + 1).padStart(2, "0")}`,
  src: `/avatars/avatar-${String(index + 1).padStart(2, "0")}.png`
}));

const avatarCrop = {
  avatarZoom: 1.95,
  avatarX: 0,
  avatarY: 10
};

const initialProfiles = [];

const initialMembers = [];

const initialMonimons = [];

const initialMonimonMembers = [];

const initialDebts = [];

const initialPayments = [];

const initialPaymentRequests = [];

const navItems = [
  { id: "resumen", label: "Resumen", icon: Home },
  { id: "gastos", label: "Gastos", icon: ListChecks },
  { id: "pago", label: "Pagos", icon: ReceiptText },
  { id: "prestamos", label: "Préstamos", icon: FileText },
  { id: "pagos", label: "Historial", icon: History },
  { id: "archivo", label: "Archivo", icon: Archive },
  { id: "solicitudes", label: "Solicitudes", icon: Bell }
];

const groupNavItems = [
  { id: "resumen", label: "Resumen", icon: Home },
  { id: "gastos", label: "Gastos", icon: ListChecks },
  { id: "pago", label: "Pagos", icon: ReceiptText },
  { id: "prestamos", label: "Préstamos", icon: FileText },
  { id: "pagos", label: "Historial", icon: History },
  { id: "archivo", label: "Archivo", icon: Archive },
  { id: "solicitudes", label: "Solicitudes", icon: Bell }
];

const validViewIds = new Set(groupNavItems.map((item) => item.id));
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function money(value, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2
  }).format(value);
}

function formatAmountInput(rawValue) {
  const digits = rawValue.replace(/\D/g, "");
  if (!digits) return "";
  const numericValue = Number(digits) / 100;
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numericValue);
}

function parseAmountInput(value) {
  if (!value) return 0;
  return Number(value.replace(/\./g, "").replace(",", "."));
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatISODate(isoDate) {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function toISOInputDate(displayDate) {
  if (!displayDate) return todayISO();
  if (/^\d{4}-\d{2}-\d{2}$/.test(displayDate)) return displayDate;
  const [day, month, year] = displayDate.split("/");
  return year && month && day ? `${year}-${month}-${day}` : todayISO();
}

function monthLabel(isoMonth) {
  const [year, month] = isoMonth.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(date);
}

function shiftMonth(isoMonth, offset) {
  const [year, month] = isoMonth.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return date.toISOString().slice(0, 7);
}

function readStored(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "No se pudo conectar con el backend.");
  }
  return payload;
}

function readStoredSession() {
  return readStored("monimon:authSession", null);
}

function profileFromAuthUser(user) {
  const metadata = user?.user_metadata || {};
  const displayName = metadata.display_name || metadata.full_name || metadata.name || user?.email?.split("@")[0] || "Usuario";
  return {
    id: user.id,
    name: displayName.toUpperCase(),
    email: user.email || "",
    role: user.app_metadata?.role || user.user_metadata?.role || "user",
    avatarSrc: metadata.avatar_url || avatarOptions[0].src,
    ...avatarCrop
  };
}

function memberFromProfile(profile) {
  return {
    id: profile.id,
    profileId: profile.id,
    displayName: profile.name || profile.email || "USER",
    status: "active"
  };
}

function normalizeDebts(items) {
  return Array.isArray(items)
    ? items.filter(Boolean).map((item) => ({
        ...item,
        id: item.id || Date.now() + Math.random(),
        fromMemberId: item.fromMemberId || "unknown",
        toMemberId: item.toMemberId || "unknown",
        title: item.title || "General",
        amount: Number(item.amount) || 0,
        currency: item.currency || "ARS",
        date: item.date || formatISODate(todayISO()),
        status: item.status || "open",
        monimonId: item.monimonId || "personal"
      }))
    : [];
}

function normalizePayments(items) {
  return Array.isArray(items)
    ? items.filter(Boolean).map((item) => ({
        ...item,
        id: item.id || Date.now() + Math.random(),
        fromMemberId: item.fromMemberId || "unknown",
        toMemberId: item.toMemberId || "unknown",
        detail: item.detail || "General",
        amount: Number(item.amount) || 0,
        currency: item.currency || "ARS",
        date: item.date || formatISODate(todayISO()),
        monimonId: item.monimonId || "personal"
      }))
    : [];
}

function normalizePaymentRequests(items) {
  return Array.isArray(items)
    ? items.filter(Boolean).map((item) => ({
        ...item,
        id: item.id || Date.now() + Math.random(),
        fromMemberId: item.fromMemberId || "unknown",
        toMemberId: item.toMemberId || "unknown",
        requestedByMemberId: item.requestedByMemberId || "unknown",
        approvedByMemberIds: Array.isArray(item.approvedByMemberIds) ? item.approvedByMemberIds : [],
        requiredApproverMemberIds: Array.isArray(item.requiredApproverMemberIds) ? item.requiredApproverMemberIds : [],
        rejectedByMemberId: item.rejectedByMemberId || null,
        debtIds: Array.isArray(item.debtIds) ? item.debtIds : [],
        detail: item.detail || "General",
        amount: Number(item.amount) || 0,
        currency: item.currency || "ARS",
        date: item.date || formatISODate(todayISO()),
        monimonId: item.monimonId || "personal",
        status: item.status || "pending",
        createdAt: item.createdAt || new Date().toISOString()
      }))
    : [];
}

function normalizeMonimonOptions(items) {
  return Array.isArray(items)
    ? items
        .filter((item) => item && item.id && item.name)
        .map((item) => ({ ...item, members: Array.isArray(item.members) ? item.members : [] }))
    : [];
}

function normalizeMembers(items) {
  return Array.isArray(items)
    ? items
        .filter((item) => item && item.id)
        .map((item) => ({
          ...item,
          displayName: item.displayName || item.name || "USER",
          status: item.status || "active"
        }))
    : [];
}

function normalizeMonimons(items) {
  return Array.isArray(items)
    ? items
        .filter((item) => item && item.id && item.name)
        .map((item) => ({ ...item, name: item.name }))
    : [];
}

function normalizeMonimonMembers(items) {
  return Array.isArray(items)
    ? items
        .filter((item) => item && item.monimonId && item.memberId)
        .map((item) => ({ ...item, status: item.status || "active" }))
    : [];
}

function normalizeProfiles(items) {
  return Array.isArray(items)
    ? items
        .filter((item) => item && item.id)
        .map((item) => ({
          ...avatarCrop,
          ...item,
          name: item.name || item.email?.split("@")[0]?.toUpperCase?.() || "USUARIO",
          avatarSrc: item.avatarSrc || avatarOptions[0].src
        }))
    : [];
}

function debtShareFor(debt, memberId, members) {
  if (members.length > 1) {
    const participantIds = members.map((member) => member.id);
    if (!participantIds.includes(memberId) || debt.fromMemberId === memberId) return 0;
    return debt.amount / participantIds.length;
  }
  if (debt.toMemberId === "group") {
    const participantIds = members.length ? members.map((member) => member.id) : [];
    if (!participantIds.includes(memberId) || debt.fromMemberId === memberId) return 0;
    return debt.amount / participantIds.length;
  }
  return debt.toMemberId === memberId ? debt.amount : 0;
}

function userName(memberId, members) {
  if (memberId === "group") return "GRUPO";
  return members.find((member) => member.id === memberId)?.name || memberId?.toUpperCase?.() || "Usuario";
}

function debtCounterpartyParts(debt, members) {
  const fromName = userName(debt.fromMemberId, members);
  const toName = debt.toMemberId === "group"
    ? members.length === 2
      ? members.find((member) => member.id !== debt.fromMemberId)?.name || "GRUPO"
      : "GRUPO"
    : userName(debt.toMemberId, members);
  return { fromName, toName };
}

function groupTargetId(activeUser, members, isMonimonMode) {
  if (!isMonimonMode) return members.find((member) => member.id !== activeUser.id)?.id || members[0]?.id;
  if (members.length > 2) return "group";
  return members.find((member) => member.id !== activeUser.id)?.id || members[0]?.id;
}

function calendarDays(isoMonth) {
  const [year, month] = isoMonth.split("-").map(Number);
  const firstDate = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0).getDate();
  const mondayFirstOffset = (firstDate.getDay() + 6) % 7;
  const days = Array.from({ length: mondayFirstOffset }, () => null);
  for (let day = 1; day <= lastDay; day += 1) {
    days.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function App() {
  const [session, setSession] = useState(() => readStoredSession());
  const [appUsers, setAppUsers] = useState(() => normalizeProfiles(readStored("monimon:profiles", initialProfiles)));
  const [members, setMembers] = useState(() => normalizeMembers(readStored("monimon:members", initialMembers)));
  const [monimons, setMonimons] = useState(() => normalizeMonimons(readStored("monimon:monimons", initialMonimons)));
  const [monimonMembers, setMonimonMembers] = useState(() => normalizeMonimonMembers(readStored("monimon:monimonMembers", initialMonimonMembers)));
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("resumen");
  const [debts, setDebts] = useState(() => normalizeDebts(readStored("monimon:debts", initialDebts)));
  const [payments, setPayments] = useState(() => normalizePayments(readStored("monimon:payments", initialPayments)));
  const [paymentRequests, setPaymentRequests] = useState(() => normalizePaymentRequests(readStored("monimon:paymentRequests", initialPaymentRequests)));
  const [selectedDebtIds, setSelectedDebtIds] = useState([]);
  const [manualAmount, setManualAmount] = useState("");
  const [paymentCurrency, setPaymentCurrency] = useState("ARS");
  const [paymentReason, setPaymentReason] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [showNewPayment, setShowNewPayment] = useState(false);
  const [showNewDebt, setShowNewDebt] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [archiveFiles, setArchiveFiles] = useState([]);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileModal, setProfileModal] = useState(null);
  const [editingDebt, setEditingDebt] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [sideNavCollapsed, setSideNavCollapsed] = useState(false);
  const [selectedMonimonId, setSelectedMonimonId] = useState(() => readStored("monimon:selectedMonimonId", readStored("monimon:selectedSpace", "personal")));
  const [showCreateMonimon, setShowCreateMonimon] = useState(false);
  const [editingMonimonId, setEditingMonimonId] = useState(null);
  const [personalSpaceName, setPersonalSpaceName] = useState(() => readStored("monimon:personalSpaceName", "PERSONAL"));
  const [backendOnline, setBackendOnline] = useState(false);
  const backendLoaded = useRef(false);

  const activeUser = session ? appUsers.find((user) => user.id === session.userId) || session.user : null;
  const otherUser = activeUser ? appUsers.find((user) => user.id !== activeUser.id) : null;
  const memberOptions = useMemo(() => members.map((member) => {
    const profile = appUsers.find((user) => user.id === member.profileId || user.id === member.id);
    return {
      ...(profile || {}),
      id: member.id,
      name: member.displayName || profile?.name || "USUARIO",
      memberStatus: member.status,
      profileId: member.profileId || null,
      avatarSrc: profile?.avatarSrc || avatarOptions[0].src,
      ...avatarCrop
    };
  }), [members, appUsers]);
  const monimonOptions = useMemo(() => monimons.map((monimon) => ({
    ...monimon,
    members: monimonMembers
      .filter((item) => item.monimonId === monimon.id && item.status !== "removed")
      .map((item) => item.memberId)
  })), [monimons, monimonMembers]);

  function replaceMonimonsFromOptions(nextMonimonsOrUpdater) {
    const nextMonimons = typeof nextMonimonsOrUpdater === "function" ? nextMonimonsOrUpdater(monimonOptions) : nextMonimonsOrUpdater;
    const normalizedMonimons = normalizeMonimonOptions(nextMonimons);
    setMonimons(normalizedMonimons.map(({ members: _members, ...monimon }) => monimon));
    setMonimonMembers((existingMemberships) => {
      const nextMonimonIds = new Set(normalizedMonimons.map((monimon) => monimon.id));
      const activeKeys = new Set(normalizedMonimons.flatMap((monimon) => (
        (monimon.members || []).map((memberId) => `${monimon.id}:${memberId}`)
      )));
      const preservedRemoved = existingMemberships
        .filter((membership) => nextMonimonIds.has(membership.monimonId))
        .filter((membership) => !activeKeys.has(`${membership.monimonId}:${membership.memberId}`))
        .map((membership) => ({ ...membership, status: "removed" }));
      const activeMemberships = normalizedMonimons.flatMap((monimon) => (
        (monimon.members || []).map((memberId) => ({
          monimonId: monimon.id,
          memberId,
          status: "active"
        }))
      ));
      return [...activeMemberships, ...preservedRemoved];
    });
  }

  useEffect(() => {
    let cancelled = false;
    const headers = session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {};
    apiRequest("/api/state", { headers })
      .then((state) => {
        if (cancelled) return;
        if (Array.isArray(state.profiles) && state.profiles.length) setAppUsers(normalizeProfiles(state.profiles));
        if (Array.isArray(state.members) && state.members.length) setMembers(normalizeMembers(state.members));
        if (Array.isArray(state.monimons) && state.monimons.length) setMonimons(normalizeMonimons(state.monimons));
        if (Array.isArray(state.monimonMembers) && state.monimonMembers.length) setMonimonMembers(normalizeMonimonMembers(state.monimonMembers));
        if (Array.isArray(state.groups) && state.groups.length && !state.monimons?.length) replaceMonimonsFromOptions(normalizeMonimonOptions(state.groups));
        if (Array.isArray(state.debts) && state.debts.length) setDebts(normalizeDebts(state.debts));
        if (Array.isArray(state.payments) && state.payments.length) setPayments(normalizePayments(state.payments));
        if (Array.isArray(state.paymentRequests) && state.paymentRequests.length) setPaymentRequests(normalizePaymentRequests(state.paymentRequests));
        backendLoaded.current = true;
        setBackendOnline(true);
      })
      .catch(() => {
        backendLoaded.current = false;
        setBackendOnline(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);

  useEffect(() => {
    if (!backendOnline || !backendLoaded.current) return;
    const timeoutId = window.setTimeout(() => {
      apiRequest("/api/state", {
        method: "PUT",
        headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {},
        body: JSON.stringify({ profiles: appUsers, members, monimons, monimonMembers, debts, payments, paymentRequests })
      }).catch(() => setBackendOnline(false));
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [backendOnline, session?.accessToken, appUsers, members, monimons, monimonMembers, debts, payments, paymentRequests]);

  useEffect(() => localStorage.setItem("monimon:profiles", JSON.stringify(appUsers)), [appUsers]);
  useEffect(() => localStorage.setItem("monimon:members", JSON.stringify(members)), [members]);
  useEffect(() => localStorage.setItem("monimon:monimons", JSON.stringify(monimons)), [monimons]);
  useEffect(() => localStorage.setItem("monimon:monimonMembers", JSON.stringify(monimonMembers)), [monimonMembers]);
  useEffect(() => {
    if (session) localStorage.setItem("monimon:authSession", JSON.stringify(session));
    else localStorage.removeItem("monimon:authSession");
  }, [session]);
  useEffect(() => {
    if (!session?.accessToken) return;
    let cancelled = false;
    apiRequest("/api/auth/user", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.accessToken}` },
      body: JSON.stringify({ access_token: session.accessToken })
    })
      .then((user) => {
        if (cancelled) return;
        const profile = profileFromAuthUser(user);
        setAppUsers((items) => items.map((item) => (item.id === profile.id ? { ...item, email: profile.email, role: profile.role } : item)));
        setSession((current) => current?.accessToken === session.accessToken ? { ...current, user: profile } : current);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);
  useEffect(() => localStorage.setItem("monimon:debts", JSON.stringify(debts)), [debts]);
  useEffect(() => localStorage.setItem("monimon:payments", JSON.stringify(payments)), [payments]);
  useEffect(() => localStorage.setItem("monimon:paymentRequests", JSON.stringify(paymentRequests)), [paymentRequests]);
  useEffect(() => localStorage.setItem("monimon:selectedMonimonId", JSON.stringify(selectedMonimonId)), [selectedMonimonId]);
  useEffect(() => localStorage.setItem("monimon:personalSpaceName", JSON.stringify(personalSpaceName)), [personalSpaceName]);
  useEffect(() => {
    const match = window.location.hash.match(/monimon=([^&]+)/);
    const sharedSpace = match ? decodeURIComponent(match[1]) : null;
    if (sharedSpace && (sharedSpace === "personal" || monimonOptions.some((monimon) => monimon.id === sharedSpace))) {
      setSelectedMonimonId(sharedSpace);
    }
  }, [monimonOptions]);
  useEffect(() => {
    if (selectedMonimonId !== "personal" && !monimonOptions.some((monimon) => monimon.id === selectedMonimonId)) {
      setSelectedMonimonId("personal");
    }
  }, [monimonOptions, selectedMonimonId]);

  function rememberAuthSession(payload) {
    const profile = profileFromAuthUser(payload.user);
    const member = memberFromProfile(profile);
    setAppUsers((items) => {
      const exists = items.some((user) => user.id === profile.id);
      return exists ? items.map((user) => (user.id === profile.id ? { ...profile, ...user, email: profile.email } : user)) : [profile, ...items];
    });
    setMembers((items) => {
      const exists = items.some((item) => item.id === member.id);
      return exists ? items.map((item) => (item.id === member.id ? { ...member, ...item, profileId: profile.id } : item)) : [member, ...items];
    });
    setSession({
      userId: profile.id,
      user: profile,
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      tokenType: payload.token_type || "bearer",
      expiresAt: payload.expires_at || null,
      createdAt: Date.now()
    });
    setAuthPassword("");
    setError("");
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken) return;
    apiRequest("/api/auth/user", {
      method: "POST",
      body: JSON.stringify({ access_token: accessToken })
    })
      .then((user) => {
        rememberAuthSession({
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: params.get("token_type") || "bearer",
          user
        });
        window.history.replaceState(null, "", window.location.pathname);
      })
      .catch((authError) => setError(authError.message));
  }, []);

  async function submitLogin(event) {
    event.preventDefault();
    setError("");
    setAuthLoading(true);
    try {
      const payload = await apiRequest(authMode === "login" ? "/api/auth/login" : "/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: authEmail.trim(),
          password: authPassword,
          name: authName.trim()
        })
      });
      if (payload.access_token && payload.user) {
        rememberAuthSession(payload);
      } else {
        setError("Revisá tu email para confirmar la cuenta antes de iniciar sesión.");
      }
    } catch (authError) {
      setError(authError.message || "No se pudo iniciar sesión.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function loginWithGoogle() {
    setError("");
    setAuthLoading(true);
    try {
      const payload = await apiRequest("/api/auth/google-url", {
        method: "POST",
        body: JSON.stringify({ redirectTo: window.location.origin + window.location.pathname })
      });
      window.location.href = payload.url;
    } catch (authError) {
      setError(authError.message || "No se pudo iniciar sesión con Google.");
      setAuthLoading(false);
    }
  }

  function startSession() {
    if (!validViewIds.has(activeView)) {
      setActiveView("resumen");
    }
    setShowNewPayment(false);
    setShowNewDebt(false);
    setEditingDebt(null);
    setEditingPayment(null);
    setProfileMenuOpen(false);
  }

  function updateActiveUser(updates) {
    setAppUsers((items) => items.map((user) => (user.id === activeUser.id ? { ...user, ...updates } : user)));
  }

  function clearAuthSession() {
    setSession(null);
    setAuthPassword("");
    setAuthEmail("");
    setAuthName("");
    setAuthMode("login");
    setProfileMenuOpen(false);
    setProfileModal(null);
    window.history.replaceState(null, "", window.location.pathname);
    localStorage.removeItem("monimon:authSession");
  }

  async function logout() {
    const accessToken = session?.accessToken;
    clearAuthSession();
    if (!accessToken) return;
    try {
      await apiRequest("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ access_token: accessToken })
      });
    } catch {
      // Local logout already happened; a failed remote revoke should not keep the user inside.
    }
  }

  async function deleteAccount() {
    const accessToken = session?.accessToken;
    if (!accessToken) return;
    await apiRequest("/api/auth/delete-account", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ access_token: accessToken })
    });
    clearAuthSession();
  }
  function registerPayment({ fromId, toId, debtIds = selectedDebtIds, amountOverride = null }) {
    const selectedDebts = debts.filter((debt) => debtIds.includes(debt.id));
    const parsedManual = parseAmountInput(manualAmount);
    const selectedMonimon = monimonOptions.find((monimon) => monimon.id === selectedMonimonId);
    const membersForSelectedMonimon = selectedMonimon ? selectedMonimon.members.map((id) => memberOptions.find((user) => user.id === id)).filter(Boolean) : [];
    const amount = amountOverride ?? (parsedManual > 0 ? parsedManual : selectedDebts.reduce((sum, debt) => sum + debtShareFor(debt, fromId, membersForSelectedMonimon), 0));

    if (!amount || !activeUser || !fromId || !toId) return false;

    const paidIds = parsedManual > 0 && !amountOverride ? [] : debtIds;
    const involvedIds = toId === "group"
      ? membersForSelectedMonimon.map((user) => user.id)
      : [fromId, toId];
    const requiredApproverMemberIds = [...new Set(involvedIds)].filter((id) => id && id !== activeUser.id);
    setPaymentRequests((items) => [
      {
        id: `payment-request-${Date.now()}`,
        monimonId: selectedMonimonId,
        fromMemberId: fromId,
        toMemberId: toId,
        requestedByMemberId: activeUser.id,
        approvedByMemberIds: [activeUser.id],
        requiredApproverMemberIds,
        debtIds: paidIds,
        rejectedByMemberId: null,
        amount,
        currency: paymentCurrency,
        date: formatISODate(paymentDate),
        detail: paymentReason.trim() || "General",
        status: requiredApproverMemberIds.length ? "pending" : "approved",
        createdAt: new Date().toISOString()
      },
      ...items
    ]);
    setManualAmount("");
    setPaymentReason("");
    setPaymentDate(todayISO());
    setPaymentError("");
    setShowNewPayment(false);
    return true;
  }

  function approvePaymentRequest(requestId) {
    const request = paymentRequests.find((item) => item.id === requestId);
    if (!request || request.status !== "pending" || !activeUser) return;
    const approvedByMemberIds = [...new Set([...(request.approvedByMemberIds || []), activeUser.id])];
    const pendingApprovals = (request.requiredApproverMemberIds || []).filter((id) => !approvedByMemberIds.includes(id));
    if (pendingApprovals.length) {
      setPaymentRequests((items) => items.map((item) => (item.id === requestId ? { ...item, approvedByMemberIds } : item)));
      return;
    }
    setPayments((items) => [
      {
        id: `payment-${Date.now()}`,
        monimonId: request.monimonId,
        fromMemberId: request.fromMemberId,
        toMemberId: request.toMemberId,
        amount: request.amount,
        currency: request.currency,
        date: request.date,
        detail: request.detail,
        verifiedByMemberIds: approvedByMemberIds,
        requestId: request.id
      },
      ...items
    ]);
    if (request.debtIds?.length) {
      setDebts((items) => items.map((debt) => (request.debtIds.includes(debt.id) ? { ...debt, status: "paid" } : debt)));
      setSelectedDebtIds((items) => items.filter((id) => !request.debtIds.includes(id)));
    }
    setPaymentRequests((items) => items.map((item) => (item.id === requestId ? { ...item, approvedByMemberIds, status: "approved" } : item)));
  }

  function rejectPaymentRequest(requestId) {
    if (!activeUser) return;
    setPaymentRequests((items) => items.map((item) => (
      item.id === requestId ? { ...item, rejectedByMemberId: activeUser.id, status: "rejected" } : item
    )));
  }

  function registerDebt({ fromId, toId, title, amount, currency, date }) {
    if (!activeUser || !fromId || !toId || !title.trim() || amount <= 0) return false;
    setDebts((items) => [
      {
        id: Date.now(),
        monimonId: selectedMonimonId,
        fromMemberId: fromId,
        toMemberId: toId,
        title: title.trim(),
        amount,
        currency,
        date: formatISODate(date || todayISO()),
        status: "open"
      },
      ...items
    ]);
    setShowNewDebt(false);
    return true;
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-app text-milk">
        <div className="ambient" />
        <section className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-4 py-8 lg:grid-cols-[1fr_430px] lg:px-8">
          <div className="brand-copy">
            <img src="/moni-logo.png" alt="moni mon!" className="hero-logo" />
            <h1>Las cuentas claritas.</h1>
            <p>La app que conserva amistades.</p>
            <div className="hero-mascots">
              <img src="/moni-mascots.png" alt="Mascotas de moni mon!" />
            </div>
          </div>
          <LoginCard
            authEmail={authEmail}
            setAuthEmail={setAuthEmail}
            authPassword={authPassword}
            setAuthPassword={setAuthPassword}
            authName={authName}
            setAuthName={setAuthName}
            authMode={authMode}
            setAuthMode={setAuthMode}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            authLoading={authLoading}
            error={error}
            submitLogin={submitLogin}
            loginWithGoogle={loginWithGoogle}
          />
        </section>
      </main>
    );
  }

  if (!activeUser) {
    return (
      <main className="min-h-screen bg-app text-milk">
        <div className="ambient" />
        <section className="mx-auto grid min-h-screen w-full max-w-6xl items-center px-4 py-8">
          <button type="button" className="primary-action login-action" onClick={clearAuthSession}>
            Volver al login
          </button>
        </section>
      </main>
    );
  }

  return (
    <Dashboard
      activeUser={activeUser}
      otherUser={otherUser}
      appUsers={memberOptions}
      setMembers={setMembers}
      archiveFiles={archiveFiles}
      setArchiveFiles={setArchiveFiles}
      debts={debts}
      setDebts={setDebts}
      payments={payments}
      setPayments={setPayments}
      paymentRequests={paymentRequests}
      approvePaymentRequest={approvePaymentRequest}
      rejectPaymentRequest={rejectPaymentRequest}
      selectedDebtIds={selectedDebtIds}
      setSelectedDebtIds={setSelectedDebtIds}
      activeView={activeView}
      setActiveView={setActiveView}
      manualAmount={manualAmount}
      setManualAmount={setManualAmount}
      paymentCurrency={paymentCurrency}
      setPaymentCurrency={setPaymentCurrency}
      paymentReason={paymentReason}
      setPaymentReason={setPaymentReason}
      paymentDate={paymentDate}
      setPaymentDate={setPaymentDate}
      showNewPayment={showNewPayment}
      setShowNewPayment={setShowNewPayment}
      showNewDebt={showNewDebt}
      setShowNewDebt={setShowNewDebt}
      selectedMonimonId={selectedMonimonId}
      setSelectedMonimonId={setSelectedMonimonId}
      monimons={monimonOptions}
      replaceMonimons={replaceMonimonsFromOptions}
      showCreateMonimon={showCreateMonimon}
      setShowCreateMonimon={setShowCreateMonimon}
      editingMonimonId={editingMonimonId}
      setEditingMonimonId={setEditingMonimonId}
      paymentError={paymentError}
      setPaymentError={setPaymentError}
      profileMenuOpen={profileMenuOpen}
      setProfileMenuOpen={setProfileMenuOpen}
      profileModal={profileModal}
      setProfileModal={setProfileModal}
      editingDebt={editingDebt}
      setEditingDebt={setEditingDebt}
      editingPayment={editingPayment}
      setEditingPayment={setEditingPayment}
      sideNavCollapsed={sideNavCollapsed}
      setSideNavCollapsed={setSideNavCollapsed}
      personalSpaceName={personalSpaceName}
      setPersonalSpaceName={setPersonalSpaceName}
      updateActiveUser={updateActiveUser}
      registerPayment={registerPayment}
      registerDebt={registerDebt}
      logout={logout}
      deleteAccount={deleteAccount}
    />
  );
}

function LoginCard({
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authName,
  setAuthName,
  authMode,
  setAuthMode,
  showPassword,
  setShowPassword,
  authLoading,
  error,
  submitLogin,
  loginWithGoogle
}) {
  const isRegister = authMode === "register";
  return (
    <form onSubmit={submitLogin} className="glass-card login-card">
      <div className="card-heading">
        <span className="icon-badge"><LockKeyhole size={18} /></span>
        <h2>{isRegister ? "Crear cuenta" : "Ingresar"}</h2>
      </div>

      <div className="auth-mode-tabs" role="tablist" aria-label="Modo de acceso">
        <button type="button" className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")}>Ingresar</button>
        <button type="button" className={isRegister ? "active" : ""} onClick={() => setAuthMode("register")}>Crear cuenta</button>
      </div>

      {isRegister && (
        <>
          <label className="field-label" htmlFor="auth-name">Nombre</label>
          <div className="pin-field auth-field">
            <input
              id="auth-name"
              value={authName}
              onChange={(event) => setAuthName(event.target.value.slice(0, 40))}
              autoComplete="name"
              placeholder="Tu nombre"
            />
          </div>
        </>
      )}

      <label className="field-label" htmlFor="auth-email">Email</label>
      <div className="pin-field auth-field">
        <input
          id="auth-email"
          value={authEmail}
          onChange={(event) => setAuthEmail(event.target.value)}
          autoComplete="email"
          inputMode="email"
          type="email"
          placeholder="tu@email.com"
          required
        />
      </div>

      <label className="field-label" htmlFor="auth-password">Contraseña</label>
      <div className="pin-field">
        <input
          id="auth-password"
          value={authPassword}
          onChange={(event) => setAuthPassword(event.target.value)}
          autoComplete={isRegister ? "new-password" : "current-password"}
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          minLength={6}
          required
        />
        <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Mostrar u ocultar contraseña">
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}
      <button className="primary-action login-action" disabled={authLoading}>
        {authLoading ? "CARGANDO" : isRegister ? "CREAR CUENTA" : "CONFIRMAR"} <ArrowRight size={20} />
      </button>
      <button type="button" className="secondary-login-action" onClick={loginWithGoogle} disabled={authLoading}>
        <GoogleMark /> <span>Continuar con Google</span>
      </button>
    </form>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M21.6 12.23c0-.74-.07-1.45-.19-2.13H12v4.03h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.32 2.98-7.43z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.75-5.58-4.11H3.08v2.6A10 10 0 0 0 12 22z" />
      <path fill="#FBBC05" d="M6.42 13.91A6.02 6.02 0 0 1 6.1 12c0-.66.11-1.3.32-1.91v-2.6H3.08A10 10 0 0 0 2 12c0 1.61.39 3.13 1.08 4.51l3.34-2.6z" />
      <path fill="#EA4335" d="M12 5.98c1.47 0 2.78.51 3.82 1.5l2.87-2.87C16.95 2.99 14.69 2 12 2a10 10 0 0 0-8.92 5.49l3.34 2.6C7.2 7.73 9.4 5.98 12 5.98z" />
    </svg>
  );
}
function Dashboard({
  activeUser,
  otherUser,
  appUsers,
  setMembers,
  archiveFiles,
  setArchiveFiles,
  debts,
  setDebts,
  payments,
  setPayments,
  paymentRequests,
  approvePaymentRequest,
  rejectPaymentRequest,
  selectedDebtIds,
  setSelectedDebtIds,
  activeView,
  setActiveView,
  manualAmount,
  setManualAmount,
  paymentCurrency,
  setPaymentCurrency,
  paymentReason,
  setPaymentReason,
  paymentDate,
  setPaymentDate,
  showNewPayment,
  setShowNewPayment,
  showNewDebt,
  setShowNewDebt,
  selectedMonimonId,
  setSelectedMonimonId,
  monimons,
  replaceMonimons,
  showCreateMonimon,
  setShowCreateMonimon,
  editingMonimonId,
  setEditingMonimonId,
  paymentError,
  setPaymentError,
  profileMenuOpen,
  setProfileMenuOpen,
  profileModal,
  setProfileModal,
  editingDebt,
  setEditingDebt,
  editingPayment,
  setEditingPayment,
  sideNavCollapsed,
  setSideNavCollapsed,
  personalSpaceName,
  setPersonalSpaceName,
  updateActiveUser,
  registerPayment,
  registerDebt,
  logout,
  deleteAccount
}) {
  const scopedDebts = debts.filter((debt) => debt.monimonId === selectedMonimonId);
  const scopedPayments = payments.filter((payment) => payment.monimonId === selectedMonimonId);
  const scopedPaymentRequests = paymentRequests.filter((request) => request.monimonId === selectedMonimonId);
  const openDebts = scopedDebts.filter((debt) => debt.status === "open");
  const currentNavItems = selectedMonimonId === "personal" ? navItems : groupNavItems;
  const selectedMonimon = monimons.find((monimon) => monimon.id === selectedMonimonId);
  const membersForSelectedMonimon = selectedMonimon ? selectedMonimon.members.map((id) => appUsers.find((user) => user.id === id)).filter(Boolean) : [];
  const isMonimonMode = selectedMonimonId !== "personal";
  const shareUrl = `${window.location.origin}${window.location.pathname}#monimon=${selectedMonimonId}`;
  const incomingDebts = openDebts.filter((debt) => debt.fromMemberId === activeUser.id);
  const outgoingDebts = openDebts.filter((debt) => debtShareFor(debt, activeUser.id, membersForSelectedMonimon) > 0);
  const theyOwe = incomingDebts.reduce((sum, debt) => {
    if (membersForSelectedMonimon.length > 1) {
      const memberCount = membersForSelectedMonimon.length || 1;
      return sum + debt.amount - debt.amount / memberCount;
    }
    return sum + debt.amount;
  }, 0);
  const iOwe = outgoingDebts.reduce((sum, debt) => sum + debtShareFor(debt, activeUser.id, membersForSelectedMonimon), 0);
  const selectedDebts = outgoingDebts.filter((debt) => selectedDebtIds.includes(debt.id));
  const selectedTotal = selectedDebts.reduce((sum, debt) => sum + debtShareFor(debt, activeUser.id, membersForSelectedMonimon), 0);
  function saveEditedDebt({ id, title, amount, currency, date, fromMemberId, toMemberId }) {
    const parsedAmount = parseAmountInput(amount);
    if (!title.trim() || parsedAmount <= 0) return;
    setDebts((items) => items.map((item) => (item.id === id ? { ...item, title: title.trim(), amount: parsedAmount, currency, date, fromMemberId, toMemberId } : item)));
    setEditingDebt(null);
  }

  function deleteDebt(debt) {
    if (!window.confirm(`Eliminar ${debt.title}?`)) return;
    setDebts((items) => items.filter((item) => item.id !== debt.id));
    setSelectedDebtIds((items) => items.filter((id) => id !== debt.id));
  }

  function saveEditedPayment({ id, detail, amount }) {
    const parsedAmount = parseAmountInput(amount);
    if (!detail.trim() || parsedAmount <= 0) return;
    setPayments((items) => items.map((item) => (item.id === id ? { ...item, detail: detail.trim(), amount: parsedAmount } : item)));
    setEditingPayment(null);
  }

  function deletePayment(payment) {
    if (!window.confirm(`Eliminar ${payment.detail}?`)) return;
    setPayments((items) => items.filter((item) => item.id !== payment.id));
  }

  function deleteMonimon(monimon) {
    if (!monimon) return;
    const confirmed = window.confirm(
      `Eliminar ${monimon.name}?\n\nSe eliminará por completo y no se puede recuperar. Sus gastos, pagos, solicitudes y registros se perderán para siempre.`
    );
    if (!confirmed) return;
    replaceMonimons(monimons.filter((item) => item.id !== monimon.id));
    setDebts((items) => items.filter((item) => item.monimonId !== monimon.id));
    setPayments((items) => items.filter((item) => item.monimonId !== monimon.id));
    setPaymentRequests((items) => items.filter((item) => item.monimonId !== monimon.id));
    setSelectedDebtIds([]);
    setSelectedMonimonId("personal");
    setEditingMonimonId(null);
  }

  async function shareMonimon() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      window.alert("Link copiado.");
    } catch {
      window.prompt("Copiá este link", shareUrl);
    }
  }

  return (
    <main className="min-h-screen bg-app text-milk">
      <div className="ambient" />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 lg:px-6">
        <header className="topbar">
          <div className="flex items-center gap-4">
            <img src="/moni-logo.png" alt="moni mon!" className="app-logo" />
          </div>
          <div className="flex items-center gap-3">
            <button className="icon-btn" aria-label="Notificaciones"><Bell size={18} /></button>
            <div className="profile-area">
              <button type="button" className="profile-trigger" onClick={() => setProfileMenuOpen((open) => !open)}>
                <Avatar user={activeUser} />
                <span>{activeUser.name}</span>
              </button>
              {profileMenuOpen && (
                <ProfileMenu
                  activeUser={activeUser}
                  setProfileModal={setProfileModal}
                  setProfileMenuOpen={setProfileMenuOpen}
                />
              )}
            </div>
          </div>
        </header>

        <div className={`app-layout ${sideNavCollapsed ? "nav-collapsed" : ""}`}>
          <aside className="side-nav">
            <button type="button" className="collapse-nav-btn" onClick={() => setSideNavCollapsed((collapsed) => !collapsed)} aria-label={sideNavCollapsed ? "Expandir menú" : "Colapsar menú"}>
              {sideNavCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            {currentNavItems.map((item) => <NavButton key={item.id} item={item} active={activeView === item.id} setActiveView={setActiveView} />)}
          </aside>

          <section className="content-area">
            <div className="workspace-bar">
              <div className="workspace-main">
                <div className="workspace-select-row">
                  <select value={selectedMonimonId} onChange={(event) => setSelectedMonimonId(event.target.value)} aria-label="Seleccionar espacio">
                    <option value="personal">{personalSpaceName.toUpperCase()}</option>
                    {monimons.map((monimon) => <option key={monimon.id} value={monimon.id}>{monimon.name}</option>)}
                  </select>
                  {selectedMonimon && (
                    <button type="button" className="edit-monimon-btn" onClick={() => setEditingMonimonId(selectedMonimon.id)} aria-label="Configurar moni mon!">
                      <Settings size={16} />
                    </button>
                  )}
                  {selectedMonimon && (
                    <button type="button" className="share-monimon-btn" onClick={shareMonimon} aria-label="Compartir moni mon!">
                      <Share2 size={17} />
                    </button>
                  )}
                </div>
                {selectedMonimonId !== "personal" && (
                  <div className="workspace-people">
                    {membersForSelectedMonimon.map((member) => <span key={member.id}>{member.name}</span>)}
                  </div>
                )}
              </div>
              <div className="workspace-actions">
                <button type="button" className="create-monimon-btn" onClick={() => setShowCreateMonimon(true)}><Plus size={17} /> CREAR MON!</button>
              </div>
            </div>
            <div className="dashboard-grid">
              <section className="main-column">
                <SummaryHeader
                  activeUser={activeUser}
                  otherUser={otherUser}
                  theyOwe={theyOwe}
                  iOwe={iOwe}
                />
                {activeView === "gastos" && (
                  <DebtPanel activeUser={activeUser} appUsers={isMonimonMode ? membersForSelectedMonimon : appUsers} incomingDebts={incomingDebts} outgoingDebts={outgoingDebts} selectedDebtIds={selectedDebtIds} setSelectedDebtIds={setSelectedDebtIds} isMonimonMode={isMonimonMode} title="Gastos" action="Nuevo gasto" onNewDebt={() => setShowNewDebt(true)} onEditDebt={setEditingDebt} onDeleteDebt={deleteDebt} />
                )}
                {activeView === "prestamos" && (
                  <DebtPanel activeUser={activeUser} appUsers={isMonimonMode ? membersForSelectedMonimon : appUsers} incomingDebts={incomingDebts} outgoingDebts={outgoingDebts} selectedDebtIds={selectedDebtIds} setSelectedDebtIds={setSelectedDebtIds} isMonimonMode={isMonimonMode} title="Préstamos" action="Nuevo préstamo" onNewDebt={() => setShowNewDebt(true)} onEditDebt={setEditingDebt} onDeleteDebt={deleteDebt} />
                )}
                {activeView === "pagos" && <PaymentsPanel payments={scopedPayments} onEditPayment={setEditingPayment} onDeletePayment={deletePayment} />}
                {activeView === "archivo" && (
                  <section className="glass-card panel">
                    <ArchivePanel files={archiveFiles} setFiles={setArchiveFiles} />
                    <EmptyState text="Todavía no hay elementos archivados." />
                  </section>
                )}
                {activeView === "solicitudes" && (
                  <section className="glass-card panel">
                    <PanelTitle icon={<Bell size={18} />} title="Solicitudes" />
                    <RequestsPanel
                      requests={scopedPaymentRequests}
                      activeUser={activeUser}
                      appUsers={appUsers}
                      selectedMonimon={selectedMonimon}
                      approvePaymentRequest={approvePaymentRequest}
                      rejectPaymentRequest={rejectPaymentRequest}
                    />
                  </section>
                )}
                {activeView === "pago" && (
                  <PaymentPanel
                    activeUser={activeUser}
                    appUsers={appUsers}
                    selectedMonimon={selectedMonimon}
                    debts={openDebts}
                    selectedDebtIds={selectedDebtIds}
                    setSelectedDebtIds={setSelectedDebtIds}
                    selectedTotal={selectedTotal}
                    manualAmount={manualAmount}
                    setManualAmount={setManualAmount}
                    paymentCurrency={paymentCurrency}
                    setPaymentCurrency={setPaymentCurrency}
                    paymentReason={paymentReason}
                    setPaymentReason={setPaymentReason}
                    paymentDate={paymentDate}
                    setPaymentDate={setPaymentDate}
                    paymentError={paymentError}
                    setPaymentError={setPaymentError}
                    showNewPayment={showNewPayment}
                    setShowNewPayment={setShowNewPayment}
                    selectedMonimonId={selectedMonimonId}
                    payments={scopedPayments}
                    pendingDebts={outgoingDebts}
                    onEditPayment={setEditingPayment}
                    onDeletePayment={deletePayment}
                    registerPayment={registerPayment}
                  />
                )}
              </section>
            </div>
          </section>
        </div>
      </div>
      <MobileNav activeView={activeView} setActiveView={setActiveView} items={currentNavItems} />
      {showCreateMonimon && (
        <CreateMonimonModal
          activeUser={activeUser}
          appUsers={appUsers}
          setMembers={setMembers}
          monimons={monimons}
          replaceMonimons={replaceMonimons}
          setSelectedMonimonId={setSelectedMonimonId}
          onClose={() => setShowCreateMonimon(false)}
        />
      )}
      {editingMonimonId && (
        <CreateMonimonModal
          activeUser={activeUser}
          appUsers={appUsers}
          setMembers={setMembers}
          monimon={monimons.find((item) => item.id === editingMonimonId)}
          monimons={monimons}
          replaceMonimons={replaceMonimons}
          setSelectedMonimonId={setSelectedMonimonId}
          onDeleteMonimon={deleteMonimon}
          onClose={() => setEditingMonimonId(null)}
        />
      )}
      {editingDebt && (
        <EditDebtModal
          activeUser={activeUser}
          appUsers={appUsers}
          selectedMonimon={selectedMonimon}
          selectedMonimonId={selectedMonimonId}
          debt={editingDebt}
          onClose={() => setEditingDebt(null)}
          onSave={saveEditedDebt}
        />
      )}
      {editingPayment && (
        <EditAmountModal
          title="Editar pago"
          item={editingPayment}
          nameKey="detail"
          onClose={() => setEditingPayment(null)}
          onSave={saveEditedPayment}
        />
      )}
      {showNewDebt && (
        <DebtModal
          activeUser={activeUser}
          appUsers={appUsers}
          selectedMonimon={selectedMonimon}
          selectedMonimonId={selectedMonimonId}
          title={activeView === "prestamos" ? "Nuevo préstamo" : "Nuevo gasto"}
          registerDebt={registerDebt}
          onClose={() => setShowNewDebt(false)}
        />
      )}
      {profileModal === "avatar" && (
        <AvatarModal
          activeUser={activeUser}
          updateActiveUser={updateActiveUser}
          onClose={() => setProfileModal(null)}
        />
      )}
      {profileModal === "settings" && (
        <SettingsModal
          activeUser={activeUser}
          updateActiveUser={updateActiveUser}
          personalSpaceName={personalSpaceName}
          setPersonalSpaceName={setPersonalSpaceName}
          deleteAccount={deleteAccount}
          onClose={() => setProfileModal(null)}
        />
      )}
      {profileModal === "logout" && (
        <ConfirmLogoutModal
          onCancel={() => setProfileModal(null)}
          onConfirm={() => {
            setProfileModal(null);
            logout();
          }}
        />
      )}
    </main>
  );
}

function SummaryHeader({ theyOwe, iOwe }) {
  return (
    <section className="summary-card">
      <div className="summary-top">
        <div>
          <h1>Resumen</h1>
        </div>
      </div>
      <div className="summary-metrics">
        <Metric label="Saldo neto" value={theyOwe - iOwe} />
        <Metric label="Te deben" value={theyOwe} positive />
        <Metric label="Debes" value={iOwe} negative />
      </div>
    </section>
  );
}

function ProfileMenu({ activeUser, setProfileModal, setProfileMenuOpen }) {
  function chooseModal(modal) {
    setProfileMenuOpen(false);
    setProfileModal(modal);
  }

  return (
    <div className="profile-menu">
      <div className="profile-menu-head">
        <Avatar user={activeUser} />
        <div>
          <b>{activeUser.name}</b>
          <small>{activeUser.role === "admin" ? "Admin" : "Usuario activo"}</small>
        </div>
        {activeUser.role === "admin" && <span className="profile-role-badge"><ShieldCheck size={14} /> Admin</span>}
      </div>
      <button type="button" onClick={() => chooseModal("avatar")}><Camera size={17} /> Cambiar avatar</button>
      <button type="button" onClick={() => chooseModal("settings")}><Settings size={17} /> Configuración</button>
      <button type="button" className="danger" onClick={() => chooseModal("logout")}><LogOut size={17} /> Cerrar sesión</button>
    </div>
  );
}

function AvatarModal({ activeUser, updateActiveUser, onClose }) {
  const [selectedSrc, setSelectedSrc] = useState(activeUser.avatarSrc || avatarOptions[0].src);
  const [zoom, setZoom] = useState(activeUser.avatarZoom || avatarCrop.avatarZoom);
  const [offsetX, setOffsetX] = useState(activeUser.avatarX || avatarCrop.avatarX);
  const [offsetY, setOffsetY] = useState(activeUser.avatarY || avatarCrop.avatarY);

  function selectAvatar(src) {
    setSelectedSrc(src);
    setZoom(avatarCrop.avatarZoom);
    setOffsetX(avatarCrop.avatarX);
    setOffsetY(avatarCrop.avatarY);
  }

  function saveAvatar() {
    updateActiveUser({
      avatarSrc: selectedSrc,
      avatarZoom: Number(zoom),
      avatarX: Number(offsetX),
      avatarY: Number(offsetY)
    });
    onClose();
  }

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="avatar-title">
      <div className="create-modal avatar-modal">
        <div className="modal-head">
          <h2 id="avatar-title">Cambiar avatar</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">x</button>
        </div>
        <div className="avatar-editor">
          <div className="avatar-preview-wrap">
            <span className="avatar-preview-frame">
              <img
                src={selectedSrc}
                alt="Previsualización del avatar"
                style={{ transform: `translate(${offsetX}%, ${offsetY}%) scale(${zoom})` }}
              />
            </span>
            <small>Previsualización</small>
          </div>
          <div className="avatar-controls">
            <label>
              Zoom
              <input type="range" min="1" max="2.8" step="0.05" value={zoom} onChange={(event) => setZoom(event.target.value)} />
            </label>
            <label>
              Horizontal
              <input type="range" min="-35" max="35" step="1" value={offsetX} onChange={(event) => setOffsetX(event.target.value)} />
            </label>
            <label>
              Vertical
              <input type="range" min="-35" max="35" step="1" value={offsetY} onChange={(event) => setOffsetY(event.target.value)} />
            </label>
          </div>
        </div>
        <div className="avatar-grid">
          {avatarOptions.map((avatar) => (
            <button
              type="button"
              key={avatar.id}
              className={selectedSrc === avatar.src ? "active" : ""}
              onClick={() => selectAvatar(avatar.src)}
            >
              <img src={avatar.src} alt="Avatar" />
            </button>
          ))}
        </div>
        <button type="button" className="primary-action modal-create-btn" onClick={saveAvatar}>GUARDAR AVATAR</button>
      </div>
    </div>
  );
}

function SettingsModal({ activeUser, updateActiveUser, personalSpaceName, setPersonalSpaceName, deleteAccount, onClose }) {
  const [name, setName] = useState(activeUser.name);
  const [spaceName, setSpaceName] = useState(personalSpaceName);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function saveSettings() {
    const cleanName = name.trim().slice(0, 24);
    if (!cleanName) {
      setError("Ingresá un nombre.");
      return;
    }
    updateActiveUser({ name: cleanName.toUpperCase() });
    setPersonalSpaceName((spaceName.trim() || "PERSONAL").slice(0, 32).toUpperCase());
    onClose();
  }

  async function confirmDeleteAccount() {
    const confirmed = window.confirm("Esta acción elimina tu cuenta de acceso. ¿Querés continuar?");
    if (!confirmed) return;
    setDeleting(true);
    setError("");
    try {
      await deleteAccount();
    } catch (deleteError) {
      setError(deleteError.message || "No se pudo eliminar la cuenta.");
      setDeleting(false);
    }
  }

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="create-modal settings-modal">
        <div className="modal-head">
          <h2 id="settings-title">Configuración</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">x</button>
        </div>
        <label>Nombre de usuario</label>
        <input value={name} maxLength={24} onChange={(event) => setName(event.target.value)} />
        <label>Nombre del espacio personal</label>
        <input value={spaceName} maxLength={32} onChange={(event) => setSpaceName(event.target.value.toUpperCase())} placeholder="PERSONAL" />
        {error && <p className="form-error">{error}</p>}
        <button type="button" className="primary-action modal-create-btn" onClick={saveSettings}>GUARDAR</button>
        <section className="sensitive-zone" aria-labelledby="sensitive-zone-title">
          <div>
            <span className="sensitive-icon"><ShieldAlert size={17} /></span>
            <div>
              <h3 id="sensitive-zone-title">Cuenta y acceso</h3>
              <p>{activeUser.email}</p>
            </div>
          </div>
          <div className="settings-secondary-actions">
            <button type="button" disabled>Cambiar correo</button>
            <button type="button" disabled>Cambiar contraseña</button>
          </div>
          <button type="button" className="delete-account-btn" onClick={confirmDeleteAccount} disabled={deleting}>
            <Trash2 size={16} /> {deleting ? "ELIMINANDO" : "ELIMINAR CUENTA"}
          </button>
        </section>
      </div>
    </div>
  );
}

function ConfirmLogoutModal({ onCancel, onConfirm }) {
  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="logout-title">
      <div className="create-modal confirm-modal">
        <div className="modal-head">
          <h2 id="logout-title">Cerrar sesión</h2>
          <button type="button" onClick={onCancel} aria-label="Cerrar">x</button>
        </div>
        <p>¿Seguro que deseás salir?</p>
        <div className="confirm-actions">
          <button type="button" onClick={onCancel}>Cancelar</button>
          <button type="button" className="primary-action" onClick={onConfirm}>Cerrar sesión</button>
        </div>
      </div>
    </div>
  );
}

function ArchivePanel({ files, setFiles }) {
  const [dragging, setDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  function addFiles(fileList) {
    const imageFiles = [...fileList].filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length) return;
    const nextFiles = imageFiles.map((file) => ({
      id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
      createdAt: formatISODate(todayISO())
    }));
    setFiles((items) => [...nextFiles, ...items]);
  }

  function deleteFile(fileId) {
    setFiles((items) => {
      const fileToDelete = items.find((item) => item.id === fileId);
      if (fileToDelete) URL.revokeObjectURL(fileToDelete.url);
      return items.filter((item) => item.id !== fileId);
    });
    setPreviewFile((file) => (file?.id === fileId ? null : file));
  }

  return (
    <>
      <PanelTitle icon={<Archive size={18} />} title="Archivo" />
      <label
        className={`archive-dropzone ${dragging ? "dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(event.dataTransfer.files);
        }}
      >
        <Upload size={26} />
        <strong>Arrastrá una imagen o seleccioná desde tu dispositivo</strong>
        <span>Fotos de tickets, facturas o comprobantes.</span>
        <input type="file" accept="image/*" multiple onChange={(event) => addFiles(event.target.files)} />
      </label>
      <div className="archive-grid">
        {files.length ? (
          files.map((file) => (
            <article key={file.id} className="archive-card">
              <button type="button" className="archive-open" onClick={() => setPreviewFile(file)} aria-label={`Abrir ${file.name}`}>
                <img src={file.url} alt={file.name} />
                <span><Maximize2 size={16} /></span>
              </button>
              <div className="archive-card-meta">
                <b>{file.name}</b>
                <button type="button" className="archive-delete" onClick={() => deleteFile(file.id)}>
                  <Trash2 size={14} /> Eliminar
                </button>
                <small>{file.createdAt} · {(file.size / 1024).toFixed(0)} KB</small>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state archive-empty"><ImageIcon size={20} /> Todavía no hay imágenes archivadas.</div>
        )}
      </div>
      {previewFile && (
        <ArchivePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onDelete={() => deleteFile(previewFile.id)}
        />
      )}
    </>
  );
}

function ArchivePreviewModal({ file, onClose, onDelete }) {
  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="archive-preview-title">
      <div className="create-modal archive-preview-modal">
        <div className="modal-head">
          <div>
            <h2 id="archive-preview-title">{file.name}</h2>
            <small>{file.createdAt} · {(file.size / 1024).toFixed(0)} KB</small>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar">x</button>
        </div>
        <img className="archive-preview-image" src={file.url} alt={file.name} />
        <div className="archive-preview-actions">
          <button type="button" className="archive-delete large" onClick={onDelete}>
            <Trash2 size={16} /> Eliminar imagen
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateMonimonModal({ activeUser, appUsers, setMembers, monimon, monimons, replaceMonimons, setSelectedMonimonId, onDeleteMonimon, onClose }) {
  const [monimonName, setMonimonName] = useState(monimon?.name || "");
  const [memberIds, setMemberIds] = useState(monimon?.members || [activeUser.id]);
  const [ghostName, setGhostName] = useState("");
  const [error, setError] = useState("");
  const availableUsers = appUsers.filter((user) => !memberIds.includes(user.id));
  const isEditing = Boolean(monimon);

  function addMember() {
    if (!availableUsers.length) return;
    setMemberIds((items) => [...items, availableUsers[0].id]);
  }

  function removeMember(indexToRemove) {
    const memberId = memberIds[indexToRemove];
    const memberName = appUsers.find((user) => user.id === memberId)?.name || "este integrante";
    if (isEditing) {
      const confirmed = window.confirm(
        `Quitar a ${memberName} del moni mon?\n\nSus movimientos y registros se conservan, pero dejará de aparecer como integrante activo. Si era una persona fantasma, vuelve a quedar como referencia histórica.`
      );
      if (!confirmed) return;
    }
    setMemberIds((items) => items.filter((_, index) => index !== indexToRemove));
  }

  function addGhostMember() {
    const cleanName = ghostName.trim().slice(0, 40);
    if (!cleanName) {
      setError("Ingresá un nombre para la persona fantasma.");
      return;
    }
    const id = `ghost-${Date.now()}`;
    setMembers((items) => [
      {
        id,
        profileId: null,
        displayName: cleanName.toUpperCase(),
        status: "ghost",
        createdByProfileId: activeUser.id
      },
      ...items
    ]);
    setMemberIds((items) => [...items, id]);
    setGhostName("");
    setError("");
  }

  function saveMonimon() {
    const cleanName = monimonName.trim();
    if (!cleanName) {
      setError("Ingresá un nombre para el moni mon!.");
      return;
    }
    if (memberIds.length < 2) {
      setError("Agregá al menos otro integrante.");
      return;
    }
    const cleanMembers = [...new Set(memberIds)];
    if (cleanMembers.length !== memberIds.length) {
      setError("No repitas integrantes.");
      return;
    }
    if (isEditing) {
      replaceMonimons(monimons.map((item) => (item.id === monimon.id ? { ...item, name: cleanName, members: cleanMembers } : item)));
      setSelectedMonimonId(monimon.id);
      onClose();
      return;
    }
    const id = `monimon-${Date.now()}`;
    replaceMonimons([...monimons, { id, name: cleanName, members: cleanMembers }]);
    setSelectedMonimonId(id);
    onClose();
  }

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="create-monimon-title">
      <div className="create-modal">
        <div className="modal-head">
          <h2 id="create-monimon-title">{isEditing ? "Editar Mon!" : "Crear Mon!"}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <label>NOMBRE DE MON!:</label>
        <input value={monimonName} maxLength={50} onChange={(event) => setMonimonName(event.target.value.slice(0, 50))} placeholder="Ej: Viaje" />
        <label>INTEGRANTES:</label>
        <div className="member-list">
          {memberIds.map((memberId, index) => (
            <div className="member-row" key={`${memberId}-${index}`}>
              <select
                value={memberId}
                onChange={(event) => {
                  const next = [...memberIds];
                  next[index] = event.target.value;
                  setMemberIds(next);
                }}
              >
                {appUsers.map((user) => (
                  <option key={user.id} value={user.id} disabled={memberIds.includes(user.id) && user.id !== memberId}>
                    {user.name}
                  </option>
                ))}
              </select>
              {memberIds.length > 1 && (
                <button type="button" className="member-remove" onClick={() => removeMember(index)} aria-label="Eliminar integrante">
                  <X size={17} />
                </button>
              )}
            </div>
          ))}
          <div className="member-list-actions">
            <button type="button" className="member-add" onClick={addMember} disabled={!availableUsers.length}>
              <Plus size={18} /> Agregar integrante
            </button>
          </div>
        </div>
        <label>INTEGRANTE NO REGISTRADO:</label>
        <div className="member-row ghost-member-row">
          <input value={ghostName} maxLength={40} onChange={(event) => setGhostName(event.target.value)} placeholder="Nombre provisorio" />
          <button type="button" className="member-add" onClick={addGhostMember} aria-label="Agregar persona fantasma">
            <Plus size={18} />
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="monimon-modal-actions">
          <button type="button" className="primary-action modal-create-btn" onClick={saveMonimon}>
            {isEditing ? "ACTUALIZAR CAMBIOS" : "CREAR MONI MON!"}
          </button>
        </div>
        {isEditing && (
          <div className="delete-monimon-zone">
            <button type="button" className="delete-monimon-btn" onClick={() => onDeleteMonimon?.(monimon)}>
              <Trash2 size={16} /> Eliminar Mon!
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DebtPanel({ appUsers, incomingDebts, outgoingDebts, selectedDebtIds, setSelectedDebtIds, isMonimonMode, preview, title, action, onNewDebt, onEditDebt, onDeleteDebt }) {
  return (
    <section className="glass-card panel">
      <PanelTitle icon={<ListChecks size={18} />} title={title || (isMonimonMode ? "Gastos" : "Mis gastos")} action={preview ? null : action || "Nuevo gasto"} onAction={onNewDebt} />
      <div className={`split-list ${preview ? "preview" : ""}`}>
        <DebtGroup
          title="Te deben"
          tone="positive"
          debts={preview ? incomingDebts.slice(0, 3) : incomingDebts}
          selectable
          selectedDebtIds={selectedDebtIds}
          setSelectedDebtIds={setSelectedDebtIds}
          onEditDebt={onEditDebt}
          onDeleteDebt={onDeleteDebt}
          appUsers={appUsers}
        />
        <DebtGroup title="Debes" tone="negative" debts={preview ? outgoingDebts.slice(0, 2) : outgoingDebts} onEditDebt={onEditDebt} onDeleteDebt={onDeleteDebt} appUsers={appUsers} />
      </div>
    </section>
  );
}

function PaymentPanel({
  activeUser,
  appUsers,
  selectedMonimon,
  debts,
  selectedDebtIds,
  setSelectedDebtIds,
  selectedTotal,
  manualAmount,
  setManualAmount,
  paymentCurrency,
  setPaymentCurrency,
  paymentReason,
  setPaymentReason,
  paymentDate,
  setPaymentDate,
  paymentError,
  setPaymentError,
  showNewPayment,
  setShowNewPayment,
  selectedMonimonId,
  payments,
  pendingDebts,
  onEditPayment,
  onDeletePayment,
  registerPayment,
  compact
}) {
  const monimonMemberOptions = selectedMonimon ? selectedMonimon.members.map((id) => appUsers.find((user) => user.id === id)).filter(Boolean) : appUsers;
  const monimonMemberKey = selectedMonimon?.members.join("|") || "personal";
  const otherUser = monimonMemberOptions.find((user) => user.id !== activeUser.id) || appUsers.find((user) => user.id !== activeUser.id);
  const isMonimonMode = selectedMonimonId !== "personal";
  const allowGroupTarget = monimonMemberOptions.length > 2;
  const [fromId, setFromId] = useState(activeUser.id);
  const [toId, setToId] = useState(groupTargetId(activeUser, monimonMemberOptions, isMonimonMode));
  const [paymentMode, setPaymentMode] = useState("total");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(paymentDate.slice(0, 7));
  const pendingTotal = pendingDebts.reduce((sum, debt) => sum + debtShareFor(debt, activeUser.id, monimonMemberOptions), 0);
  const paymentPreviewTotal = paymentMode === "total" ? selectedTotal || pendingTotal : parseAmountInput(manualAmount);
  const displayedAmountInput = paymentMode === "total" ? formatAmountInput(String(Math.round(paymentPreviewTotal * 100))) : manualAmount;

  useEffect(() => {
    const nextFrom = monimonMemberOptions.some((user) => user.id === activeUser.id) ? activeUser.id : monimonMemberOptions[0]?.id;
    const nextTo = isMonimonMode && allowGroupTarget ? "group" : monimonMemberOptions.find((user) => user.id !== nextFrom)?.id || monimonMemberOptions[0]?.id;
    setFromId(nextFrom);
    setToId(nextTo);
  }, [activeUser.id, selectedMonimonId, monimonMemberKey, allowGroupTarget]);

  function cancelPayment() {
    const nextFrom = monimonMemberOptions.some((user) => user.id === activeUser.id) ? activeUser.id : monimonMemberOptions[0]?.id;
    const nextTo = isMonimonMode && allowGroupTarget ? "group" : monimonMemberOptions.find((user) => user.id !== nextFrom)?.id || monimonMemberOptions[0]?.id;
    setFromId(nextFrom);
    setToId(nextTo);
    setPaymentMode("total");
    setSelectedDebtIds([]);
    setManualAmount("");
    setPaymentCurrency("ARS");
    setPaymentReason("");
    setPaymentDate(todayISO());
    setPaymentError("");
    setShowNewPayment(false);
  }

  function savePayment() {
    const manualValue = parseAmountInput(manualAmount);
    const selectedValue = paymentMode === "total" ? selectedTotal || pendingTotal : 0;
    if (!paymentDate) {
      setPaymentError("Elegí una fecha de pago.");
      return;
    }
    if (isMonimonMode && fromId === toId) {
      setPaymentError("De y Para no pueden ser la misma persona.");
      return;
    }
    if (paymentMode === "partial" && manualValue <= 0) {
      setPaymentError("Ingresá un importe o seleccioná un gasto.");
      return;
    }
    if (paymentMode === "total" && selectedValue <= 0) {
      setPaymentError("No hay deuda pendiente para pagar.");
      return;
    }
    const saved = registerPayment({
      fromId: isMonimonMode ? fromId : activeUser.id,
      toId: isMonimonMode ? toId : otherUser.id,
      debtIds: paymentMode === "total" ? pendingDebts.map((debt) => debt.id) : selectedDebtIds,
      amountOverride: paymentMode === "total" ? pendingTotal : null
    });
    if (!saved) {
      setPaymentError("Revisá el formulario antes de guardar.");
      return;
    }
    setShowNewPayment(false);
  }

  return (
    <section className={`glass-card panel ${compact ? "compact-panel" : ""}`}>
      <PanelTitle icon={<ReceiptText size={18} />} title="Pagos" action="Nuevo pago" onAction={() => setShowNewPayment(true)} />
      <div className="debt-payment-summary">
        <span>Deuda total</span>
        <b>{money(pendingTotal)}</b>
      </div>
      {showNewPayment && (
        <div className="modal-layer payment-modal-layer" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
          <div className="create-modal form-modal">
            <div className="modal-head">
              <h2 id="payment-modal-title">Nuevo pago</h2>
              <button type="button" onClick={cancelPayment} aria-label="Cerrar">x</button>
            </div>
            <div className="new-payment-box">
          <label>Fecha de pago</label>
          <div className="date-input">
            <button
              type="button"
              className="calendar-button"
              onClick={() => {
                setCalendarMonth((paymentDate || todayISO()).slice(0, 7));
                setCalendarOpen((open) => !open);
              }}
              aria-label="Elegir fecha"
            >
              <CalendarDays size={18} />
            </button>
            <input value={formatISODate(paymentDate)} readOnly aria-label="Fecha de pago" />
            {calendarOpen && (
              <CalendarPopover
                month={calendarMonth}
                selectedDate={paymentDate}
                setMonth={setCalendarMonth}
                onSelect={(date) => {
                  setPaymentDate(date);
                  setCalendarOpen(false);
                }}
              />
            )}
          </div>
          {isMonimonMode && (
            <div className="payment-direction with-swap">
              <label>
                <span>De</span>
                <select value={fromId} onChange={(event) => setFromId(event.target.value)}>
                  {monimonMemberOptions.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
              </label>
              <button type="button" className="swap-users-btn" onClick={() => { setFromId(toId === "group" ? fromId : toId); setToId(fromId); }} aria-label="Invertir usuarios">
                <ArrowLeftRight size={17} />
              </button>
              <label>
                <span>Para</span>
                <select value={toId} onChange={(event) => setToId(event.target.value)}>
                  {allowGroupTarget && <option value="group">GRUPO</option>}
                  {monimonMemberOptions.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
              </label>
            </div>
          )}
          <label>Motivo</label>
          <input value={paymentReason} maxLength={50} onChange={(event) => setPaymentReason(event.target.value.slice(0, 50))} placeholder="General" />
          <div className="payment-mode">
            <label>
              <input
                type="radio"
                checked={paymentMode === "total"}
                onChange={() => {
                  setPaymentMode("total");
                  setSelectedDebtIds(pendingDebts.map((debt) => debt.id));
                  setManualAmount("");
                }}
              />
              Pago total
            </label>
            <label>
              <input
                type="radio"
                checked={paymentMode === "partial"}
                onChange={() => {
                  setPaymentMode("partial");
                  setSelectedDebtIds([]);
                  setManualAmount("");
                }}
              />
              Pago parcial
            </label>
          </div>
          <label>Importe</label>
          <div className="money-input">
            <select aria-label="Moneda" value={paymentCurrency} onChange={(event) => setPaymentCurrency(event.target.value)}>
              <option>ARS</option>
              <option>USD</option>
            </select>
            <input
              value={displayedAmountInput}
              inputMode="decimal"
              onChange={(event) => setManualAmount(formatAmountInput(event.target.value))}
              disabled={paymentMode === "total"}
              placeholder="$0,00"
            />
          </div>
          {paymentError && <p className="form-error payment-error">{paymentError}</p>}
          <div className="payment-modal-actions">
            <button type="button" className="secondary-action cancel-payment" onClick={cancelPayment}>Cancelar</button>
            <button type="button" onClick={savePayment} className="primary-action save-payment">Enviar solicitud</button>
          </div>
            </div>
          </div>
        </div>
      )}
      <DebtGroup
        title="Pagos pendientes"
        tone="positive"
        debts={pendingDebts}
        selectable
        selectedDebtIds={selectedDebtIds}
        setSelectedDebtIds={setSelectedDebtIds}
        appUsers={monimonMemberOptions}
      />
      {payments.length > 0 && <PaymentRows payments={payments} onEditPayment={onEditPayment} onDeletePayment={onDeletePayment} />}
      <div className="payment-total">
        <span>Pago total a registrar</span>
        <b>{money(paymentPreviewTotal, paymentCurrency)}</b>
      </div>
    </section>
  );
}

function DebtModal({ activeUser, appUsers, selectedMonimon, selectedMonimonId, title: modalTitle = "Nuevo gasto", registerDebt, onClose }) {
  const monimonMemberOptions = selectedMonimon ? selectedMonimon.members.map((id) => appUsers.find((user) => user.id === id)).filter(Boolean) : appUsers;
  const otherUser = monimonMemberOptions.find((user) => user.id !== activeUser.id) || appUsers.find((user) => user.id !== activeUser.id);
  const isMonimonMode = selectedMonimonId !== "personal";
  const allowGroupTarget = monimonMemberOptions.length > 2;
  const [fromId, setFromId] = useState(activeUser.id);
  const [toId, setToId] = useState(groupTargetId(activeUser, monimonMemberOptions, isMonimonMode));
  const [title, setTitle] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [currency, setCurrency] = useState("ARS");
  const [date, setDate] = useState(todayISO());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(todayISO().slice(0, 7));
  const [error, setError] = useState("");

  function saveDebt() {
    if (isMonimonMode && fromId === toId) {
      setError("De y Para no pueden ser la misma persona.");
      return;
    }
    const saved = registerDebt({
      fromId: isMonimonMode ? fromId : otherUser.id,
      toId: isMonimonMode ? toId : activeUser.id,
      title: title || "General",
      amount: parseAmountInput(amountInput),
      currency,
      date
    });
    if (!saved) setError("Completá el motivo y el importe.");
  }

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="debt-modal-title">
      <div className="create-modal form-modal">
        <div className="modal-head">
          <h2 id="debt-modal-title">{modalTitle}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">x</button>
        </div>
        <div className="new-payment-box">
          <label>Fecha de gasto</label>
          <div className="date-input">
            <button
              type="button"
              className="calendar-button"
              onClick={() => {
                setCalendarMonth((date || todayISO()).slice(0, 7));
                setCalendarOpen((open) => !open);
              }}
              aria-label="Elegir fecha"
            >
              <CalendarDays size={18} />
            </button>
            <input value={formatISODate(date)} readOnly aria-label="Fecha de gasto" />
            {calendarOpen && (
              <CalendarPopover
                month={calendarMonth}
                selectedDate={date}
                setMonth={setCalendarMonth}
                onSelect={(nextDate) => {
                  setDate(nextDate);
                  setCalendarOpen(false);
                }}
              />
            )}
          </div>
          {isMonimonMode && (
            <div className="payment-direction with-swap">
              <label>
                <span>De</span>
                <select value={fromId} onChange={(event) => setFromId(event.target.value)}>
                  {monimonMemberOptions.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
              </label>
              <button type="button" className="swap-users-btn" onClick={() => { setFromId(toId === "group" ? fromId : toId); setToId(fromId); }} aria-label="Invertir usuarios">
                <ArrowLeftRight size={17} />
              </button>
              <label>
                <span>Para</span>
                <select value={toId} onChange={(event) => setToId(event.target.value)}>
                  {allowGroupTarget && <option value="group">GRUPO</option>}
                  {monimonMemberOptions.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
              </label>
            </div>
          )}
          <label>Motivo</label>
          <input value={title} maxLength={50} onChange={(event) => setTitle(event.target.value.slice(0, 50))} placeholder="General" />
          <label>Importe</label>
          <div className="money-input">
            <select aria-label="Moneda" value={currency} onChange={(event) => setCurrency(event.target.value)}>
              <option>ARS</option>
              <option>USD</option>
            </select>
            <input
              value={amountInput}
              inputMode="decimal"
              onChange={(event) => setAmountInput(formatAmountInput(event.target.value))}
              placeholder="$0,00"
            />
          </div>
          {error && <p className="form-error payment-error">{error}</p>}
          <button type="button" onClick={saveDebt} className="primary-action save-payment save-debt">Guardar gasto</button>
        </div>
      </div>
    </div>
  );
}

function EditAmountModal({ title, item, nameKey, onClose, onSave }) {
  const [name, setName] = useState(item[nameKey] || "");
  const [amount, setAmount] = useState(formatAmountInput(String(Math.round((item.amount || 0) * 100))));
  const [error, setError] = useState("");

  function save() {
    if (!name.trim() || parseAmountInput(amount) <= 0) {
      setError("Completá el motivo y el importe.");
      return;
    }
    onSave({ id: item.id, [nameKey]: name, amount });
  }

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="edit-amount-title">
      <div className="create-modal form-modal">
        <div className="modal-head">
          <h2 id="edit-amount-title">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">x</button>
        </div>
        <div className="new-payment-box">
          <label>Motivo</label>
          <input value={name} maxLength={50} onChange={(event) => setName(event.target.value.slice(0, 50))} />
          <label>Importe</label>
          <div className="money-input">
            <select aria-label="Moneda" value={item.currency || "ARS"} disabled>
              <option>ARS</option>
              <option>USD</option>
            </select>
            <input value={amount} inputMode="decimal" onChange={(event) => setAmount(formatAmountInput(event.target.value))} />
          </div>
          {error && <p className="form-error payment-error">{error}</p>}
          <button type="button" onClick={save} className="primary-action save-payment">Guardar</button>
        </div>
      </div>
    </div>
  );
}

function EditDebtModal({ activeUser, appUsers, selectedMonimon, selectedMonimonId, debt, onClose, onSave }) {
  const monimonMemberOptions = selectedMonimon ? selectedMonimon.members.map((id) => appUsers.find((user) => user.id === id)).filter(Boolean) : appUsers;
  const isMonimonMode = selectedMonimonId !== "personal";
  const allowGroupTarget = monimonMemberOptions.length > 2;
  const otherUser = monimonMemberOptions.find((user) => user.id !== activeUser.id) || appUsers.find((user) => user.id !== activeUser.id);
  const [fromId, setFromId] = useState(debt.fromMemberId || activeUser.id);
  const [toId, setToId] = useState(debt.toMemberId === "group" && !allowGroupTarget ? otherUser?.id : debt.toMemberId || groupTargetId(activeUser, monimonMemberOptions, isMonimonMode));
  const [title, setTitle] = useState(debt.title || "");
  const [currency, setCurrency] = useState(debt.currency || "ARS");
  const [date, setDate] = useState(toISOInputDate(debt.date));
  const [amount, setAmount] = useState(formatAmountInput(String(Math.round((debt.amount || 0) * 100))));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(toISOInputDate(debt.date).slice(0, 7));
  const [error, setError] = useState("");

  function save() {
    if (isMonimonMode && fromId === toId) {
      setError("De y Para no pueden ser la misma persona.");
      return;
    }
    if (!title.trim() || parseAmountInput(amount) <= 0) {
      setError("Completá el motivo y el importe.");
      return;
    }
    onSave({ id: debt.id, title, amount, currency, date: formatISODate(date), fromMemberId: fromId, toMemberId: toId });
  }

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="edit-debt-title">
      <div className="create-modal form-modal">
        <div className="modal-head">
          <h2 id="edit-debt-title">Editar gasto</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">x</button>
        </div>
        <div className="new-payment-box">
          <label>Fecha</label>
          <div className="date-input">
            <button type="button" className="calendar-button" onClick={() => { setCalendarMonth(date.slice(0, 7)); setCalendarOpen((open) => !open); }} aria-label="Elegir fecha">
              <CalendarDays size={18} />
            </button>
            <input value={formatISODate(date)} readOnly aria-label="Fecha" />
            {calendarOpen && (
              <CalendarPopover
                month={calendarMonth}
                selectedDate={date}
                setMonth={setCalendarMonth}
                onSelect={(nextDate) => {
                  setDate(nextDate);
                  setCalendarOpen(false);
                }}
              />
            )}
          </div>
          {isMonimonMode && (
            <div className="payment-direction with-swap">
              <label>
                <span>De</span>
                <select value={fromId} onChange={(event) => setFromId(event.target.value)}>
                  {monimonMemberOptions.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
              </label>
              <button type="button" className="swap-users-btn" onClick={() => { setFromId(toId === "group" ? fromId : toId); setToId(fromId); }} aria-label="Invertir usuarios">
                <ArrowLeftRight size={17} />
              </button>
              <label>
                <span>Para</span>
                <select value={toId} onChange={(event) => setToId(event.target.value)}>
                  {allowGroupTarget && <option value="group">GRUPO</option>}
                  {monimonMemberOptions.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
              </label>
            </div>
          )}
          <label>Motivo</label>
          <input value={title} maxLength={50} onChange={(event) => setTitle(event.target.value.slice(0, 50))} />
          <label>Importe</label>
          <div className="money-input">
            <select aria-label="Moneda" value={currency} onChange={(event) => setCurrency(event.target.value)}>
              <option>ARS</option>
              <option>USD</option>
            </select>
            <input value={amount} inputMode="decimal" onChange={(event) => setAmount(formatAmountInput(event.target.value))} />
          </div>
          {error && <p className="form-error payment-error">{error}</p>}
          <button type="button" onClick={save} className="primary-action save-payment">Guardar</button>
        </div>
      </div>
    </div>
  );
}

function PaymentsPanel({ payments, compact, onEditPayment, onDeletePayment }) {
  return (
    <section className={`glass-card panel ${compact ? "compact-panel" : ""}`}>
      <PanelTitle icon={<History size={18} />} title="Movimientos" />
      <PaymentRows payments={payments} onEditPayment={onEditPayment} onDeletePayment={onDeletePayment} />
    </section>
  );
}

function PaymentRows({ payments, onEditPayment, onDeletePayment }) {
  return (
    <div className="payment-history">
      {payments.length ? (
        payments.map((payment) => (
          <div key={payment.id} className="history-row">
            <span className="history-icon"><ReceiptText size={17} /></span>
            <span className="min-w-0 flex-1">
              <small>{payment.date} - {payment.fromMemberId.toUpperCase()} a {payment.toMemberId?.toUpperCase?.() || "GRUPO"}</small>
              <b>{payment.detail}</b>
              {payment.verifiedByMemberIds?.length && <small>Verificado por ambas partes</small>}
            </span>
            <strong>{money(payment.amount, payment.currency || "ARS")}</strong>
            <RowActions onEdit={() => onEditPayment?.(payment)} onDelete={() => onDeletePayment?.(payment)} />
          </div>
        ))
      ) : (
        <EmptyState text="Todavía no hay movimientos." />
      )}
    </div>
  );
}

function CalendarPopover({ month, selectedDate, setMonth, onSelect }) {
  const weekdays = ["L", "M", "M", "J", "V", "S", "D"];
  return (
    <div className="calendar-popover">
      <div className="calendar-head">
        <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mes anterior">
          <ChevronLeft size={17} />
        </button>
        <strong>{monthLabel(month)}</strong>
        <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Mes siguiente">
          <ChevronRight size={17} />
        </button>
      </div>
      <div className="calendar-grid calendar-weekdays">
        {weekdays.map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="calendar-grid">
        {calendarDays(month).map((date, index) => (
          date ? (
            <button
              type="button"
              key={date}
              className={date === selectedDate ? "active" : ""}
              onClick={() => onSelect(date)}
            >
              {Number(date.slice(-2))}
            </button>
          ) : (
            <span key={`blank-${index}`} />
          )
        ))}
      </div>
    </div>
  );
}

function userLabel(userId, appUsers) {
  if (userId === "group") return "GRUPO";
  return appUsers.find((user) => user.id === userId)?.name || userId?.toUpperCase?.() || "Usuario";
}

function RequestsPanel({ requests, activeUser, appUsers, approvePaymentRequest, rejectPaymentRequest }) {
  const orderedRequests = [...requests].sort((a, b) => {
    const statusRank = { pending: 0, rejected: 1, approved: 2 };
    return (statusRank[a.status] ?? 3) - (statusRank[b.status] ?? 3);
  });

  if (!orderedRequests.length) {
    return <EmptyState text="Todavía no hay solicitudes." />;
  }

  return (
    <div className="request-list">
      {orderedRequests.map((request) => {
        const approvedByMemberIds = request.approvedByMemberIds || [];
        const waitingIds = (request.requiredApproverMemberIds || []).filter((id) => !approvedByMemberIds.includes(id));
        const canApprove = request.status === "pending" && waitingIds.includes(activeUser.id);
        const canReject = request.status === "pending" && (request.requiredApproverMemberIds || []).includes(activeUser.id);
        const requester = userLabel(request.requestedByMemberId, appUsers);
        const waitingNames = waitingIds.map((id) => userLabel(id, appUsers)).join(", ");
        const statusText = request.status === "approved"
          ? "Verificado"
          : request.status === "rejected"
            ? `Rechazado por ${userLabel(request.rejectedByMemberId, appUsers)}`
            : waitingNames
              ? `Falta OK de ${waitingNames}`
              : "Listo para verificar";

        return (
          <article key={request.id} className={`request-card ${request.status}`}>
            <div className="request-main">
              <span className="history-icon"><ReceiptText size={17} /></span>
              <span className="request-copy min-w-0 flex-1">
                <b>{userLabel(request.fromMemberId, appUsers)} pagó a {userLabel(request.toMemberId, appUsers)}</b>
                <small>{requester} solicitó · {request.date}</small>
                <small>{request.detail}</small>
                <small className="request-status-text">{statusText}</small>
              </span>
              <strong>{money(request.amount, request.currency || "ARS")}</strong>
            </div>
            {canApprove && (
              <div className="request-actions">
                <button type="button" className="request-reject" onClick={() => rejectPaymentRequest(request.id)}>
                  <X size={15} /> Rechazar
                </button>
                <button type="button" className="request-approve" onClick={() => approvePaymentRequest(request.id)}>
                  <Check size={15} /> Dar OK
                </button>
              </div>
            )}
            {!canApprove && canReject && (
              <div className="request-actions">
                <button type="button" className="request-reject" onClick={() => rejectPaymentRequest(request.id)}>
                  <X size={15} /> Rechazar
                </button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function DebtGroup({ title, tone, debts, selectable, selectedDebtIds, setSelectedDebtIds, appUsers }) {
  const total = debts.reduce((sum, debt) => sum + debt.amount, 0);
  return (
    <div>
      <div className="group-heading">
        <span className={tone}>{title}</span>
        <b className={tone}>{money(total)}</b>
      </div>
      <div className="debt-list">
        {debts.length ? (
          debts.map((debt) => (
            <DebtRow
              key={debt.id}
              debt={debt}
              selectable={selectable}
              checked={selectedDebtIds?.includes(debt.id)}
              onToggle={() => setSelectedDebtIds?.((items) => toggle(items, debt.id))}
              members={appUsers || []}
            />
          ))
        ) : (
          <EmptyState text="Todavía no hay registros." />
        )}
      </div>
    </div>
  );
}

function DebtRow({ debt, selectable, checked, onToggle, members }) {
  const counterparty = debtCounterpartyParts(debt, members);
  const splitAmount = members.length > 1 ? debt.amount / members.length : null;
  return (
    <div role={selectable ? "button" : undefined} tabIndex={selectable ? 0 : undefined} onClick={onToggle} className="debt-row">
      <span className="min-w-0 flex-1">
        <span className="debt-title-line">
          {selectable && <span className={`check ${checked ? "active" : ""}`}>{checked && <Check size={13} />}</span>}
          <b>{debt.title}</b>
        </span>
        <span className="debt-line">
          <small>{debt.date}</small>
          <strong><span>IMPORTE TOTAL</span> {money(debt.amount)}</strong>
        </span>
        <span className="debt-line">
          <small className="counterparty-line">De <span>{counterparty.fromName}</span> para <span>{counterparty.toName}</span></small>
          {splitAmount && <small className="debt-share"><span>TU PAGO</span> {money(splitAmount)}</small>}
        </span>
      </span>
    </div>
  );
}

function RowActions({ onEdit, onDelete }) {
  if (!onEdit && !onDelete) return null;
  return (
    <span className="row-actions">
      {onEdit && (
        <button type="button" onClick={(event) => { event.stopPropagation(); onEdit(); }} aria-label="Editar">
          <Pencil size={15} />
        </button>
      )}
      {onDelete && (
        <button type="button" onClick={(event) => { event.stopPropagation(); onDelete(); }} aria-label="Eliminar">
          <Trash2 size={15} />
        </button>
      )}
    </span>
  );
}

function Metric({ label, value, positive, negative }) {
  return (
    <div className={`metric ${positive ? "positive" : ""} ${negative ? "negative" : ""}`}>
      <p>{label}</p>
      <b>{money(value)}</b>
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="empty-state">{text}</div>;
}

function PanelTitle({ icon, title, action, onAction }) {
  return (
    <div className="panel-title">
      <span>{icon}{title}</span>
      {action && <button type="button" onClick={onAction}><Plus size={15} /> {action}</button>}
    </div>
  );
}

function NavButton({ item, active, setActiveView }) {
  const Icon = item.icon;
  return (
    <button onClick={() => setActiveView(item.id)} className={`nav-btn ${active ? "active" : ""}`}>
      <Icon size={18} />
      {item.label}
    </button>
  );
}

function MobileNav({ activeView, setActiveView, items }) {
  return (
    <nav className="mobile-nav">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button key={item.id} onClick={() => setActiveView(item.id)} className={activeView === item.id ? "active" : ""}>
            <Icon size={18} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function Avatar({ user }) {
  if (user.avatarSrc) {
    const zoom = user.avatarZoom ?? avatarCrop.avatarZoom;
    const offsetX = user.avatarX ?? avatarCrop.avatarX;
    const offsetY = user.avatarY ?? avatarCrop.avatarY;

    return (
      <span className="avatar avatar-image" aria-label={`${user.name} avatar`}>
        <img
          src={user.avatarSrc}
          alt=""
          style={{ transform: `translate(${offsetX}%, ${offsetY}%) scale(${zoom})` }}
        />
      </span>
    );
  }

  return (
    <span className={`avatar avatar-${user.avatar}`} aria-label={`${user.name} avatar`}>
      <span className="face-ear left" />
      <span className="face-ear right" />
      <span className="face-eye left" />
      <span className="face-eye right" />
      <span className="face-nose" />
      <span className="face-mouth" />
    </span>
  );
}

function toggle(items, id) {
  return items.includes(id) ? items.filter((item) => item !== id) : [...items, id];
}

createRoot(document.getElementById("root")).render(<App />);
