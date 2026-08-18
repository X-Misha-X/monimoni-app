import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import {
  Archive,
  ArrowLeftRight,
  Bell,
  BookUser,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Camera,
  Eye,
  EyeOff,
  FileText,
  Home,
  Image as ImageIcon,
  ListChecks,
  LockKeyhole,
  LogOut,
  Mail,
  Maximize2,
  MapPin,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  ReceiptText,
  History,
  Search,
  Share2,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Upload,
  UserRound,
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

const initialContacts = [];

const appThemes = [
  { id: "cocoa", name: "Cacao" },
  { id: "botanical", name: "Botanico" },
  { id: "rust-blue", name: "Oxido azul" },
  { id: "ice-cream", name: "Helado" },
  { id: "espresso", name: "Espresso" },
  { id: "blossom", name: "Blossom" },
  { id: "dawn", name: "Amanecer" },
  { id: "mulberry", name: "Mulberry" },
  { id: "sakura", name: "Sakura" },
  { id: "coral-viridian", name: "Coral" },
  { id: "burgundy-blue", name: "Burgundy" },
  { id: "frost", name: "Frost" },
  { id: "gelato", name: "Gelato" },
  { id: "cherry", name: "Cherry" },
  { id: "soft-blush", name: "Blush" },
  { id: "milk-tea", name: "Milk Tea" },
  { id: "dessert", name: "Postre" },
  { id: "succulent", name: "Suculenta" }
];

const defaultAppTheme = appThemes[0].id;

function buildCountryOptions() {
  if (!("Intl" in window) || typeof Intl.DisplayNames !== "function") return [];
  const regionNames = new Intl.DisplayNames(["es"], { type: "region" });
  const codes = [];
  for (let first = 65; first <= 90; first += 1) {
    for (let second = 65; second <= 90; second += 1) {
      const code = String.fromCharCode(first, second);
      const name = regionNames.of(code);
      if (name && name !== code) {
        codes.push({ code, name });
      }
    }
  }
  return codes.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

const countryOptions = buildCountryOptions();

const navItems = [
  { id: "resumen", label: "Resumen", icon: Home },
  { id: "gastos", label: "Gastos", icon: ListChecks },
  { id: "pago", label: "Liquidaciones", icon: ReceiptText },
  { id: "pagos", label: "Historial", icon: History },
  { id: "archivo", label: "Archivo", icon: Archive },
  { id: "solicitudes", label: "Solicitudes", icon: Bell, disabled: true }
];

const groupNavItems = [
  { id: "resumen", label: "Resumen", icon: Home },
  { id: "gastos", label: "Gastos", icon: ListChecks },
  { id: "pago", label: "Liquidaciones", icon: ReceiptText },
  { id: "pagos", label: "Historial", icon: History },
  { id: "archivo", label: "Archivo", icon: Archive },
  { id: "solicitudes", label: "Solicitudes", icon: Bell, disabled: true }
];

const groupIconOptions = [
  { id: "home", label: "Casa", emoji: "🏠" },
  { id: "trip", label: "Viaje", emoji: "✈️" },
  { id: "food", label: "Comidas", emoji: "🍕" },
  { id: "friends", label: "Amigos", emoji: "👯" },
  { id: "event", label: "Evento", emoji: "🎉" },
  { id: "work", label: "Trabajo", emoji: "💼" },
  { id: "love", label: "Pareja", emoji: "💖" },
  { id: "pets", label: "Mascotas", emoji: "🐾" },
  { id: "sports", label: "Deporte", emoji: "⚽" },
  { id: "music", label: "Música", emoji: "🎵" },
  { id: "shopping", label: "Compras", emoji: "🛍️" },
  { id: "party", label: "Salida", emoji: "🍸" }
];

const expenseCategoryOptions = [
  { id: "general", label: "General", emoji: "🧾" },
  { id: "restaurant", label: "Restaurante", emoji: "🍽️" },
  { id: "transport", label: "Transporte", emoji: "🚗" },
  { id: "supermarket", label: "Supermercado", emoji: "🛒" },
  { id: "pharmacy", label: "Farmacia", emoji: "💊" },
  { id: "loan", label: "Préstamo", emoji: "💸" },
  { id: "excursion", label: "Excursión", emoji: "🥾" },
  { id: "stay", label: "Estadía", emoji: "🏨" },
  { id: "fuel", label: "Nafta", emoji: "⛽" },
  { id: "tickets", label: "Entradas", emoji: "🎟️" },
  { id: "shopping", label: "Compras", emoji: "🛍️" },
  { id: "health", label: "Salud", emoji: "🩺" },
  { id: "home", label: "Casa", emoji: "🏠" },
  { id: "gift", label: "Regalos", emoji: "🎁" }
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

function displayDate(value) {
  if (!value) return "Sin fecha";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatISODate(value) : value;
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

function normalizeUsername(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .replace(/[.]{2,}/g, ".")
    .replace(/^[._]+|[._]+$/g, "")
    .slice(0, 24);
}

function usernameFromEmail(email = "") {
  return normalizeUsername(String(email).split("@")[0] || "");
}

function usernameFromProfile(profile = {}) {
  return normalizeUsername(profile.username || profile.userName || profile.email || profile.name || "");
}

function makeUniqueUsername(seed, usedUsernames) {
  const base = normalizeUsername(seed) || "usuario";
  let candidate = base;
  let suffix = 2;
  while (usedUsernames.has(candidate)) {
    candidate = normalizeUsername(`${base}.${suffix}`);
    suffix += 1;
  }
  usedUsernames.add(candidate);
  return candidate;
}

function displayHandle(username) {
  const cleanUsername = normalizeUsername(username);
  return cleanUsername ? `@${cleanUsername}` : "";
}

function profileFromAuthUser(user) {
  const metadata = user?.user_metadata || {};
  const displayName = metadata.display_name || metadata.full_name || metadata.name || user?.email?.split("@")[0] || "Usuario";
  const username = normalizeUsername(metadata.username || metadata.user_name || metadata.preferred_username || usernameFromEmail(user?.email) || displayName);
  return {
    id: user.id,
    name: displayName.toUpperCase(),
    username,
    email: user.email || "",
    role: user.app_metadata?.role || user.user_metadata?.role || "user",
    avatarSrc: metadata.avatar_url || avatarOptions[0].src,
    ...avatarCrop
  };
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const json = decodeURIComponent(
      Array.from(atob(padded))
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function authUserFromAccessToken(accessToken) {
  const payload = decodeJwtPayload(accessToken);
  if (!payload?.sub) return null;
  return {
    id: payload.sub,
    email: payload.email || "",
    app_metadata: payload.app_metadata || {},
    user_metadata: payload.user_metadata || {}
  };
}

function memberFromProfile(profile) {
  return {
    id: profile.id,
    profileId: profile.id,
    displayName: profile.name || profile.email || "USER",
    username: profile.username || usernameFromProfile(profile),
    email: profile.email || "",
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
        category: item.category || (item.kind === "loan" ? "loan" : "general"),
        splitParticipantIds: Array.isArray(item.splitParticipantIds) ? item.splitParticipantIds : [],
        splitMode: item.splitMode || "equal",
        splitAmounts: item.splitAmounts && typeof item.splitAmounts === "object" ? item.splitAmounts : {},
        splitPercentages: item.splitPercentages && typeof item.splitPercentages === "object" ? item.splitPercentages : {},
        amount: Number(item.amount) || 0,
        currency: item.currency || "ARS",
        date: item.date || formatISODate(todayISO()),
        status: item.status || "open",
        kind: item.kind === "loan" ? "loan" : "expense",
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
        .map((item) => {
          const members = Array.isArray(item.members) ? item.members : [];
          const adminIds = Array.isArray(item.adminIds) && item.adminIds.length ? item.adminIds : members.slice(0, 1);
          return { ...item, icon: item.icon || "home", members, adminIds: adminIds.filter((id) => members.includes(id)) };
        })
    : [];
}

function normalizeMembers(items) {
  return Array.isArray(items)
    ? items
        .filter((item) => item && item.id)
        .map((item) => ({
          ...item,
          displayName: item.displayName || item.name || "USER",
          username: item.username || usernameFromProfile(item),
          email: item.email || "",
          status: item.status || "active"
        }))
    : [];
}

function normalizeMonimons(items) {
  return Array.isArray(items)
    ? items
        .filter((item) => item && item.id && item.name)
        .map((item) => ({ ...item, name: item.name, icon: item.icon || "home", adminIds: Array.isArray(item.adminIds) ? item.adminIds : [] }))
    : [];
}

function normalizeMonimonMembers(items) {
  return Array.isArray(items)
    ? items
        .filter((item) => item && item.monimonId && item.memberId)
        .map((item) => ({ ...item, status: item.status || "active" }))
    : [];
}

function normalizeContacts(items) {
  return Array.isArray(items)
    ? items
        .filter((item) => item && item.ownerProfileId && item.memberId)
        .map((item) => ({
          id: item.id || contactKey(item.ownerProfileId, item.memberId),
          ownerProfileId: item.ownerProfileId,
          memberId: item.memberId,
          nickname: item.nickname || "",
          status: item.status || "active",
          createdAt: item.createdAt || new Date().toISOString()
        }))
    : [];
}

function normalizeProfiles(items) {
  if (!Array.isArray(items)) return [];
  const usedUsernames = new Set();
  return items
    .filter((item) => item && item.id)
    .map((item) => {
      const username = makeUniqueUsername(item.username || item.userName || usernameFromEmail(item.email) || item.name, usedUsernames);
      const name = item.name || item.displayName || item.email?.split("@")[0]?.toUpperCase?.() || username.toUpperCase() || "USUARIO";
      return {
        ...avatarCrop,
        ...item,
        name: String(name).toUpperCase(),
        username,
        avatarSrc: item.avatarSrc || avatarOptions[0].src
      };
    });
}

function debtShareFor(debt, memberId, members) {
  if (debt.kind !== "loan" && members.length > 1) {
    const participantIds = members.map((member) => member.id);
    if (!participantIds.includes(memberId) || debt.fromMemberId === memberId) return 0;
    return debtSplitAmountFor(debt, memberId, members);
  }
  if (debt.toMemberId === "group") {
    const participantIds = members.length ? members.map((member) => member.id) : [];
    if (!participantIds.includes(memberId) || debt.fromMemberId === memberId) return 0;
    return debtSplitAmountFor(debt, memberId, members);
  }
  return debt.toMemberId === memberId ? debt.amount : 0;
}

function debtReceivableFor(debt, memberId, members) {
  if (debt.fromMemberId !== memberId) return 0;
  if (debt.kind !== "loan" && members.length > 1) {
    return debt.amount - debtSplitAmountFor(debt, memberId, members);
  }
  return debt.amount;
}

function expenseParticipantIds(debt, members) {
  if (Array.isArray(debt.splitParticipantIds) && debt.splitParticipantIds.length) {
    return debt.splitParticipantIds;
  }
  const memberIds = members.map((member) => member.id).filter(Boolean);
  if (memberIds.length) return memberIds;
  return [debt.fromMemberId, debt.toMemberId].filter((id) => id && id !== "group");
}

function debtSplitAmountFor(debt, memberId, members) {
  const participantIds = expenseParticipantIds(debt, members);
  if (!participantIds.includes(memberId) || !participantIds.length) return 0;
  if (debt.splitMode === "amount" && debt.splitAmounts?.[memberId] !== undefined) {
    return Number(debt.splitAmounts[memberId]) || 0;
  }
  if (debt.splitMode === "percent" && debt.splitPercentages?.[memberId] !== undefined) {
    return (Number(debt.amount) || 0) * ((Number(debt.splitPercentages[memberId]) || 0) / 100);
  }
  return (Number(debt.amount) || 0) / participantIds.length;
}

function expenseNetFor(debt, memberId, members) {
  if (debt.kind === "loan") return 0;
  const participantIds = expenseParticipantIds(debt, members);
  if (!participantIds.includes(memberId) || !participantIds.length) return 0;
  const paid = debt.fromMemberId === memberId ? debt.amount : 0;
  return paid - debtSplitAmountFor(debt, memberId, members);
}

function debtDateKey(debt) {
  if (!debt?.date) return "Sin fecha";
  return /^\d{2}\/\d{2}\/\d{4}$/.test(debt.date) ? toISOInputDate(debt.date) : debt.date;
}

function groupDebtsByDate(debts) {
  const groups = debts.reduce((result, debt) => {
    const key = debtDateKey(debt);
    const existing = result.find((group) => group.key === key);
    if (existing) {
      existing.items.push(debt);
      return result;
    }
    return [...result, { key, label: displayDate(key), items: [debt] }];
  }, []);
  return groups.sort((a, b) => String(b.key).localeCompare(String(a.key)));
}

function uniqueDebtsById(...lists) {
  const seen = new Set();
  return lists.flat().filter((debt) => {
    if (!debt || seen.has(debt.id)) return false;
    seen.add(debt.id);
    return true;
  });
}

function settlementRowsFor(debts, members, currency, payments = []) {
  const balancesByMember = members.reduce((result, member) => ({ ...result, [member.id]: 0 }), {});
  debts
    .filter((debt) => debt.currency === currency && debt.kind !== "loan")
    .forEach((debt) => {
      members.forEach((member) => {
        balancesByMember[member.id] += expenseNetFor(debt, member.id, members);
      });
    });
  payments
    .filter((payment) => payment.currency === currency)
    .forEach((payment) => {
      if (balancesByMember[payment.fromMemberId] !== undefined) {
        balancesByMember[payment.fromMemberId] += Number(payment.amount) || 0;
      }
      if (balancesByMember[payment.toMemberId] !== undefined) {
        balancesByMember[payment.toMemberId] -= Number(payment.amount) || 0;
      }
    });

  const detailsByMember = members.reduce((result, member) => ({ ...result, [member.id]: [] }), {});
  const debtors = members
    .map((member) => ({ member, amount: Math.max(0, -balancesByMember[member.id]) }))
    .filter((item) => item.amount > 0.009);
  const creditors = members
    .map((member) => ({ member, amount: Math.max(0, balancesByMember[member.id]) }))
    .filter((item) => item.amount > 0.009);

  let debtorIndex = 0;
  let creditorIndex = 0;
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.amount, creditor.amount);
    if (amount > 0.009) {
      detailsByMember[debtor.member.id].push({
        id: `${debtor.member.id}:${creditor.member.id}:debt`,
        type: "debt",
        amount,
        otherMemberId: creditor.member.id
      });
      detailsByMember[creditor.member.id].push({
        id: `${creditor.member.id}:${debtor.member.id}:recover`,
        type: "recover",
        amount,
        otherMemberId: debtor.member.id
      });
    }
    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount <= 0.009) debtorIndex += 1;
    if (creditor.amount <= 0.009) creditorIndex += 1;
  }

  return members.map((member) => ({
    member,
    details: detailsByMember[member.id],
    balance: balancesByMember[member.id]
  }));
}

function emptyCurrencyTotals() {
  return {
    ARS: { theyOwe: 0, iOwe: 0 },
    USD: { theyOwe: 0, iOwe: 0 }
  };
}

function emptyCurrencyBalances() {
  return {
    ARS: 0,
    USD: 0
  };
}

function addCurrencyBalance(balances, currency, amount) {
  const key = currency === "USD" ? "USD" : "ARS";
  return {
    ...balances,
    [key]: balances[key] + amount
  };
}

function globalExpenseTotalsFor(expenses, memberId, members) {
  const balances = expenses.reduce((totals, debt) => (
    addCurrencyBalance(totals, debt.currency, expenseNetFor(debt, memberId, members))
  ), emptyCurrencyBalances());

  return currencyBalancesToTotals(balances);
}

function applyVerifiedPaymentsToTotals(totals, payments, memberId) {
  const balances = Object.entries(totals).reduce((result, [currency, total]) => ({
    ...result,
    [currency]: total.theyOwe - total.iOwe
  }), emptyCurrencyBalances());

  const nextBalances = payments.reduce((result, payment) => {
    if (payment.fromMemberId === memberId) {
      return addCurrencyBalance(result, payment.currency, payment.amount);
    }
    if (payment.toMemberId === memberId) {
      return addCurrencyBalance(result, payment.currency, -payment.amount);
    }
    return result;
  }, balances);

  return currencyBalancesToTotals(nextBalances);
}

function expenseGrossTotalsFor(expenses) {
  return expenses.reduce((totals, debt) => (
    addCurrencyBalance(totals, debt.currency, debt.amount)
  ), emptyCurrencyBalances());
}

function currencyBalancesToTotals(balances) {
  return Object.entries(balances).reduce((totals, [currency, balance]) => ({
    ...totals,
    [currency]: {
      theyOwe: Math.max(balance, 0),
      iOwe: Math.max(-balance, 0)
    }
  }), emptyCurrencyTotals());
}

function contactKey(ownerProfileId, memberId) {
  return `${ownerProfileId}:${memberId}`;
}

function normalizedSearch(value) {
  return String(value || "").trim().toLowerCase();
}

function addCurrencyTotal(totals, currency, field, amount) {
  const key = currency === "USD" ? "USD" : "ARS";
  return {
    ...totals,
    [key]: {
      ...totals[key],
      [field]: totals[key][field] + amount
    }
  };
}

function categoryFor(id, fallbackId = "general") {
  return expenseCategoryOptions.find((option) => option.id === id)
    || expenseCategoryOptions.find((option) => option.id === fallbackId)
    || expenseCategoryOptions[0];
}

function mergeCurrencyTotals(baseTotals, nextTotals) {
  return Object.keys(emptyCurrencyTotals()).reduce((totals, currency) => ({
    ...totals,
    [currency]: {
      theyOwe: totals[currency].theyOwe + (nextTotals[currency]?.theyOwe || 0),
      iOwe: totals[currency].iOwe + (nextTotals[currency]?.iOwe || 0)
    }
  }), baseTotals);
}

function mergeCurrencyBalances(baseBalances, nextBalances) {
  return Object.keys(emptyCurrencyBalances()).reduce((balances, currency) => ({
    ...balances,
    [currency]: balances[currency] + (nextBalances[currency] || 0)
  }), baseBalances);
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
  const [session, setSession] = useState(null);
  const [appUsers, setAppUsers] = useState(() => normalizeProfiles(initialProfiles));
  const [members, setMembers] = useState(() => normalizeMembers(initialMembers));
  const [monimons, setMonimons] = useState(() => normalizeMonimons(initialMonimons));
  const [monimonMembers, setMonimonMembers] = useState(() => normalizeMonimonMembers(initialMonimonMembers));
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState("");
  const [authName, setAuthName] = useState("");
  const [authCountry, setAuthCountry] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("resumen");
  const [debts, setDebts] = useState(() => normalizeDebts(initialDebts));
  const [payments, setPayments] = useState(() => normalizePayments(initialPayments));
  const [paymentRequests, setPaymentRequests] = useState(() => normalizePaymentRequests(initialPaymentRequests));
  const [contacts, setContacts] = useState(() => normalizeContacts(initialContacts));
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
  const [showContacts, setShowContacts] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [sideNavCollapsed, setSideNavCollapsed] = useState(false);
  const [selectedMonimonId, setSelectedMonimonId] = useState("personal");
  const [showCreateMonimon, setShowCreateMonimon] = useState(false);
  const [editingMonimonId, setEditingMonimonId] = useState(null);
  const [personalSpaceName, setPersonalSpaceName] = useState("PERSONAL");
  const [backendOnline, setBackendOnline] = useState(false);
  const [stateHydrated, setStateHydrated] = useState(false);
  const [stateLoadFailed, setStateLoadFailed] = useState(false);
  const [stateLoadRetryTick, setStateLoadRetryTick] = useState(0);
  const [backendWakeElapsed, setBackendWakeElapsed] = useState(0);
  const [saveError, setSaveError] = useState("");
  const [saveRetryTick, setSaveRetryTick] = useState(0);
  const backendLoaded = useRef(false);
  const saveRetryTimer = useRef(null);

  const activeUser = session ? appUsers.find((user) => user.id === session.userId) || session.user : null;
  const otherUser = activeUser ? appUsers.find((user) => user.id !== activeUser.id) : null;
  const memberOptions = useMemo(() => {
    const profileMembers = appUsers
      .filter((profile) => !members.some((member) => member.id === profile.id || member.profileId === profile.id))
      .map(memberFromProfile);
    return [...profileMembers, ...members].map((member) => {
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
    });
  }, [members, appUsers]);
  const monimonOptions = useMemo(() => monimons.map((monimon) => ({
    ...monimon,
    members: [...new Set([
      ...monimonMembers
      .filter((item) => item.monimonId === monimon.id && item.status !== "removed")
      .map((item) => item.memberId),
      ...(activeUser?.id ? [activeUser.id] : [])
    ])]
  })), [monimons, monimonMembers, activeUser?.id]);

  function replaceMonimonsFromOptions(nextMonimonsOrUpdater) {
    const nextMonimons = typeof nextMonimonsOrUpdater === "function" ? nextMonimonsOrUpdater(monimonOptions) : nextMonimonsOrUpdater;
    const normalizedMonimons = normalizeMonimonOptions(nextMonimons)
      .map((monimon) => ({
        ...monimon,
        members: [...new Set([activeUser?.id, ...(monimon.members || [])].filter(Boolean))]
      }));
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
    let wakeTimer = null;
    setStateHydrated(false);
    setStateLoadFailed(false);
    setBackendWakeElapsed(0);
    wakeTimer = window.setInterval(() => {
      setBackendWakeElapsed((seconds) => seconds + 1);
    }, 1000);
    const headers = session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {};
    apiRequest("/api/state", { headers })
      .then((state) => {
        if (cancelled) return;
        if (wakeTimer) window.clearInterval(wakeTimer);
        if (Array.isArray(state.profiles)) setAppUsers(normalizeProfiles(state.profiles));
        if (Array.isArray(state.members)) setMembers(normalizeMembers(state.members));
        if (Array.isArray(state.monimons)) setMonimons(normalizeMonimons(state.monimons));
        if (Array.isArray(state.monimonMembers)) setMonimonMembers(normalizeMonimonMembers(state.monimonMembers));
        if (Array.isArray(state.groups) && state.groups.length && !state.monimons?.length) replaceMonimonsFromOptions(normalizeMonimonOptions(state.groups));
        if (Array.isArray(state.debts)) setDebts(normalizeDebts(state.debts));
        if (Array.isArray(state.payments)) setPayments(normalizePayments(state.payments));
        if (Array.isArray(state.paymentRequests)) setPaymentRequests(normalizePaymentRequests(state.paymentRequests));
        if (Array.isArray(state.contacts)) setContacts(normalizeContacts(state.contacts));
        if (typeof state.personalSpaceName === "string" && state.personalSpaceName.trim()) {
          setPersonalSpaceName(state.personalSpaceName.trim().slice(0, 32));
        }
        backendLoaded.current = true;
        setBackendOnline(true);
        setSaveError("");
        setStateHydrated(true);
      })
      .catch(() => {
        if (cancelled) return;
        if (wakeTimer) window.clearInterval(wakeTimer);
        backendLoaded.current = false;
        setBackendOnline(false);
        setStateLoadFailed(true);
        setStateHydrated(true);
      });
    return () => {
      cancelled = true;
      if (wakeTimer) window.clearInterval(wakeTimer);
    };
  }, [session?.accessToken, stateLoadRetryTick]);

  useEffect(() => {
    if (!backendLoaded.current) return;
    const timeoutId = window.setTimeout(() => {
      apiRequest("/api/state", {
        method: "PUT",
        headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {},
        body: JSON.stringify({ profiles: appUsers, members, monimons, monimonMembers, debts, payments, paymentRequests, contacts, personalSpaceName })
      })
        .then(() => {
          setBackendOnline(true);
          setSaveError("");
          if (saveRetryTimer.current) {
            window.clearTimeout(saveRetryTimer.current);
            saveRetryTimer.current = null;
          }
        })
        .catch(() => {
          setSaveError("No pude guardar los ultimos cambios. Revisa la conexion antes de seguir.");
          if (!saveRetryTimer.current) {
            saveRetryTimer.current = window.setTimeout(() => {
              saveRetryTimer.current = null;
              setSaveRetryTick((tick) => tick + 1);
            }, 2500);
          }
        });
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [saveRetryTick, session?.accessToken, appUsers, members, monimons, monimonMembers, debts, payments, paymentRequests, contacts, personalSpaceName]);
  useEffect(() => () => {
    if (saveRetryTimer.current) window.clearTimeout(saveRetryTimer.current);
  }, []);
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
        setAppUsers((items) => (
          items.some((item) => item.id === profile.id)
            ? items.map((item) => (item.id === profile.id ? { ...item, ...profile } : item))
            : [profile, ...items]
        ));
        setSession((current) => current?.accessToken === session.accessToken ? { ...current, user: profile } : current);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);
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
    const incomingProfile = profileFromAuthUser(payload.user);
    const existingProfile = appUsers.find((user) => user.id === incomingProfile.id);
    const usedUsernames = new Set(
      appUsers
        .filter((user) => user.id !== incomingProfile.id)
        .map((user) => normalizeUsername(user.username))
        .filter(Boolean)
    );
    const profile = existingProfile
      ? {
          ...incomingProfile,
          ...existingProfile,
          email: incomingProfile.email,
          role: incomingProfile.role,
          username: existingProfile.username || incomingProfile.username
        }
      : {
          ...incomingProfile,
          username: makeUniqueUsername(
            incomingProfile.username || usernameFromEmail(incomingProfile.email) || incomingProfile.name,
            usedUsernames
          )
        };
    const member = memberFromProfile(profile);
    setAppUsers((items) => {
      const exists = items.some((user) => user.id === profile.id);
      return exists
        ? items.map((user) => (user.id === profile.id ? { ...profile, ...user, email: profile.email, username: user.username || profile.username } : user))
        : [profile, ...items];
    });
    setMembers((items) => {
      const exists = items.some((item) => item.id === member.id);
      return exists
        ? items.map((item) => (item.id === member.id ? { ...member, ...item, profileId: profile.id, username: item.username || member.username, email: item.email || member.email } : item))
        : [member, ...items];
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
    setSelectedMonimonId("personal");
    setActiveView("resumen");
    setAuthPassword("");
    setError("");
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken) return;
    const tokenUser = authUserFromAccessToken(accessToken);
    if (tokenUser) {
      rememberAuthSession({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: params.get("token_type") || "bearer",
        user: tokenUser
      });
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }
    window.history.replaceState(null, "", window.location.pathname);
    setError("No se pudo leer la sesión de Google.");
  }, []);

  async function submitLogin(event) {
    event.preventDefault();
    setError("");
    const isRegister = authMode === "register";
    const username = isRegister ? normalizeUsername(authName) : "";
    if (authMode === "register" && authPassword !== authPasswordConfirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (authMode === "register" && username.length < 3) {
      setError("Elegí un nombre de usuario de al menos 3 caracteres.");
      return;
    }
    if (authMode === "register" && appUsers.some((user) => normalizeUsername(user.username) === username)) {
      setError("Ese nombre de usuario ya está en uso.");
      return;
    }
    if (authMode === "register" && !authCountry) {
      setError("Seleccioná un país.");
      return;
    }
    if (!isRegister && !authEmail.includes("@")) {
      setError("Ingresá tu email para iniciar sesión.");
      return;
    }
    setAuthLoading(true);
    try {
      const payload = await apiRequest(authMode === "login" ? "/api/auth/login" : "/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: authEmail.trim(),
          password: authPassword,
          ...(isRegister
            ? {
                name: username.toUpperCase(),
                username,
                country: authCountry
              }
            : {})
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
    if (updates.name || updates.username) {
      setMembers((items) =>
        items.map((member) =>
          member.profileId === activeUser.id || member.id === activeUser.id
            ? {
                ...member,
                ...(updates.name ? { displayName: updates.name } : {}),
                ...(updates.username ? { username: updates.username } : {})
              }
            : member
        )
      );
    }
  }

  function clearAuthSession() {
    setSession(null);
    setAuthPassword("");
    setAuthPasswordConfirm("");
    setAuthEmail("");
    setAuthName("");
    setAuthMode("login");
    setProfileMenuOpen(false);
    setProfileModal(null);
    window.history.replaceState(null, "", window.location.pathname);
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
  function registerPayment({ fromId, toId, debtIds = selectedDebtIds, amountOverride = null, monimonIdOverride = selectedMonimonId }) {
    const selectedDebts = debts.filter((debt) => debtIds.includes(debt.id));
    const parsedManual = parseAmountInput(manualAmount);
    const selectedMonimon = monimonOptions.find((monimon) => monimon.id === monimonIdOverride);
    const groupAdminIds = selectedMonimon?.adminIds?.length ? selectedMonimon.adminIds : selectedMonimon?.members?.slice(0, 1) || [];
    const canRegisterGroupPayment = groupAdminIds.includes(activeUser?.id) || fromId === activeUser?.id;
    if (monimonIdOverride !== "personal" && !canRegisterGroupPayment) {
      setPaymentError("Solo los administradores del grupo pueden registrar pagos de otros integrantes.");
      return false;
    }
    const membersForSelectedMonimon = selectedMonimon ? selectedMonimon.members.map((id) => memberOptions.find((user) => user.id === id)).filter(Boolean) : [];
    const amount = amountOverride ?? (parsedManual > 0 ? parsedManual : selectedDebts.reduce((sum, debt) => sum + debtShareFor(debt, fromId, membersForSelectedMonimon), 0));

    if (!amount || !activeUser || !fromId || !toId) {
      setPaymentError("Falta información para registrar el pago.");
      return false;
    }

    const paidIds = parsedManual > 0 && !amountOverride ? [] : debtIds;
    setPayments((items) => [
      {
        id: `payment-${Date.now()}`,
        monimonId: monimonIdOverride,
        fromMemberId: fromId,
        toMemberId: toId,
        amount,
        currency: paymentCurrency,
        date: formatISODate(paymentDate),
        detail: paymentReason.trim() || "Pago",
        verifiedByMemberIds: [activeUser.id],
        verifiedAt: new Date().toISOString(),
        debtIds: paidIds
      },
      ...items
    ]);
    if (paidIds.length) {
      const selectedDebtTotal = selectedDebts.reduce((sum, debt) => sum + debtShareFor(debt, fromId, membersForSelectedMonimon), 0);
      const closesSelectedDebts = selectedDebtTotal > 0 && Number(amount) >= selectedDebtTotal;
      if (closesSelectedDebts) {
        setDebts((items) => items.map((debt) => (
          paidIds.includes(debt.id) ? { ...debt, status: "paid" } : debt
        )));
        setSelectedDebtIds((items) => items.filter((id) => !paidIds.includes(id)));
      }
    }
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
    if (request.requestedByMemberId === activeUser.id) return;
    if (!(request.requiredApproverMemberIds || []).includes(activeUser.id)) return;
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
        verifiedAt: new Date().toISOString(),
        requestId: request.id
      },
      ...items
    ]);
    if (request.debtIds?.length) {
      const requestMonimon = monimonOptions.find((monimon) => monimon.id === request.monimonId);
      const requestMembers = requestMonimon ? requestMonimon.members.map((id) => memberOptions.find((user) => user.id === id)).filter(Boolean) : memberOptions;
      const requestDebts = debts.filter((debt) => request.debtIds.includes(debt.id));
      const selectedDebtTotal = requestDebts.reduce((sum, debt) => sum + debtShareFor(debt, request.fromMemberId, requestMembers), 0);
      const closesSelectedDebts = selectedDebtTotal > 0 && Number(request.amount) >= selectedDebtTotal;
      setDebts((items) => items.map((debt) => (
        closesSelectedDebts && request.debtIds.includes(debt.id)
          ? { ...debt, status: "paid" }
          : debt
      )));
      setSelectedDebtIds((items) => items.filter((id) => !request.debtIds.includes(id)));
    }
    setPaymentRequests((items) => items.map((item) => (item.id === requestId ? { ...item, approvedByMemberIds, status: "approved" } : item)));
  }

  function rejectPaymentRequest(requestId) {
    if (!activeUser) return;
    setPaymentRequests((items) => items.map((item) => (
      item.id === requestId && item.requestedByMemberId !== activeUser.id && (item.requiredApproverMemberIds || []).includes(activeUser.id)
        ? { ...item, rejectedByMemberId: activeUser.id, status: "rejected" }
        : item
    )));
  }

  function registerDebt({ fromId, toId, title, category, amount, currency, date, kind = "expense", splitParticipantIds = [], splitMode = "equal", splitAmounts = {}, splitPercentages = {} }) {
    if (!activeUser || !fromId || !toId || !title.trim() || amount <= 0) return false;
    setDebts((items) => [
      {
        id: Date.now(),
        monimonId: selectedMonimonId,
        fromMemberId: fromId,
        toMemberId: toId,
        title: title.trim(),
        category: category || (kind === "loan" ? "loan" : "general"),
        splitParticipantIds,
        splitMode,
        splitAmounts,
        splitPercentages,
        amount,
        currency,
        date: formatISODate(date || todayISO()),
        kind,
        status: "open"
      },
      ...items
    ]);
    setShowNewDebt(false);
    return true;
  }

  function deleteMonimonFromBackend(monimonId) {
    if (!monimonId || monimonId === "personal") return Promise.reject(new Error("No se puede eliminar el espacio personal."));
    if (!session?.accessToken) return Promise.reject(new Error("Necesitás iniciar sesión para eliminar un grupo en la base de datos."));
    return apiRequest("/api/monimons/delete", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.accessToken}` },
      body: JSON.stringify({ id: monimonId })
    });
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-app text-milk">
        <div className="ambient" />
        <section className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-4 py-8 lg:grid-cols-[1fr_430px] lg:px-8">
          <div className="brand-copy">
            <img src="/moni-logo-current.png" alt="moni mon!" className="hero-logo" />
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
            authPasswordConfirm={authPasswordConfirm}
            setAuthPasswordConfirm={setAuthPasswordConfirm}
            authName={authName}
            setAuthName={setAuthName}
            authCountry={authCountry}
            setAuthCountry={setAuthCountry}
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

  if (!stateHydrated) {
    return (
      <BackendWakeScreen elapsed={backendWakeElapsed} />
    );
  }

  if (stateLoadFailed) {
    return (
      <BackendWakeScreen
        elapsed={backendWakeElapsed}
        failed
        onRetry={() => {
          setStateHydrated(false);
          setStateLoadFailed(false);
          setStateLoadRetryTick((tick) => tick + 1);
        }}
      />
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
      setPaymentRequests={setPaymentRequests}
      contacts={contacts}
      setContacts={setContacts}
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
      showContacts={showContacts}
      setShowContacts={setShowContacts}
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
      deleteMonimonFromBackend={deleteMonimonFromBackend}
      saveError={saveError}
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
  authPasswordConfirm,
  setAuthPasswordConfirm,
  authName,
  setAuthName,
  authCountry,
  setAuthCountry,
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
    <div className="login-panel">
      <form onSubmit={submitLogin} className="glass-card login-card">
        <img src="/acorn-logo.png" alt="Bellota de MONI MON!" className="login-card-symbol" />

        <button type="button" className="secondary-login-action" onClick={loginWithGoogle} disabled={authLoading}>
          <GoogleMark /> <span>Continuar con Google</span>
        </button>

        <div className="auth-divider">
          <span>{isRegister ? "O registrate con email" : "O ingresá con email"}</span>
        </div>

        {isRegister && (
          <div className="pin-field auth-field login-input-field">
            <span className="field-icon" aria-hidden="true"><UserRound size={18} /></span>
            <input
              id="auth-name"
              aria-label="Nombre de usuario obligatorio"
              value={authName}
              onChange={(event) => setAuthName(normalizeUsername(event.target.value))}
              autoComplete="username"
              placeholder="Nombre de usuario *"
              required
            />
          </div>
        )}

        <div className="pin-field auth-field login-input-field">
          <span className="field-icon" aria-hidden="true"><Mail size={18} /></span>
          <input
            id="auth-email"
            aria-label="Email"
            value={authEmail}
            onChange={(event) => setAuthEmail(event.target.value)}
            autoComplete="email"
            inputMode="email"
            type="email"
            placeholder="Email *"
            required
          />
        </div>

        <div className="pin-field login-input-field">
          <span className="field-icon" aria-hidden="true"><LockKeyhole size={18} /></span>
          <input
            id="auth-password"
            aria-label="Contraseña"
            value={authPassword}
            onChange={(event) => setAuthPassword(event.target.value)}
            autoComplete={isRegister ? "new-password" : "current-password"}
            type={showPassword ? "text" : "password"}
            placeholder="Contraseña *"
            minLength={6}
            required
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Mostrar u ocultar contraseña">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {isRegister && (
          <div className="pin-field login-input-field">
            <span className="field-icon" aria-hidden="true"><LockKeyhole size={18} /></span>
            <input
              id="auth-password-confirm"
              aria-label="Repetir contraseña"
              value={authPasswordConfirm}
              onChange={(event) => setAuthPasswordConfirm(event.target.value)}
              autoComplete="new-password"
              type={showPassword ? "text" : "password"}
              placeholder="Repetir contraseña *"
              minLength={6}
              required
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Mostrar u ocultar contraseña">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        )}

        {isRegister && (
          <div className="pin-field login-input-field country-select-field">
            <span className="field-icon" aria-hidden="true"><MapPin size={18} /></span>
            <select
              id="auth-country"
              aria-label="País obligatorio"
              value={authCountry}
              onChange={(event) => setAuthCountry(event.target.value)}
              required
            >
              <option value="">Tu País/Región *</option>
              {countryOptions.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {!isRegister && (
          <div className="auth-options-row">
            <label className="remember-session">
              <input type="checkbox" />
              <span>Mantenerse conectado</span>
            </label>
            <button type="button" className="forgot-password-link">Olvidaste tu contraseña?</button>
          </div>
        )}

        {error && <p className="form-error">{error}</p>}
        <button className="primary-action login-action" disabled={authLoading}>
          {authLoading ? "CARGANDO" : isRegister ? "CREAR CUENTA" : "INGRESAR"}
        </button>
        <p className="auth-switch-copy">
          {isRegister ? "Ya tenés cuenta?" : "Nuevo en MONI MON!?"}{" "}
          <button
            type="button"
            onClick={() => {
              setAuthPasswordConfirm("");
              setAuthCountry("");
              setAuthMode(isRegister ? "login" : "register");
            }}
          >
            {isRegister ? "Ingresá" : "Crea una cuenta"}
          </button>
        </p>
      </form>
    </div>
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

function BackendWakeScreen({ elapsed = 0, failed = false, onRetry }) {
  const progress = failed ? 100 : Math.min(94, 12 + elapsed * 3.6);
  const phase = failed
    ? {
        title: "No pude conectar con el servidor.",
        copy: "Revisá si la API está disponible y volvé a intentar."
      }
    : elapsed < 4
      ? {
          title: "Cargando tu información...",
          copy: "Estamos preparando tus grupos y movimientos."
        }
      : elapsed < 18
        ? {
            title: "Conectando con el servidor...",
            copy: "Si estuvo inactivo, puede tardar un poquito en responder."
          }
        : {
            title: "MONI MON! está despertando...",
            copy: "El servidor gratuito estaba durmiendo la siesta. Ya casi."
          };

  return (
    <main className="min-h-screen bg-app text-milk">
      <div className="ambient" />
      <section className={`loading-screen ${failed ? "failed" : ""}`}>
        <img src="/moni-logo-current.png" alt="moni mon!" className="loading-logo" />
        <strong>{phase.title}</strong>
        <p>{phase.copy}</p>
        <div className="wake-progress" aria-label="Progreso de conexión">
          <span style={{ width: `${progress}%` }} />
        </div>
        <small>{failed ? "La conexión no se completó." : `Esperando respuesta hace ${elapsed}s`}</small>
        {failed && (
          <button type="button" className="primary-action login-action" onClick={onRetry}>
            Reintentar
          </button>
        )}
      </section>
    </main>
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
  setPaymentRequests,
  contacts,
  setContacts,
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
  showContacts,
  setShowContacts,
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
  deleteMonimonFromBackend,
  saveError,
  logout,
  deleteAccount
}) {
  const [toastMessage, setToastMessage] = useState("");
  const [groupActionsOpen, setGroupActionsOpen] = useState(false);
  const [appTheme, setAppTheme] = useState(() => window.localStorage.getItem("monimon-theme") || defaultAppTheme);
  const scopedDebts = debts.filter((debt) => debt.monimonId === selectedMonimonId);
  const scopedPayments = payments.filter((payment) => payment.monimonId === selectedMonimonId);
  const scopedPaymentRequests = paymentRequests.filter((request) => request.monimonId === selectedMonimonId);
  const openDebts = scopedDebts.filter((debt) => debt.status === "open");
  const openExpenses = openDebts.filter((debt) => debt.kind !== "loan");
  const openLoans = openDebts.filter((debt) => debt.kind === "loan");
  const currentNavItems = selectedMonimonId === "personal" ? navItems : groupNavItems;
  const selectedMonimon = monimons.find((monimon) => monimon.id === selectedMonimonId);
  const selectedGroupIconOption = groupIconOptions.find((item) => item.id === selectedMonimon?.icon) || groupIconOptions[0];
  const editingMonimon = editingMonimonId ? monimons.find((monimon) => monimon.id === editingMonimonId) : null;
  const personalMembers = activeUser ? [activeUser] : [];
  const membersForSelectedMonimon = selectedMonimon ? selectedMonimon.members.map((id) => appUsers.find((user) => user.id === id)).filter(Boolean) : personalMembers;
  const isMonimonMode = selectedMonimonId !== "personal";
  const shareUrl = `${window.location.origin}${window.location.pathname}#monimon=${selectedMonimonId}`;
  const incomingDebts = openExpenses.filter((debt) => debtReceivableFor(debt, activeUser.id, membersForSelectedMonimon) > 0);
  const outgoingDebts = openExpenses.filter((debt) => debtShareFor(debt, activeUser.id, membersForSelectedMonimon) > 0);
  const incomingLoans = openLoans.filter((debt) => debtReceivableFor(debt, activeUser.id, membersForSelectedMonimon) > 0);
  const outgoingLoans = openLoans.filter((debt) => debtShareFor(debt, activeUser.id, membersForSelectedMonimon) > 0);
  const expenseTotalsByCurrency = applyVerifiedPaymentsToTotals(
    globalExpenseTotalsFor(openExpenses, activeUser.id, membersForSelectedMonimon),
    scopedPayments,
    activeUser.id
  );
  const grossExpensesByCurrency = expenseGrossTotalsFor(openExpenses);
  const myRealExpensesByCurrency = openExpenses.reduce((totals, debt) => (
    addCurrencyBalance(totals, debt.currency, debtSplitAmountFor(debt, activeUser.id, membersForSelectedMonimon))
  ), emptyCurrencyBalances());
  const summaryByCurrency = [...incomingLoans, ...outgoingLoans].reduce((totals, debt) => {
    if (debt.fromMemberId === activeUser.id) {
      const amount = debtReceivableFor(debt, activeUser.id, membersForSelectedMonimon);
      return addCurrencyTotal(totals, debt.currency, "theyOwe", amount);
    }
    const amount = debtShareFor(debt, activeUser.id, membersForSelectedMonimon);
    return amount > 0 ? addCurrencyTotal(totals, debt.currency, "iOwe", amount) : totals;
  }, expenseTotalsByCurrency);
  const theyOwe = summaryByCurrency.ARS.theyOwe;
  const iOwe = summaryByCurrency.ARS.iOwe;
  const selectedDebts = outgoingDebts.filter((debt) => selectedDebtIds.includes(debt.id));
  const selectedTotal = selectedDebts.reduce((sum, debt) => sum + debtShareFor(debt, activeUser.id, membersForSelectedMonimon), 0);
  const activeGroups = monimons.filter((monimon) => monimon.members.includes(activeUser.id));
  const personalScopeGroups = [{ id: "personal", name: personalSpaceName, members: appUsers.map((user) => user.id) }, ...activeGroups];
  const membersForMonimon = (monimon) => monimon.members.map((id) => appUsers.find((user) => user.id === id)).filter(Boolean);
  const getSummaryDebtMembers = (debt) => {
    if (isMonimonMode) return membersForSelectedMonimon;
    const group = personalScopeGroups.find((monimon) => monimon.id === debt.monimonId);
    return group ? membersForMonimon(group) : appUsers;
  };
  const debtInvolvesActiveUser = (debt) => {
    const groupMembers = getSummaryDebtMembers(debt);
    return debt.fromMemberId === activeUser.id
      || debtReceivableFor(debt, activeUser.id, groupMembers) > 0.009
      || debtShareFor(debt, activeUser.id, groupMembers) > 0.009
      || expenseParticipantIds(debt, groupMembers).includes(activeUser.id);
  };
  const globalGrossExpensesByCurrency = personalScopeGroups.reduce((balances, monimon) => {
    const groupExpenses = debts.filter((debt) => debt.monimonId === monimon.id && debt.status === "open" && debt.kind !== "loan" && debtInvolvesActiveUser(debt));
    return mergeCurrencyBalances(balances, expenseGrossTotalsFor(groupExpenses));
  }, emptyCurrencyBalances());
  const globalMyRealExpensesByCurrency = personalScopeGroups.reduce((balances, monimon) => {
    const groupMembers = monimon.members.map((id) => appUsers.find((user) => user.id === id)).filter(Boolean);
    const groupExpenses = debts.filter((debt) => debt.monimonId === monimon.id && debt.status === "open" && debt.kind !== "loan" && debtInvolvesActiveUser(debt));
    const groupMyExpenses = groupExpenses.reduce((totals, debt) => (
      addCurrencyBalance(totals, debt.currency, debtSplitAmountFor(debt, activeUser.id, groupMembers))
    ), emptyCurrencyBalances());
    return mergeCurrencyBalances(balances, groupMyExpenses);
  }, emptyCurrencyBalances());
  const globalExpenseTotalsByCurrency = personalScopeGroups.reduce((totals, monimon) => {
    const groupMembers = monimon.members.map((id) => appUsers.find((user) => user.id === id)).filter(Boolean);
    const groupExpenses = debts.filter((debt) => debt.monimonId === monimon.id && debt.status === "open" && debt.kind !== "loan" && debtInvolvesActiveUser(debt));
    const groupPayments = payments.filter((payment) => payment.monimonId === monimon.id);
    const groupTotals = applyVerifiedPaymentsToTotals(
      globalExpenseTotalsFor(groupExpenses, activeUser.id, groupMembers),
      groupPayments,
      activeUser.id
    );
    return mergeCurrencyTotals(totals, groupTotals);
  }, emptyCurrencyTotals());
  const globalLoanTotalsByCurrency = personalScopeGroups.reduce((totals, monimon) => {
    const groupMembers = monimon.members.map((id) => appUsers.find((user) => user.id === id)).filter(Boolean);
    const groupLoans = debts.filter((debt) => debt.monimonId === monimon.id && debt.status === "open" && debt.kind === "loan" && debtInvolvesActiveUser(debt));
    return groupLoans.reduce((nextTotals, debt) => {
      if (debt.fromMemberId === activeUser.id) {
        return addCurrencyTotal(nextTotals, debt.currency, "theyOwe", debtReceivableFor(debt, activeUser.id, groupMembers));
      }
      const amount = debtShareFor(debt, activeUser.id, groupMembers);
      return amount > 0 ? addCurrencyTotal(nextTotals, debt.currency, "iOwe", amount) : nextTotals;
    }, totals);
  }, emptyCurrencyTotals());
  const globalSummaryByCurrency = mergeCurrencyTotals(globalExpenseTotalsByCurrency, globalLoanTotalsByCurrency);
  const summaryDetailExpenses = isMonimonMode
    ? openExpenses
    : personalScopeGroups.flatMap((monimon) => debts.filter((debt) => debt.monimonId === monimon.id && debt.status === "open" && debt.kind !== "loan" && debtInvolvesActiveUser(debt)));
  const summaryDetailGroups = isMonimonMode
    ? [{ id: selectedMonimonId, expenses: openExpenses, payments: scopedPayments, members: membersForSelectedMonimon }]
    : personalScopeGroups.map((monimon) => ({
        id: monimon.id,
        expenses: debts.filter((debt) => debt.monimonId === monimon.id && debt.status === "open" && debt.kind !== "loan" && debtInvolvesActiveUser(debt)),
        payments: payments.filter((payment) => payment.monimonId === monimon.id),
        members: membersForMonimon(monimon)
      }));
  const paymentPanelSettlementGroups = isMonimonMode
    ? [{ id: selectedMonimonId, name: selectedMonimon?.name || "Grupo", debts: openDebts, payments: scopedPayments, members: membersForSelectedMonimon }]
    : personalScopeGroups.map((monimon) => ({
        id: monimon.id,
        name: monimon.name,
        debts: debts.filter((debt) => debt.monimonId === monimon.id && debt.status === "open" && debtInvolvesActiveUser(debt)),
        payments: payments.filter((payment) => payment.monimonId === monimon.id),
        members: membersForMonimon(monimon)
      }));
  const paymentPanelDebts = paymentPanelSettlementGroups.flatMap((group) => group.debts);
  const personalIncomingDebts = paymentPanelDebts.filter((debt) => debt.kind !== "loan" && debtReceivableFor(debt, activeUser.id, getSummaryDebtMembers(debt)) > 0.009);
  const personalOutgoingDebts = paymentPanelDebts.filter((debt) => debt.kind !== "loan" && debtShareFor(debt, activeUser.id, getSummaryDebtMembers(debt)) > 0.009);
  const paymentPanelPendingDebts = isMonimonMode
    ? outgoingDebts
    : paymentPanelSettlementGroups.flatMap((group) => (
        group.debts.filter((debt) => debt.kind !== "loan" && debtShareFor(debt, activeUser.id, group.members) > 0)
      ));
  const paymentPanelPayments = isMonimonMode
    ? scopedPayments
    : personalScopeGroups.flatMap((monimon) => payments.filter((payment) => payment.monimonId === monimon.id));
  const historyDebts = isMonimonMode ? scopedDebts : paymentPanelDebts;
  const historyPayments = isMonimonMode ? scopedPayments : paymentPanelPayments;

  function closeMonimonModals() {
    setEditingMonimonId(null);
    setShowCreateMonimon(false);
    setGroupActionsOpen(false);
  }

  function joinGroupFromInvite() {
    const value = window.prompt("Pegá el link o código de invitación");
    if (!value) return;
    const match = value.match(/monimon=([^&]+)/);
    const monimonId = match ? decodeURIComponent(match[1]) : value.trim();
    if (monimons.some((monimon) => monimon.id === monimonId)) {
      setSelectedMonimonId(monimonId);
      setGroupActionsOpen(false);
      return;
    }
    window.alert("No encontré ese grupo en tu cuenta.");
  }

  function addContact(memberId) {
    if (!activeUser || !memberId || memberId === activeUser.id) return;
    setContacts((items) => {
      const exists = items.some((item) => item.ownerProfileId === activeUser.id && item.memberId === memberId && item.status !== "removed");
      if (exists) return items;
      return [
        {
          id: contactKey(activeUser.id, memberId),
          ownerProfileId: activeUser.id,
          memberId,
          status: "pending",
          createdAt: new Date().toISOString()
        },
        ...items
      ];
    });
  }

  function removeContact(memberId) {
    if (!activeUser || !memberId) return;
    setContacts((items) => items.map((item) => (
      item.ownerProfileId === activeUser.id && item.memberId === memberId
        ? { ...item, status: "removed" }
        : item
    )));
  }

  function saveEditedDebt({ id, title, category, amount, currency, date, fromMemberId, toMemberId, kind, splitParticipantIds, splitMode, splitAmounts, splitPercentages }) {
    const parsedAmount = parseAmountInput(amount);
    if (!title.trim() || parsedAmount <= 0) return;
    setDebts((items) => items.map((item) => (item.id === id ? { ...item, title: title.trim(), category: category || item.category || "general", splitParticipantIds: splitParticipantIds || item.splitParticipantIds || [], splitMode: splitMode || item.splitMode || "equal", splitAmounts: splitAmounts || item.splitAmounts || {}, splitPercentages: splitPercentages || item.splitPercentages || {}, amount: parsedAmount, currency, date, fromMemberId, toMemberId, kind: kind || item.kind || "expense" } : item)));
    setEditingDebt(null);
  }

  function deleteDebt(debt) {
    if (!window.confirm(`Eliminar ${debt.title}?`)) return;
    setDebts((items) => items.filter((item) => item.id !== debt.id));
    setSelectedDebtIds((items) => items.filter((id) => id !== debt.id));
  }

  function repeatDebt(debt) {
    if (!debt || debt.kind === "loan") return;
    setDebts((items) => [
      {
        ...debt,
        id: Date.now(),
        date: formatISODate(todayISO()),
        status: "open"
      },
      ...items
    ]);
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

  async function deleteMonimon(monimon) {
    if (!monimon) return false;
    const confirmed = window.confirm(
      `Eliminar el grupo ${monimon.name}?\n\nSe eliminará por completo y no se puede recuperar. Sus gastos, pagos, solicitudes y registros se perderán para siempre.`
    );
    if (!confirmed) return false;
    try {
      await deleteMonimonFromBackend(monimon.id);
      closeMonimonModals();
      replaceMonimons(monimons.filter((item) => item.id !== monimon.id));
      setDebts((items) => items.filter((item) => item.monimonId !== monimon.id));
      setPayments((items) => items.filter((item) => item.monimonId !== monimon.id));
      setPaymentRequests((items) => items.filter((item) => item.monimonId !== monimon.id));
      setSelectedDebtIds([]);
      setSelectedMonimonId("personal");
      return true;
    } catch (error) {
      window.alert(error.message || "No se pudo eliminar el grupo en la base de datos.");
      return false;
    }
  }

  async function shareMonimon() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToastMessage("Link de grupo copiado.");
      window.setTimeout(() => setToastMessage(""), 2200);
    } catch {
      window.prompt("Copiá este link", shareUrl);
    }
  }

  useEffect(() => {
    window.localStorage.setItem("monimon-theme", appTheme);
  }, [appTheme]);

  return (
    <main className="min-h-screen bg-app text-milk" data-theme={appTheme}>
      <div className="ambient" />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 lg:px-6">
        <header className="topbar">
          <div className="flex items-center gap-3">
            <label className="theme-switcher" title="Probar tema visual">
              <Palette size={16} />
              <select value={appTheme} onChange={(event) => setAppTheme(event.target.value)} aria-label="Tema visual">
                {appThemes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
              </select>
            </label>
            <button
              type="button"
              className={`header-contacts-btn ${showContacts ? "active" : ""}`}
              onClick={() => setShowContacts(true)}
            >
              <BookUser size={18} /> Contactos
            </button>
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
            <div className="side-nav-header">
              <img src="/moni-logo-current.png" alt="moni mon!" className="app-logo nav-logo-full" />
              <img src="/acorn-logo.png" alt="moni mon!" className="nav-logo-compact" />
              <button type="button" className="collapse-nav-btn" onClick={() => setSideNavCollapsed((collapsed) => !collapsed)} aria-label={sideNavCollapsed ? "Expandir menú" : "Colapsar menú"}>
                {sideNavCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              </button>
            </div>
            <div className="side-actions">
              <button
                type="button"
                className="create-monimon-btn side-create-monimon-btn"
                onClick={() => setGroupActionsOpen((open) => !open)}
                aria-expanded={groupActionsOpen}
                aria-label="Nuevo grupo"
              >
                <Plus size={17} /> <span>NUEVO GRUPO</span>
              </button>
              {groupActionsOpen && (
                <div className="group-action-menu side-group-action-menu">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMonimonId(null);
                      setShowCreateMonimon(true);
                      setGroupActionsOpen(false);
                    }}
                  >
                    Crear
                  </button>
                  <button type="button" onClick={joinGroupFromInvite}>
                    Unirme
                  </button>
                </div>
              )}
            </div>
            {currentNavItems.map((item) => <NavButton key={item.id} item={item} active={activeView === item.id} setActiveView={setActiveView} />)}
          </aside>

          <section className="content-area">
            <div className="workspace-bar">
              <div className="workspace-main">
                <div className="workspace-select-row">
                  <span className={`workspace-group-icon ${selectedMonimon ? "" : "workspace-personal-icon"}`.trim()} title={selectedMonimon ? selectedGroupIconOption.label : "Personal"}>
                    {selectedMonimon ? selectedGroupIconOption.emoji : <Avatar user={activeUser} />}
                  </span>
                  <select value={selectedMonimonId} onChange={(event) => setSelectedMonimonId(event.target.value)} aria-label="Seleccionar grupo o espacio">
                    <option value="personal">{personalSpaceName.toUpperCase()}</option>
                    {monimons.map((monimon) => <option key={monimon.id} value={monimon.id}>{monimon.name}</option>)}
                  </select>
                  {selectedMonimonId === "personal" && (
                    <button
                      type="button"
                      className="edit-monimon-btn"
                      onClick={() => setProfileModal("personal-space")}
                      aria-label="Editar espacio personal"
                    >
                      <Settings size={16} />
                    </button>
                  )}
                  {selectedMonimon && (
                    <button
                      type="button"
                      className="edit-monimon-btn"
                      onClick={() => {
                        setShowCreateMonimon(false);
                        setEditingMonimonId(selectedMonimon.id);
                      }}
                      aria-label="Configurar grupo"
                    >
                      <Settings size={16} />
                    </button>
                  )}
                  {selectedMonimon && (
                    <button type="button" className="share-monimon-btn" onClick={shareMonimon} aria-label="Compartir grupo">
                      <Share2 size={17} />
                    </button>
                  )}
                </div>
                <div className="workspace-people">
                  {membersForSelectedMonimon.map((member) => <span key={member.id}>{member.name}</span>)}
                </div>
              </div>
            </div>
            <div className="dashboard-grid">
              <section className="main-column">
                {activeView === "resumen" && (
                  <SummaryHeader
                    title="Resumen"
                    summaryByCurrency={isMonimonMode ? summaryByCurrency : globalSummaryByCurrency}
                    grossExpensesByCurrency={isMonimonMode ? grossExpensesByCurrency : globalGrossExpensesByCurrency}
                    myExpensesByCurrency={isMonimonMode ? myRealExpensesByCurrency : globalMyRealExpensesByCurrency}
                    labels={isMonimonMode ? { gross: "Gastos grupales", balance: "Me deben", debt: "Mi deuda", expenses: "Mis gastos" } : { balance: "Me deben", debt: "Mi deuda", expenses: "Mis gastos" }}
                    onViewDebt={() => setActiveView("pago")}
                    detailData={{
                      activeUserId: activeUser.id,
                      expenses: summaryDetailExpenses,
                      groups: summaryDetailGroups,
                      members: isMonimonMode ? membersForSelectedMonimon : appUsers,
                      settlementGroups: paymentPanelSettlementGroups,
                      getDebtMembers: getSummaryDebtMembers
                    }}
                  />
                )}
                {activeView === "gastos" && (
                  <DebtPanel activeUser={activeUser} appUsers={isMonimonMode ? membersForSelectedMonimon : appUsers} getDebtMembers={getSummaryDebtMembers} incomingDebts={isMonimonMode ? incomingDebts : personalIncomingDebts} outgoingDebts={isMonimonMode ? outgoingDebts : personalOutgoingDebts} incomingTotal={(isMonimonMode ? expenseTotalsByCurrency : globalExpenseTotalsByCurrency).ARS.theyOwe} outgoingTotal={(isMonimonMode ? expenseTotalsByCurrency : globalExpenseTotalsByCurrency).ARS.iOwe} selectedDebtIds={selectedDebtIds} setSelectedDebtIds={setSelectedDebtIds} isMonimonMode={isMonimonMode} title="Gastos" action="Nuevo gasto" onNewDebt={() => setShowNewDebt(true)} onEditDebt={setEditingDebt} onDeleteDebt={deleteDebt} onRepeatDebt={repeatDebt} />
                )}
                {activeView === "prestamos" && (
                  <DebtPanel activeUser={activeUser} appUsers={isMonimonMode ? membersForSelectedMonimon : appUsers} incomingDebts={incomingLoans} outgoingDebts={outgoingLoans} selectedDebtIds={selectedDebtIds} setSelectedDebtIds={setSelectedDebtIds} isMonimonMode={isMonimonMode} title="Préstamos" action="Nuevo préstamo" onNewDebt={() => setShowNewDebt(true)} onEditDebt={setEditingDebt} onDeleteDebt={deleteDebt} />
                )}
                {activeView === "pagos" && <PaymentsPanel payments={historyPayments} debts={historyDebts} appUsers={isMonimonMode ? membersForSelectedMonimon : appUsers} getDebtMembers={getSummaryDebtMembers} activeUserId={activeUser.id} personalOnly={!isMonimonMode} monimons={monimons} personalSpaceName={personalSpaceName} onEditPayment={setEditingPayment} onDeletePayment={deletePayment} />}
                {activeView === "archivo" && (
                  <section className="glass-card panel">
                    <ArchivePanel files={archiveFiles} setFiles={setArchiveFiles} activeUser={activeUser} />
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
                    debts={paymentPanelDebts}
                    selectedDebtIds={selectedDebtIds}
                    setSelectedDebtIds={setSelectedDebtIds}
                    selectedTotal={isMonimonMode ? selectedTotal : paymentPanelPendingDebts.reduce((sum, debt) => sum + debtShareFor(debt, activeUser.id, getSummaryDebtMembers(debt)), 0)}
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
                    payments={paymentPanelPayments}
                    pendingDebts={paymentPanelPendingDebts}
                    settlementGroups={paymentPanelSettlementGroups}
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
      {toastMessage && <div className="app-toast" role="status">{toastMessage}</div>}
      {saveError && <div className="app-toast app-toast-error" role="alert">{saveError}</div>}
      <MobileNav activeView={activeView} setActiveView={setActiveView} items={currentNavItems} />
      {showContacts && (
        <div className="modal-layer">
          <ContactsPanel
            activeUser={activeUser}
            members={appUsers}
            contacts={contacts}
            onAddContact={addContact}
            onRemoveContact={removeContact}
            onClose={() => setShowContacts(false)}
          />
        </div>
      )}
      {showCreateMonimon && !editingMonimonId && (
        <CreateMonimonModal
          activeUser={activeUser}
          appUsers={appUsers}
          setMembers={setMembers}
          monimons={monimons}
          replaceMonimons={replaceMonimons}
          setSelectedMonimonId={setSelectedMonimonId}
          contacts={contacts}
          onClose={closeMonimonModals}
        />
      )}
      {editingMonimon && (
        <CreateMonimonModal
          activeUser={activeUser}
          appUsers={appUsers}
          setMembers={setMembers}
          monimon={editingMonimon}
          monimons={monimons}
          replaceMonimons={replaceMonimons}
          setSelectedMonimonId={setSelectedMonimonId}
          onDeleteMonimon={deleteMonimon}
          contacts={contacts}
          onClose={closeMonimonModals}
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
          kind={activeView === "prestamos" ? "loan" : "expense"}
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
          appUsers={appUsers}
          updateActiveUser={updateActiveUser}
          personalSpaceName={personalSpaceName}
          setPersonalSpaceName={setPersonalSpaceName}
          deleteAccount={deleteAccount}
          onClose={() => setProfileModal(null)}
        />
      )}
      {profileModal === "personal-space" && (
        <PersonalSpaceModal
          personalSpaceName={personalSpaceName}
          setPersonalSpaceName={setPersonalSpaceName}
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

function SummaryHeader({ title = "Resumen", summaryByCurrency, grossExpensesByCurrency, myExpensesByCurrency, labels, detailData, onViewDebt }) {
  const [selectedCurrency, setSelectedCurrency] = useState("ARS");
  const [openMetric, setOpenMetric] = useState(null);
  const availableCurrencies = ["ARS", "USD"].filter((currency) => summaryByCurrency[currency]);
  const currentCurrency = summaryByCurrency[selectedCurrency] ? selectedCurrency : "ARS";
  const totals = summaryByCurrency[currentCurrency] || { theyOwe: 0, iOwe: 0 };
  const grossExpenses = grossExpensesByCurrency?.[currentCurrency] || 0;
  const myExpenses = myExpensesByCurrency?.[currentCurrency] ?? totals.iOwe;
  const metricLabels = { gross: "Gastos totales", balance: "Me deben", debt: "Mi deuda", expenses: "Debes", ...(labels || {}) };
  const metricHelp = {
    gross: "Total de gastos registrados para este alcance en la moneda seleccionada.",
    balance: "Dinero que falta que otros integrantes te devuelvan segun la liquidacion actual.",
    debt: "Dinero que vos tenes pendiente de pagar para quedar al dia.",
    expenses: "Tu gasto real: tu parte final de los gastos, descontando lo que despues recuperas."
  };
  const summaryText = [
    `${title} (${currentCurrency})`,
    `${metricLabels.gross}: ${money(grossExpenses, currentCurrency)}`,
    `${metricLabels.balance}: ${money(totals.theyOwe, currentCurrency)}`,
    `${metricLabels.debt}: ${money(totals.iOwe, currentCurrency)}`,
    `${metricLabels.expenses}: ${money(myExpenses, currentCurrency)}`
  ].join("\n");
  const settlementGroups = detailData?.settlementGroups || [];
  const activeSettlementDebts = settlementGroups.flatMap((group) => (
    settlementRowsFor(group.debts || [], group.members || [], currentCurrency, group.payments || [])
      .filter((row) => row.member.id === detailData?.activeUserId)
      .flatMap((row) => row.details
        .filter((detail) => detail.type === "debt")
        .map((detail) => ({ ...detail, id: `${group.id}:${detail.id}` })))
  ));

  async function shareSummary() {
    try {
      if (navigator.share) {
        await navigator.share({ title, text: summaryText });
        return;
      }
      await navigator.clipboard.writeText(summaryText);
      window.alert("Resumen copiado al portapapeles.");
    } catch (error) {
      console.error("No se pudo compartir el resumen", error);
      window.alert("No se pudo compartir el resumen.");
    }
  }

  return (
    <section className="summary-card">
      <div className="summary-top">
        <div>
          <h1>{title}</h1>
        </div>
        <div className="summary-actions">
          <button type="button" onClick={() => window.print()} title="Imprimir resumen" aria-label="Imprimir resumen"><FileText size={16} /></button>
          <button type="button" onClick={shareSummary} title="Compartir resumen" aria-label="Compartir resumen"><Share2 size={16} /></button>
        </div>
        <label className="summary-currency-select">
          <select
            aria-label="Moneda del resumen"
            value={currentCurrency}
            onChange={(event) => setSelectedCurrency(event.target.value)}
          >
            {availableCurrencies.map((currency) => (
              <option key={currency} value={currency}>{currency}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="summary-metrics">
        <Metric id="gross" label={metricLabels.gross} value={grossExpenses} currency={currentCurrency} help={metricHelp.gross} openMetric={openMetric} setOpenMetric={setOpenMetric} />
        <Metric id="expenses" label={metricLabels.expenses} value={myExpenses} currency={currentCurrency} negative help={metricHelp.expenses} openMetric={openMetric} setOpenMetric={setOpenMetric} />
        <Metric id="debt" label={metricLabels.debt} value={totals.iOwe} currency={currentCurrency} negative help={metricHelp.debt} openMetric={openMetric} setOpenMetric={setOpenMetric} />
        <Metric id="balance" label={metricLabels.balance} value={totals.theyOwe} currency={currentCurrency} positive help={metricHelp.balance} openMetric={openMetric} setOpenMetric={setOpenMetric} />
      </div>
      <SettlementPaySummary
        debts={activeSettlementDebts}
        members={detailData?.members || []}
        currency={currentCurrency}
        onLiquidate={onViewDebt}
        actionLabel="VER DEUDA"
      />
      {openMetric && (
        <SummaryMetricDetail
          type={openMetric}
          label={metricLabels[openMetric]}
          currency={currentCurrency}
          detailData={detailData}
        />
      )}
    </section>
  );
}

function SummaryMetricDetail({ type, label, currency, detailData }) {
  if (!detailData) return null;
  if (type === "gross") {
    return <SummaryGrossDetail label={label} currency={currency} detailData={detailData} />;
  }
  if (type === "balance") {
    return <SummarySettlementDetail label={label} currency={currency} detailData={detailData} mode="recover" />;
  }
  if (type === "debt") {
    return <SummarySettlementDetail label={label} currency={currency} detailData={detailData} mode="debt" />;
  }
  return <SummaryMyExpensesDetail label={label} currency={currency} detailData={detailData} />;
}

function SummaryGrossDetail({ label, currency, detailData }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const expenseRows = (detailData.expenses || [])
    .filter((debt) => debt.currency === currency)
    .map((debt) => {
      const members = detailData.getDebtMembers?.(debt) || detailData.members || [];
      const payer = userLabel(debt.fromMemberId, members);
      return {
        id: debt.id,
        date: debtDateKey(debt),
        motive: debt.title,
        payer,
        payerId: debt.fromMemberId,
        amount: debt.amount
      };
    });
  const normalizedQuery = normalizedSearch(searchTerm);
  const visibleRows = expenseRows
    .filter((row) => {
      const matchesSearch = !normalizedQuery || normalizedSearch(`${row.date} ${displayDate(row.date)} ${row.motive} ${row.payer} ${row.amount}`).includes(normalizedQuery);
      const matchesDate = filterBy !== "date" || !dateFilter || row.date === dateFilter;
      const matchesMember = filterBy !== "member" || !memberFilter || row.payerId === memberFilter;
      return matchesSearch && matchesDate && matchesMember;
    })
    .sort((a, b) => {
      if (sortBy === "date-asc") return String(a.date).localeCompare(String(b.date));
      if (sortBy === "member") return a.payer.localeCompare(b.payer, "es");
      if (sortBy === "amount-desc") return b.amount - a.amount;
      if (sortBy === "amount-asc") return a.amount - b.amount;
      return String(b.date).localeCompare(String(a.date));
    });
  const payerOptions = [...new Map(expenseRows.map((row) => [row.payerId, row.payer])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], "es"));

  return (
    <div className="summary-detail-panel">
      <div className="summary-detail-head gross">
        <h2>{label}</h2>
        <div className="summary-detail-tools">
          <label className="summary-search">
            <Search size={16} />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar" />
          </label>
          <label className="summary-tool-select">
            <span>Filtrar por</span>
            <select value={filterBy} onChange={(event) => setFilterBy(event.target.value)}>
              <option value="">Sin filtro</option>
              <option value="date">Fecha</option>
              <option value="member">Integrante</option>
            </select>
          </label>
          {filterBy === "date" && (
            <input className="summary-filter-input" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="Fecha" />
          )}
          {filterBy === "member" && (
            <select className="summary-filter-input" value={memberFilter} onChange={(event) => setMemberFilter(event.target.value)} aria-label="Integrante">
              <option value="">Todos</option>
              {payerOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          )}
          <label className="summary-tool-select">
            <span>Ordenar por</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="date-desc">Fecha más reciente</option>
              <option value="date-asc">Fecha más antigua</option>
              <option value="member">Integrante</option>
              <option value="amount-desc">Importe más alto</option>
              <option value="amount-asc">Importe más bajo</option>
            </select>
          </label>
        </div>
      </div>
      <SummaryTable
        columns={["Fecha", "Motivo", "Pagado por", "Importe"]}
        rows={visibleRows}
        renderRow={(row) => [displayDate(row.date), row.motive, row.payer, money(row.amount, currency)]}
      />
    </div>
  );
}

function SummarySettlementDetail({ label, currency, detailData, mode }) {
  const rows = (detailData.groups || []).flatMap((group) => {
    const settlementRows = settlementRowsFor(group.expenses || [], group.members || [], currency, group.payments || []);
    return settlementRows.filter((row) => row.member.id === detailData.activeUserId).flatMap((row) => row.details
      .filter((detail) => detail.type === mode)
      .map((detail) => {
        const otherMember = group.members.find((member) => member.id === detail.otherMemberId);
        return {
          id: `${group.id}-${row.member.id}-${detail.id}`,
          member: row.member.name,
          amount: detail.amount,
          status: "Pendiente",
          other: otherMember?.name || "INTEGRANTE"
        };
      }));
  });
  const columns = mode === "recover" ? ["Deudor", "Importe", "Estado de deuda"] : ["Acreedor", "Importe", "Estado de deuda"];

  return (
    <div className="summary-detail-panel">
      <div className="summary-detail-head simple">
        <h2>{label}</h2>
      </div>
      <SummaryTable
        columns={columns}
        rows={rows}
        renderRow={(row) => [mode === "recover" ? row.other : row.other, money(row.amount, currency), row.status]}
      />
    </div>
  );
}

function SummaryMyExpensesDetail({ label, currency, detailData }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const expenseRows = (detailData.expenses || [])
    .filter((debt) => debt.currency === currency)
    .map((debt) => {
      const members = detailData.getDebtMembers?.(debt) || detailData.members || [];
      const amount = debtSplitAmountFor(debt, detailData.activeUserId, members);
      return {
        id: debt.id,
        date: debtDateKey(debt),
        motive: debt.title,
        payer: userLabel(debt.fromMemberId, members),
        payerId: debt.fromMemberId,
        amount
      };
    })
    .filter((row) => row.amount > 0.009);
  const normalizedQuery = normalizedSearch(searchTerm);
  const rows = expenseRows
    .filter((row) => {
      const matchesSearch = !normalizedQuery || normalizedSearch(`${row.date} ${displayDate(row.date)} ${row.motive} ${row.payer} ${row.amount}`).includes(normalizedQuery);
      const matchesDate = filterBy !== "date" || !dateFilter || row.date === dateFilter;
      const matchesMember = filterBy !== "member" || !memberFilter || row.payerId === memberFilter;
      return matchesSearch && matchesDate && matchesMember;
    })
    .sort((a, b) => {
      if (sortBy === "date-asc") return String(a.date).localeCompare(String(b.date));
      if (sortBy === "member") return a.payer.localeCompare(b.payer, "es");
      if (sortBy === "amount-desc") return b.amount - a.amount;
      if (sortBy === "amount-asc") return a.amount - b.amount;
      return String(b.date).localeCompare(String(a.date));
    });
  const payerOptions = [...new Map(expenseRows.map((row) => [row.payerId, row.payer])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], "es"));

  return (
    <div className="summary-detail-panel">
      <div className="summary-detail-head gross">
        <h2>{label}</h2>
        <div className="summary-detail-tools">
          <label className="summary-search">
            <Search size={16} />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar" />
          </label>
          <label className="summary-tool-select">
            <span>Filtrar por</span>
            <select value={filterBy} onChange={(event) => setFilterBy(event.target.value)}>
              <option value="">Sin filtro</option>
              <option value="date">Fecha</option>
              <option value="member">Integrante</option>
            </select>
          </label>
          {filterBy === "date" && (
            <input className="summary-filter-input" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="Fecha" />
          )}
          {filterBy === "member" && (
            <select className="summary-filter-input" value={memberFilter} onChange={(event) => setMemberFilter(event.target.value)} aria-label="Integrante">
              <option value="">Todos</option>
              {payerOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          )}
          <label className="summary-tool-select">
            <span>Ordenar por</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="date-desc">Fecha más reciente</option>
              <option value="date-asc">Fecha más antigua</option>
              <option value="member">Integrante</option>
              <option value="amount-desc">Importe más alto</option>
              <option value="amount-asc">Importe más bajo</option>
            </select>
          </label>
        </div>
      </div>
      <SummaryTable
        columns={["Fecha", "Motivo", "Importe"]}
        rows={rows}
        renderRow={(row) => [displayDate(row.date), row.motive, money(row.amount, currency)]}
      />
    </div>
  );
}

function SummaryTable({ columns, rows, renderRow }) {
  const emptyColSpan = columns.length;
  return (
    <div className="summary-table-wrap">
      <table className="summary-detail-table">
        <thead>
          <tr>
            {columns.map((column) => <th key={column}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row) => (
            <tr key={row.id}>
              {renderRow(row).map((cell, index) => <td key={`${row.id}-${index}`}>{cell}</td>)}
            </tr>
          )) : (
            <tr>
              <td className="summary-empty-cell" colSpan={emptyColSpan}>
                <EmptyState text="Todavía no hay registros." />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
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

function PersonalSpaceModal({ personalSpaceName, setPersonalSpaceName, onClose }) {
  const [spaceName, setSpaceName] = useState(personalSpaceName);
  const [error, setError] = useState("");

  function savePersonalSpace() {
    const cleanName = spaceName.trim().slice(0, 32);
    if (!cleanName) {
      setError("Ingresá un nombre.");
      return;
    }
    setPersonalSpaceName(cleanName.toUpperCase());
    onClose();
  }

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="personal-space-title">
      <div className="create-modal settings-modal">
        <div className="modal-head">
          <h2 id="personal-space-title">Editar Personal</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">x</button>
        </div>
        <label>Nombre del espacio</label>
        <input value={spaceName} maxLength={32} onChange={(event) => setSpaceName(event.target.value.toUpperCase())} />
        {error && <p className="form-error">{error}</p>}
        <button type="button" className="primary-action modal-create-btn" onClick={savePersonalSpace}>GUARDAR</button>
      </div>
    </div>
  );
}

function SettingsModal({ activeUser, appUsers, updateActiveUser, personalSpaceName, setPersonalSpaceName, deleteAccount, onClose }) {
  const [username, setUsername] = useState(activeUser.username || usernameFromProfile(activeUser));
  const [name, setName] = useState(activeUser.name);
  const [spaceName, setSpaceName] = useState(personalSpaceName);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function saveSettings() {
    const cleanUsername = normalizeUsername(username);
    const cleanName = name.trim().slice(0, 24);
    if (cleanUsername.length < 3) {
      setError("Elegí un usuario único de al menos 3 caracteres.");
      return;
    }
    const usernameExists = appUsers.some(
      (user) => user.id !== activeUser.id && normalizeUsername(user.username) === cleanUsername
    );
    if (usernameExists) {
      setError("Ese usuario único ya está en uso.");
      return;
    }
    if (!cleanName) {
      setError("Ingresá un apodo.");
      return;
    }
    updateActiveUser({ name: cleanName.toUpperCase(), username: cleanUsername });
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
        <label>Usuario único</label>
        <input
          value={username}
          maxLength={24}
          onChange={(event) => setUsername(normalizeUsername(event.target.value))}
          placeholder="usuario.unico"
        />
        <p className="settings-hint">
          Tu usuario público es {displayHandle(username)}. Sirve para que te encuentren, no para iniciar sesión.
        </p>
        <label>Apodo visible</label>
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

function ArchivePanel({ files, setFiles, activeUser }) {
  const [dragging, setDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [galleryGroupBy, setGalleryGroupBy] = useState("uploadedBy");
  const [gallerySortBy, setGallerySortBy] = useState("date-desc");
  const orderedFiles = [...files].sort((a, b) => {
    const dateCompare = String(debtDateKey({ date: a.createdAt })).localeCompare(String(debtDateKey({ date: b.createdAt })));
    return gallerySortBy === "date-asc" ? dateCompare : -dateCompare;
  });
  const galleryGroups = orderedFiles.reduce((groups, file) => {
    const groupValue = galleryGroupBy === "date"
      ? displayDate(debtDateKey({ date: file.createdAt }))
      : galleryGroupBy === "category"
        ? file.category || "General"
        : file.uploadedBy || "Usuario";
    const existing = groups.find((group) => group.label === groupValue);
    if (existing) {
      existing.files.push(file);
      return groups;
    }
    return [...groups, { label: groupValue, files: [file] }];
  }, []);

  function addFiles(fileList) {
    const imageFiles = [...fileList].filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length) return;
    const nextFiles = imageFiles.map((file) => ({
      id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
      createdAt: formatISODate(todayISO()),
      uploadedBy: activeUser?.name || "Usuario",
      category: "General"
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
      <div className="archive-gallery-heading">
        <h3 className="archive-gallery-title">Galería</h3>
        <ArchiveGalleryControls
          groupBy={galleryGroupBy}
          setGroupBy={setGalleryGroupBy}
          sortBy={gallerySortBy}
          setSortBy={setGallerySortBy}
        />
      </div>
      {galleryGroups.length ? (
        <div className="archive-gallery-groups">
          {galleryGroups.map((group) => (
            <section key={group.label} className="archive-gallery-group">
              <h4>{group.label}</h4>
              <div className="archive-grid">
                {group.files.map((file) => (
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
                      <small>{file.createdAt} · {file.uploadedBy || "Usuario"} · {file.category || "General"} · {(file.size / 1024).toFixed(0)} KB</small>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState className="archive-gallery-empty" text="Todavía no hay elementos archivados." />
      )}
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

function ArchiveGalleryControls({ groupBy, setGroupBy, sortBy, setSortBy }) {
  return (
    <div className="archive-gallery-tools">
      <label>
        <span>Agrupar por</span>
        <select value={groupBy} onChange={(event) => setGroupBy(event.target.value)} aria-label="Agrupar galería por">
          <option value="uploadedBy">Subido por</option>
          <option value="date">Fecha</option>
          <option value="category">Categoría</option>
        </select>
      </label>
      <label>
        <span>Ordenar por</span>
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Ordenar galería por">
          <option value="date-desc">Fecha más reciente</option>
          <option value="date-asc">Fecha más antigua</option>
        </select>
      </label>
    </div>
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

function CreateMonimonModal({ activeUser, appUsers, setMembers, monimon, monimons, replaceMonimons, setSelectedMonimonId, onDeleteMonimon, contacts, onClose }) {
  const [monimonName, setMonimonName] = useState(monimon?.name || "");
  const [groupIcon, setGroupIcon] = useState(monimon?.icon || "home");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [memberIds, setMemberIds] = useState(monimon?.members || [activeUser.id]);
  const [adminIds, setAdminIds] = useState(monimon?.adminIds?.length ? monimon.adminIds : [activeUser.id]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [ghostName, setGhostName] = useState("");
  const [editingGuestId, setEditingGuestId] = useState(null);
  const [editingGuestName, setEditingGuestName] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [error, setError] = useState("");
  const isEditing = Boolean(monimon);
  const contactMemberIds = new Set(
    (contacts || [])
      .filter((contact) => contact.ownerProfileId === activeUser.id && contact.status !== "removed")
      .map((contact) => contact.memberId)
  );
  const availableUsers = appUsers.filter((user) => (
    !memberIds.includes(user.id)
    && contactMemberIds.has(user.id)
    && user.profileId
    && user.memberStatus !== "ghost"
  ));

  function addMember() {
    const nextMemberId = selectedMemberId || availableUsers[0]?.id;
    if (!nextMemberId) return;
    setMemberIds((items) => [...items, nextMemberId]);
    setSelectedMemberId("");
  }

  function removeMember(indexToRemove) {
    const memberId = memberIds[indexToRemove];
    if (memberId === activeUser.id) {
      setError("Tu usuario no se puede quitar del grupo que estás creando.");
      return;
    }
    const memberName = appUsers.find((user) => user.id === memberId)?.name || "este integrante";
    if (isEditing) {
      const confirmed = window.confirm(
        `Quitar a ${memberName} del grupo?\n\nSus movimientos y registros se conservan, pero dejará de aparecer como integrante activo. Si era una persona fantasma, vuelve a quedar como referencia histórica.`
      );
      if (!confirmed) return;
    }
    setMemberIds((items) => items.filter((_, index) => index !== indexToRemove));
    setAdminIds((items) => {
      const nextAdmins = items.filter((id) => id !== memberId);
      return nextAdmins.length ? nextAdmins : [activeUser.id];
    });
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

  function toggleAdmin(memberId) {
    setAdminIds((items) => {
      if (items.includes(memberId)) {
        const nextAdmins = items.filter((id) => id !== memberId);
        return nextAdmins.length ? nextAdmins : items;
      }
      return [...items, memberId];
    });
  }

  function startEditingGuest(memberId) {
    const member = appUsers.find((user) => user.id === memberId);
    setEditingGuestId(memberId);
    setEditingGuestName(member?.name || "");
    setError("");
  }

  function saveGuestName() {
    const cleanName = editingGuestName.trim().slice(0, 40);
    if (!cleanName || !editingGuestId) {
      setError("Ingresá un nombre para el invitado.");
      return;
    }
    setMembers((items) => items.map((member) => (
      member.id === editingGuestId
        ? { ...member, displayName: cleanName.toUpperCase() }
        : member
    )));
    setEditingGuestId(null);
    setEditingGuestName("");
    setError("");
  }

  function saveMonimon() {
    const cleanName = monimonName.trim();
    if (!cleanName) {
      setError("Ingresá un nombre para el grupo.");
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
      const cleanAdminIds = adminIds.filter((id) => cleanMembers.includes(id));
      replaceMonimons(monimons.map((item) => (item.id === monimon.id ? { ...item, name: cleanName, members: cleanMembers, icon: groupIcon, adminIds: cleanAdminIds.length ? cleanAdminIds : [cleanMembers[0]] } : item)));
      setSelectedMonimonId(monimon.id);
      onClose();
      return;
    }
    const id = `monimon-${Date.now()}`;
    const cleanAdminIds = adminIds.filter((adminId) => cleanMembers.includes(adminId));
    replaceMonimons([...monimons, { id, name: cleanName, members: cleanMembers, icon: groupIcon, adminIds: cleanAdminIds.length ? cleanAdminIds : [activeUser.id] }]);
    setSelectedMonimonId(id);
    onClose();
  }

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="create-monimon-title">
      <div className="create-modal monimon-editor-modal">
        <div className="modal-head">
          <h2 id="create-monimon-title">{isEditing ? "Editar grupo" : "Crear grupo"}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <section className="monimon-editor-section">
          <label>NOMBRE DE GRUPO:</label>
          <div className="group-name-row">
            <div className="group-emoji-dropdown">
              <button
                type="button"
                className="group-emoji-trigger"
                onClick={() => setIconPickerOpen((open) => !open)}
                aria-label={`Icono del grupo: ${groupIconOptions.find((option) => option.id === groupIcon)?.label || "Casa"}`}
                aria-expanded={iconPickerOpen}
              >
                {groupIconOptions.find((option) => option.id === groupIcon)?.emoji || groupIconOptions[0].emoji}
              </button>
              {iconPickerOpen && (
                <div className="group-emoji-menu">
                  {groupIconOptions.map(({ id, label, emoji }) => (
                    <button
                      type="button"
                      key={id}
                      className={`group-emoji-option ${groupIcon === id ? "active" : ""}`}
                      onClick={() => {
                        setGroupIcon(id);
                        setIconPickerOpen(false);
                      }}
                    >
                      <span aria-hidden="true">{emoji}</span>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input value={monimonName} maxLength={50} onChange={(event) => setMonimonName(event.target.value.slice(0, 50))} placeholder="Por ejemplo: Viaje a Narnia" />
          </div>
        </section>
        <section className="monimon-editor-section">
          <label>INTEGRANTES:</label>
          <div className="member-chip-list">
            {memberIds.map((memberId, index) => {
              const member = appUsers.find((user) => user.id === memberId);
              const memberName = member?.name || (memberId === activeUser.id ? activeUser.name : "INTEGRANTE");
              const isOwnUser = memberId === activeUser.id;
              const isEditableGuest = isEditing && !isOwnUser && !member?.profileId;
              return (
                <span className={`member-chip ${editingGuestId === memberId ? "editing" : ""}`} key={`${memberId}-${index}`}>
                  {editingGuestId === memberId ? (
                    <>
                      <input
                        value={editingGuestName}
                        maxLength={40}
                        onChange={(event) => setEditingGuestName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") saveGuestName();
                          if (event.key === "Escape") {
                            setEditingGuestId(null);
                            setEditingGuestName("");
                          }
                        }}
                        autoFocus
                      />
                      <button type="button" onClick={saveGuestName} aria-label="Guardar nombre de invitado">
                        <Check size={15} />
                      </button>
                    </>
                  ) : (
                    <>
                      {memberName}
                      {adminIds.includes(memberId) && <small className="member-admin-badge">Admin</small>}
                      {isEditableGuest && (
                        <button type="button" onClick={() => startEditingGuest(memberId)} aria-label="Editar nombre de invitado">
                          <Pencil size={14} />
                        </button>
                      )}
                      {memberIds.length > 1 && !isOwnUser && (
                        <button type="button" onClick={() => removeMember(index)} aria-label="Eliminar integrante">
                          <X size={15} />
                        </button>
                      )}
                    </>
                  )}
                </span>
              );
            })}
          </div>
          <div className="member-add-grid">
            <select value={selectedMemberId} onChange={(event) => setSelectedMemberId(event.target.value)} disabled={!availableUsers.length}>
              <option value="">Seleccionar contacto</option>
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
            <button type="button" className="member-add square" onClick={addMember} disabled={!availableUsers.length} aria-label="Agregar integrante">
              <Plus size={22} />
            </button>
            <input value={ghostName} maxLength={40} onChange={(event) => setGhostName(event.target.value)} placeholder="Añadir invitado" />
            <button type="button" className="member-add square" onClick={addGhostMember} aria-label="Agregar no registrado">
              <Plus size={22} />
            </button>
          </div>
        </section>
        <section className="monimon-editor-section group-admin-list">
          <div>
            <b>Administradores</b>
            <small>Solo administradores pueden registrar pagos directos. Siempre debe quedar al menos uno.</small>
          </div>
          {memberIds.map((memberId) => {
            const member = appUsers.find((user) => user.id === memberId);
            const checked = adminIds.includes(memberId);
            const isLastAdmin = checked && adminIds.length === 1;
            return (
              <label key={memberId} className="group-admin-option">
                <span>{member?.name || (memberId === activeUser.id ? activeUser.name : "INTEGRANTE")}</span>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={isLastAdmin}
                  onChange={() => toggleAdmin(memberId)}
                />
              </label>
            );
          })}
        </section>
        <section className="monimon-editor-section group-advanced-section">
          <button
            type="button"
            className="advanced-toggle"
            onClick={() => setAdvancedOpen((open) => !open)}
            aria-expanded={advancedOpen}
          >
            <span>Opciones avanzadas</span>
            {advancedOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {advancedOpen && (
            <div className="advanced-options-list">
              <label className="advanced-switch-row disabled">
                <span>
                  <b>Liquidaciones simplificadas</b>
                  <small>Modo activo para el primer release. Las liquidaciones detalladas quedan para más adelante.</small>
                </span>
                <input type="checkbox" checked readOnly disabled />
              </label>
              <label className="advanced-switch-row disabled">
                <span>
                  <b>Pagos directos</b>
                  <small>Permite registrar pagos sin esperar aprobación. El modo con consentimiento queda preparado para futuro.</small>
                </span>
                <input type="checkbox" checked readOnly disabled />
              </label>
            </div>
          )}
        </section>
        {error && <p className="form-error">{error}</p>}
        <div className="monimon-modal-actions monimon-editor-section">
          <button type="button" className="primary-action modal-create-btn" onClick={saveMonimon}>
            {isEditing ? "ACTUALIZAR CAMBIOS" : "CREAR"}
          </button>
        </div>
        {isEditing && (
          <div className="delete-monimon-zone">
            <button
              type="button"
              className="delete-monimon-btn"
              onClick={() => {
                onDeleteMonimon?.(monimon);
              }}
            >
              <Trash2 size={16} /> Eliminar grupo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DebtPanel({ activeUser, appUsers, getDebtMembers, incomingDebts, outgoingDebts, incomingTotal, outgoingTotal, selectedDebtIds, setSelectedDebtIds, isMonimonMode, preview, title, action, onNewDebt, onEditDebt, onDeleteDebt, onRepeatDebt }) {
  const hasOutgoingDebts = preview ? outgoingDebts.slice(0, 2).length > 0 : outgoingDebts.length > 0;
  const groupedDebts = uniqueDebtsById(incomingDebts, outgoingDebts);
  return (
    <section className="glass-card panel">
      <PanelTitle icon={<ListChecks size={18} />} title={title || (isMonimonMode ? "Gastos" : "Mis gastos")} action={preview ? null : action || "Nuevo gasto"} onAction={onNewDebt} />
      {preview ? (
        <div className={`split-list preview ${hasOutgoingDebts ? "" : "single"}`.trim()}>
          <DebtGroup
            title="Te deben"
            tone="positive"
            debts={incomingDebts.slice(0, 3)}
            totalOverride={incomingTotal}
            selectedDebtIds={selectedDebtIds}
            setSelectedDebtIds={setSelectedDebtIds}
            onEditDebt={onEditDebt}
            onDeleteDebt={onDeleteDebt}
            onRepeatDebt={onRepeatDebt}
            amountForDebt={(debt) => debtReceivableFor(debt, activeUser.id, getDebtMembers?.(debt) || appUsers)}
            getDebtMembers={getDebtMembers}
            appUsers={appUsers}
          />
          {hasOutgoingDebts && (
            <DebtGroup
              title="Debes"
              tone="negative"
              debts={outgoingDebts.slice(0, 2)}
              totalOverride={outgoingTotal}
              onEditDebt={onEditDebt}
              onDeleteDebt={onDeleteDebt}
              onRepeatDebt={onRepeatDebt}
              amountForDebt={(debt) => debtShareFor(debt, activeUser.id, getDebtMembers?.(debt) || appUsers)}
              getDebtMembers={getDebtMembers}
              appUsers={appUsers}
            />
          )}
        </div>
      ) : (
        <DebtGroupedList
          debts={groupedDebts}
          selectedDebtIds={selectedDebtIds}
          setSelectedDebtIds={setSelectedDebtIds}
          onEditDebt={onEditDebt}
          onDeleteDebt={onDeleteDebt}
          onRepeatDebt={onRepeatDebt}
          getDebtMembers={getDebtMembers}
          appUsers={appUsers}
        />
      )}
    </section>
  );
}

function DebtGroupedList({ debts, selectedDebtIds, setSelectedDebtIds, appUsers, getDebtMembers, onEditDebt, onDeleteDebt, onRepeatDebt }) {
  const groupedDebts = groupDebtsByDate(debts);
  return (
    <div className="debt-list debt-list-grouped">
      {groupedDebts.length ? (
        groupedDebts.map((group) => (
          <div className="debt-date-group" key={group.key}>
            <div className="debt-date-heading">{group.label}</div>
            <div className="debt-date-grid">
              {group.items.map((debt) => (
                <DebtRow
                  key={debt.id}
                  debt={debt}
                  checked={selectedDebtIds?.includes(debt.id)}
                  onToggle={() => setSelectedDebtIds?.((items) => toggle(items, debt.id))}
                  onEditDebt={onEditDebt}
                  onDeleteDebt={onDeleteDebt}
                  onRepeatDebt={onRepeatDebt}
                  members={getDebtMembers?.(debt) || appUsers || []}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <EmptyState text="Todavía no hay registros." />
      )}
    </div>
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
  settlementGroups,
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
  const [paymentTargetDetail, setPaymentTargetDetail] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(paymentDate.slice(0, 7));
  const [settlementCurrency, setSettlementCurrency] = useState("ARS");
  const [expandedSettlementIds, setExpandedSettlementIds] = useState([]);
  const pendingTotal = pendingDebts.reduce((sum, debt) => sum + debtShareFor(debt, activeUser.id, monimonMemberOptions), 0);
  const settlementCurrencies = ["ARS", "USD"].filter((currency) => debts.some((debt) => debt.currency === currency));
  const availableSettlementCurrencies = settlementCurrencies.length ? settlementCurrencies : ["ARS"];
  const currentSettlementCurrency = availableSettlementCurrencies.includes(settlementCurrency) ? settlementCurrency : availableSettlementCurrencies[0];
  const effectiveSettlementGroups = settlementGroups?.length
    ? settlementGroups
    : [{ id: selectedMonimonId, name: selectedMonimon?.name || "Grupo", debts, members: monimonMemberOptions }];
  const membersForPaymentTarget = (groupId) => (
    effectiveSettlementGroups.find((group) => group.id === groupId)?.members || monimonMemberOptions
  );
  const settlementRows = effectiveSettlementGroups.flatMap((group) => (
    settlementRowsFor(group.debts || [], group.members || [], currentSettlementCurrency, group.payments || []).map((row) => ({
      ...row,
      id: `${group.id}:${row.member.id}`,
      groupId: group.id,
      groupName: group.name,
      details: row.details.map((detail) => ({
        ...detail,
        id: `${group.id}:${detail.id}`,
        groupId: group.id,
        groupName: group.name
      }))
    }))
  ));
  const activeSettlementDebts = settlementRows
    .filter((row) => row.member.id === activeUser.id)
    .flatMap((row) => row.details.filter((detail) => detail.type === "debt"));
  const activePaymentTarget = paymentTargetDetail || activeSettlementDebts[0] || null;
  const activePaymentTargetMembers = activePaymentTarget ? membersForPaymentTarget(activePaymentTarget.groupId) : monimonMemberOptions;
  const activePaymentTargetMember = activePaymentTargetMembers.find((member) => member.id === activePaymentTarget?.otherMemberId);
  const activePaymentTargetAmount = activePaymentTarget?.amount || 0;
  const paymentTargetToId = activePaymentTarget?.otherMemberId || toId;
  const paymentPreviewTotal = paymentMode === "total" ? activePaymentTargetAmount : parseAmountInput(manualAmount);
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
    setPaymentTargetDetail(null);
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
    const selectedValue = paymentMode === "total" ? activePaymentTargetAmount : 0;
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
      toId: paymentTargetToId,
      debtIds: [],
      amountOverride: paymentMode === "total" ? activePaymentTargetAmount : null,
      monimonIdOverride: activePaymentTarget?.groupId || selectedMonimonId
    });
    if (!saved) {
      setPaymentError((current) => current || "Revisá el formulario antes de guardar.");
      return;
    }
    setShowNewPayment(false);
  }

  return (
    <section className={`glass-card panel ${compact ? "compact-panel" : ""}`}>
      <PanelTitle icon={<ReceiptText size={18} />} title="Liquidaciones" />
      <div className="settlements-toolbar">
        <h3>Saldos totales</h3>
        <label className="summary-currency-select settlements-currency-select">
          <select
            aria-label="Moneda de liquidaciones"
            value={currentSettlementCurrency}
            onChange={(event) => setSettlementCurrency(event.target.value)}
          >
            {availableSettlementCurrencies.map((currency) => (
              <option key={currency} value={currency}>{currency}</option>
            ))}
          </select>
        </label>
      </div>
      <SettlementRows
        rows={settlementRows}
        members={monimonMemberOptions}
        activeUserId={activeUser.id}
        currency={currentSettlementCurrency}
        expandedIds={expandedSettlementIds}
        setExpandedIds={setExpandedSettlementIds}
        personalOnly={!isMonimonMode}
        onInformPayment={(detail) => {
          setPaymentTargetDetail(detail || null);
          setFromId(activeUser.id);
          setToId(detail?.otherMemberId || toId);
          setPaymentCurrency(currentSettlementCurrency);
          setPaymentMode("total");
          setManualAmount("");
          setShowNewPayment(true);
        }}
      />
      {showNewPayment && createPortal((
        <div className="modal-layer payment-modal-layer" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
          <div className="create-modal form-modal">
            <div className="modal-head">
              <h2 id="payment-modal-title">Nueva liquidación</h2>
              <button type="button" onClick={cancelPayment} aria-label="Cerrar">x</button>
            </div>
            <div className="new-payment-box">
          <label>Fecha de liquidación</label>
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
            <input value={formatISODate(paymentDate)} readOnly aria-label="Fecha de liquidación" />
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
          <div className="payment-direction readonly">
            <label>
              <span>De</span>
              <strong>{userLabel(activeUser.id, activePaymentTargetMembers)}</strong>
            </label>
            <label>
              <span>Para</span>
              <strong>{activePaymentTargetMember?.name || userLabel(paymentTargetToId, activePaymentTargetMembers)}</strong>
            </label>
          </div>
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
            <button type="button" onClick={savePayment} className="primary-action save-payment">Registrar pago</button>
          </div>
            </div>
          </div>
        </div>
      ), document.body)}
      {payments.length > 0 && <PaymentRows payments={payments} appUsers={monimonMemberOptions} onEditPayment={onEditPayment} onDeletePayment={onDeletePayment} showActions showGroupColumn={false} />}
    </section>
  );
}

function SettlementPaySummary({ debts, members, currency, onLiquidate, actionLabel = "INFORMAR PAGO", showClear = true }) {
  const totalDebt = debts.reduce((sum, detail) => sum + detail.amount, 0);
  if (totalDebt <= 0.009) {
    if (!showClear) return null;
    return (
      <div className="settlement-pay-summary is-clear">
        <strong>ESTÁS AL DÍA, NO TENES DEUDAS PENDIENTES :)</strong>
      </div>
    );
  }
  const firstCreditor = members.find((member) => member.id === debts[0]?.otherMemberId);
  const creditorName = firstCreditor?.name || "INTEGRANTE";

  return (
    <div className="settlement-pay-summary">
      <div>
        {debts.length === 1 ? (
          <strong className="settlement-pay-title">
            TENÉS UNA DEUDA PENDIENTE CON <span>{creditorName}</span>
          </strong>
        ) : (
          <strong className="settlement-pay-title">
            TENÉS DEUDAS PENDIENTES
          </strong>
        )}
        {debts.length > 1 && (
          <div className="settlement-pay-lines">
            {debts.map((detail) => {
              const creditor = members.find((member) => member.id === detail.otherMemberId);
              return (
                <span key={detail.id}>
                  {money(detail.amount, currency)} a {creditor?.name || "INTEGRANTE"}
                </span>
              );
            })}
          </div>
        )}
      </div>
      <button type="button" className="settlement-pay-btn" onClick={() => onLiquidate?.(debts[0])}>{actionLabel}</button>
    </div>
  );
}

function SettlementRows({ rows, members, activeUserId, currency, expandedIds, setExpandedIds, personalOnly = false, onInformPayment }) {
  const scopedRows = personalOnly ? rows.filter((row) => row.member.id === activeUserId) : rows;
  const visibleRows = scopedRows.filter((row) => row.member.id === activeUserId || row.details.length > 0 || Math.abs(row.balance) > 0.009);
  const rowsToShow = personalOnly
    ? visibleRows.filter((row) => row.details.length > 0 || Math.abs(row.balance) > 0.009)
    : (visibleRows.length ? visibleRows : scopedRows);
  if (!rowsToShow.length) {
    return (
      <div className="settlement-list">
        <article className="settlement-card settlement-card-empty">
          <span className="settlement-empty">No hay saldos pendientes.</span>
        </article>
      </div>
    );
  }
  return (
    <div className="settlement-list">
      {rowsToShow.map((row) => {
        const rowKey = row.id || row.member.id;
        const isExpanded = expandedIds.includes(rowKey);
        const balanceClass = row.balance > 0 ? "positive" : row.balance < 0 ? "negative" : "neutral";
        const rowTitle = personalOnly ? row.groupName || row.member.name : row.member.name;
        return (
          <article key={rowKey} className={`settlement-card ${isExpanded ? "expanded" : ""}`}>
            <button
              type="button"
              className="settlement-main"
              onClick={() => setExpandedIds((items) => toggle(items, rowKey))}
              aria-expanded={isExpanded}
            >
              <span className="settlement-member">{rowTitle}</span>
              <span className="settlement-balance-stack">
                <strong className={`settlement-balance ${balanceClass}`}>
                  {row.balance > 0 ? "+" : row.balance < 0 ? "-" : ""}
                  {money(Math.abs(row.balance), currency)}
                </strong>
                <span className="settlement-detail-hint">+ Detalle</span>
              </span>
            </button>
            {isExpanded && (
              <div className="settlement-details">
                {row.details.length ? row.details.map((detail) => {
                  const otherMember = members.find((member) => member.id === detail.otherMemberId);
                  const canInformPayment = row.member.id === activeUserId && detail.type === "debt";
                  return (
                    <div key={detail.id} className={`settlement-detail-line ${detail.type}`}>
                      <b>{detail.type === "recover" ? "Recupera" : "Debe"}</b>
                      <strong>{money(detail.amount, currency)}</strong>
                      <span className="settlement-other-party">
                        <span className="settlement-relation">{detail.type === "recover" ? "de" : "a"}</span>
                        <span className="settlement-other-name">{otherMember?.name || "INTEGRANTE"}</span>
                      </span>
                      {canInformPayment && (
                        <button type="button" className="settlement-inform-pay-btn" onClick={() => onInformPayment(detail)}>
                          INFORMAR PAGO
                        </button>
                      )}
                    </div>
                  );
                }) : (
                  <span className="settlement-empty">No hay saldos pendientes.</span>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function PaymentDebtCards({ debts, selectedDebtIds, setSelectedDebtIds, members }) {
  const [expandedDebtIds, setExpandedDebtIds] = useState([]);
  return (
    <div className="payment-card-grid">
      {debts.length ? (
        debts.map((debt) => {
          const isSelected = selectedDebtIds.includes(debt.id);
          const isExpanded = expandedDebtIds.includes(debt.id);
          const counterparty = debtCounterpartyParts(debt, members);
          const splitAmount = debt.kind !== "loan" && members.length > 1 ? debt.amount / members.length : debt.amount;
          return (
            <article
              key={debt.id}
              className={`payment-debt-card ${isSelected ? "selected" : ""}`}
              onClick={() => setSelectedDebtIds((items) => toggle(items, debt.id))}
            >
              <div className="payment-card-head">
                <span className={`check ${isSelected ? "active" : ""}`}>{isSelected && <Check size={13} />}</span>
                <time>{debt.date}</time>
              </div>
              <b className="payment-card-title"><span className="debt-category-emoji">{categoryFor(debt.category, debt.kind === "loan" ? "loan" : "general").emoji}</span>{debt.title}</b>
              <strong><span>Importe</span> {money(splitAmount, debt.currency)}</strong>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setExpandedDebtIds((items) => toggle(items, debt.id));
                }}
              >
                {isExpanded ? "- Detalles" : "+ Detalles"}
              </button>
              {isExpanded && (
                <div className="payment-card-details">
                  <span>Pagado por <b>{counterparty.fromName}</b></span>
                  <span>Importe total <b>{money(debt.amount, debt.currency)}</b></span>
                </div>
              )}
            </article>
          );
        })
      ) : (
        <EmptyState text="Todavía no hay pagos pendientes." />
      )}
    </div>
  );
}

function DebtModal({ activeUser, appUsers, selectedMonimon, selectedMonimonId, title: modalTitle = "Nuevo gasto", kind = "expense", registerDebt, onClose }) {
  const monimonMemberOptions = selectedMonimon ? selectedMonimon.members.map((id) => appUsers.find((user) => user.id === id)).filter(Boolean) : appUsers;
  const otherUser = monimonMemberOptions.find((user) => user.id !== activeUser.id) || appUsers.find((user) => user.id !== activeUser.id);
  const isMonimonMode = selectedMonimonId !== "personal";
  const isExpense = kind === "expense";
  const allowGroupTarget = kind === "expense" && monimonMemberOptions.length > 2;
  const splitParticipants = isMonimonMode ? monimonMemberOptions : [activeUser, otherUser].filter(Boolean);
  const [fromId, setFromId] = useState(activeUser.id);
  const [toId, setToId] = useState(kind === "loan" ? otherUser?.id : groupTargetId(activeUser, monimonMemberOptions, isMonimonMode));
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(kind === "loan" ? "loan" : "general");
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [splitMode, setSplitMode] = useState("equal");
  const [selectedSplitMemberIds, setSelectedSplitMemberIds] = useState(() => splitParticipants.map((member) => member.id));
  const [splitAmountInputs, setSplitAmountInputs] = useState({});
  const [splitPercentages, setSplitPercentages] = useState({});
  const [currency, setCurrency] = useState("ARS");
  const [date, setDate] = useState(todayISO());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(todayISO().slice(0, 7));
  const [receiptFileName, setReceiptFileName] = useState("");
  const [error, setError] = useState("");

  function saveDebt() {
    const totalAmount = parseAmountInput(amountInput);
    const selectedSplitParticipants = splitParticipants.filter((member) => selectedSplitMemberIds.includes(member.id));
    if (isExpense && !selectedSplitParticipants.length) {
      setError("Seleccioná al menos un integrante para dividir el gasto.");
      return;
    }
    if (!isExpense && isMonimonMode && fromId === toId) {
      setError("De y Para no pueden ser la misma persona.");
      return;
    }
    if (isExpense && splitMode === "amount") {
      const assignedAmount = selectedSplitParticipants.reduce((sum, member) => sum + parseAmountInput(splitAmountInputs[member.id] || ""), 0);
      if (Math.abs(assignedAmount - totalAmount) > 0.01) {
        setError("Los importes asignados tienen que sumar el total del gasto.");
        return;
      }
    }
    if (isExpense && splitMode === "percent") {
      const assignedPercent = selectedSplitParticipants.reduce((sum, member) => sum + (Number(String(splitPercentages[member.id] || "").replace(",", ".")) || 0), 0);
      if (Math.abs(assignedPercent - 100) > 0.01) {
        setError("Los porcentajes tienen que sumar 100%.");
        return;
      }
    }
    const splitPayload = isExpense
      ? buildSplitPayload({ splitMode, splitAmountInputs, splitPercentages, totalAmount, participants: selectedSplitParticipants })
      : { splitMode: "equal", splitAmounts: {}, splitPercentages: {} };
    const saved = registerDebt({
      fromId: isMonimonMode ? fromId : otherUser.id,
      toId: isExpense ? "group" : isMonimonMode ? toId : activeUser.id,
      title: title || "General",
      category,
      amount: totalAmount,
      currency,
      date,
      kind,
      splitParticipantIds: selectedSplitParticipants.map((member) => member.id),
      ...splitPayload
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
          <div className="expense-form-row two-columns">
            <label>
              <span>{kind === "loan" ? "Fecha de préstamo" : "Fecha de gasto"}</span>
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
            </label>
            <label>
              <span>Motivo</span>
              <CategoryReasonInput
                category={category}
                setCategory={setCategory}
                menuOpen={categoryMenuOpen}
                setMenuOpen={setCategoryMenuOpen}
                value={title}
                onChange={setTitle}
                placeholder="General"
              />
            </label>
          </div>
          <div className="expense-form-row two-columns">
            {isMonimonMode ? (
              <label>
                <span>Pagado por</span>
                <select value={fromId} onChange={(event) => setFromId(event.target.value)}>
                  {monimonMemberOptions.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
              </label>
            ) : <span />}
            {(!isExpense && isMonimonMode) ? (
              <label>
                <span>Para</span>
                <select value={toId} onChange={(event) => setToId(event.target.value)}>
                  {allowGroupTarget && <option value="group">GRUPO</option>}
                  {monimonMemberOptions.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
              </label>
            ) : (
              <label>
                <span>Importe</span>
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
              </label>
            )}
          </div>
          {!isExpense && (
            <label>
              <span>Importe</span>
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
            </label>
          )}
          {isExpense && (
            <>
              <SplitAdjustmentsTable
                participants={splitParticipants}
                currency={currency}
                totalAmount={parseAmountInput(amountInput)}
                splitMode={splitMode}
                setSplitMode={setSplitMode}
                splitAmountInputs={splitAmountInputs}
                setSplitAmountInputs={setSplitAmountInputs}
                splitPercentages={splitPercentages}
                setSplitPercentages={setSplitPercentages}
                selectedMemberIds={selectedSplitMemberIds}
                setSelectedMemberIds={setSelectedSplitMemberIds}
              />
              <ReceiptDropzone fileName={receiptFileName} setFileName={setReceiptFileName} />
            </>
          )}
          {error && <p className="form-error payment-error">{error}</p>}
          <button type="button" onClick={saveDebt} className="primary-action save-payment save-debt">
            {kind === "loan" ? "Guardar préstamo" : "Guardar gasto"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryReasonInput({ category, setCategory, menuOpen, setMenuOpen, value, onChange, placeholder }) {
  const selectedCategory = categoryFor(category);

  return (
    <div className="category-reason-row">
      <div className="category-dropdown">
        <button
          type="button"
          className="category-trigger"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={`Categoría: ${selectedCategory.label}`}
          aria-expanded={menuOpen}
        >
          {selectedCategory.emoji}
        </button>
        {menuOpen && (
          <div className="category-menu">
            {expenseCategoryOptions.map(({ id, label, emoji }) => (
              <button
                type="button"
                key={id}
                className={`category-option ${category === id ? "active" : ""}`}
                onClick={() => {
                  setCategory(id);
                  setMenuOpen(false);
                }}
              >
                <span aria-hidden="true">{emoji}</span>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      <input value={value} maxLength={50} onChange={(event) => onChange(event.target.value.slice(0, 50))} placeholder={placeholder} />
    </div>
  );
}

function buildSplitPayload({ splitMode, splitAmountInputs, splitPercentages, totalAmount, participants }) {
  if (splitMode === "amount") {
    const splitAmounts = participants.reduce((result, member) => ({
      ...result,
      [member.id]: parseAmountInput(splitAmountInputs[member.id] || "")
    }), {});
    return { splitMode, splitAmounts, splitPercentages: {} };
  }
  if (splitMode === "percent") {
    const cleanPercentages = participants.reduce((result, member) => ({
      ...result,
      [member.id]: Number(String(splitPercentages[member.id] || "").replace(",", ".")) || 0
    }), {});
    const splitAmounts = participants.reduce((result, member) => ({
      ...result,
      [member.id]: totalAmount * ((cleanPercentages[member.id] || 0) / 100)
    }), {});
    return { splitMode, splitAmounts, splitPercentages: cleanPercentages };
  }
  const equalAmount = participants.length ? totalAmount / participants.length : 0;
  const splitAmounts = participants.reduce((result, member) => ({
    ...result,
    [member.id]: equalAmount
  }), {});
  return { splitMode: "equal", splitAmounts, splitPercentages: {} };
}

function SplitAdjustmentsTable({
  participants,
  currency,
  totalAmount,
  splitMode,
  setSplitMode,
  splitAmountInputs,
  setSplitAmountInputs,
  splitPercentages,
  setSplitPercentages,
  selectedMemberIds,
  setSelectedMemberIds
}) {
  const selectedParticipants = participants.filter((member) => selectedMemberIds.includes(member.id));
  const allSelected = participants.length > 0 && selectedParticipants.length === participants.length;
  const assignedAmount = selectedParticipants.reduce((sum, member) => sum + parseAmountInput(splitAmountInputs[member.id] || ""), 0);
  const assignedPercent = selectedParticipants.reduce((sum, member) => sum + (Number(String(splitPercentages[member.id] || "").replace(",", ".")) || 0), 0);
  const remainingAmount = totalAmount - assignedAmount;
  const remainingPercent = 100 - assignedPercent;
  const remainingText = splitMode === "amount"
    ? `${remainingAmount < 0 ? "Excedido por" : "Resta asignar"} ${money(Math.abs(remainingAmount), currency)}`
    : splitMode === "percent"
      ? `${remainingPercent < 0 ? "Excedido por" : "Resta asignar"} ${Math.abs(remainingPercent).toLocaleString("es-AR", { maximumFractionDigits: 2 })}%`
      : "Resta asignar";
  const remainingIsOver = (splitMode === "amount" && remainingAmount < 0) || (splitMode === "percent" && remainingPercent < 0);

  function amountFor(memberId) {
    if (!participants.length) return 0;
    if (!selectedMemberIds.includes(memberId)) return 0;
    if (splitMode === "amount") return parseAmountInput(splitAmountInputs[memberId] || "");
    if (splitMode === "percent") {
      const percent = Number(String(splitPercentages[memberId] || "").replace(",", ".")) || 0;
      return totalAmount * (percent / 100);
    }
    return selectedParticipants.length ? totalAmount / selectedParticipants.length : 0;
  }

  return (
    <section className="split-adjustments">
      <div className="split-adjustments-top">
        <label htmlFor="split-mode">Ajustes por</label>
        <select id="split-mode" value={splitMode} onChange={(event) => setSplitMode(event.target.value)}>
          <option value="equal">Igual</option>
          <option value="amount">Importe</option>
          <option value="percent">Porcentaje</option>
        </select>
      </div>
      <p className={`split-remaining ${remainingIsOver ? "over" : ""} ${splitMode === "equal" ? "reserved" : ""}`}>{remainingText}</p>
      <div className={`split-table ${splitMode}`}>
        <div className="split-table-head">
          <label className="split-check-cell">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(event) => {
                setSelectedMemberIds(event.target.checked ? participants.map((member) => member.id) : []);
                if (!event.target.checked) {
                  setSplitAmountInputs({});
                  setSplitPercentages({});
                }
              }}
              aria-label="Seleccionar todos los integrantes"
            />
          </label>
          <span>Integrante</span>
          <span>Porcentaje</span>
          <span>Monto</span>
        </div>
        {participants.map((member) => (
          <div className={`split-table-row ${selectedMemberIds.includes(member.id) ? "" : "disabled"}`} key={member.id}>
            <label className="split-check-cell">
              <input
                type="checkbox"
                checked={selectedMemberIds.includes(member.id)}
                onChange={(event) => {
                  setSelectedMemberIds((items) => (
                    event.target.checked
                      ? [...new Set([...items, member.id])]
                      : items.filter((id) => id !== member.id)
                  ));
                  if (!event.target.checked) {
                    setSplitAmountInputs((items) => ({ ...items, [member.id]: "" }));
                    setSplitPercentages((items) => ({ ...items, [member.id]: "" }));
                  }
                }}
                aria-label={`Seleccionar ${member.name}`}
              />
            </label>
            <span>{member.name}</span>
            {splitMode === "percent" ? (
              <input
                value={splitPercentages[member.id] || ""}
                disabled={!selectedMemberIds.includes(member.id)}
                inputMode="decimal"
                onChange={(event) => setSplitPercentages((items) => ({ ...items, [member.id]: event.target.value.replace(/[^0-9.,]/g, "").slice(0, 6) }))}
                placeholder="0%"
              />
            ) : (
              <span className="split-table-placeholder">-</span>
            )}
            {splitMode === "amount" ? (
              <input
                value={splitAmountInputs[member.id] || ""}
                disabled={!selectedMemberIds.includes(member.id)}
                inputMode="decimal"
                onChange={(event) => setSplitAmountInputs((items) => ({ ...items, [member.id]: formatAmountInput(event.target.value) }))}
                placeholder="$0,00"
              />
            ) : (
              <strong>{money(amountFor(member.id), currency)}</strong>
            )}
          </div>
        ))}
      </div>
    </section>
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

function ReceiptDropzone({ fileName, setFileName }) {
  function pickFile(files) {
    const file = files?.[0];
    if (file) setFileName(file.name);
  }

  return (
    <label
      className="receipt-dropzone"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        pickFile(event.dataTransfer.files);
      }}
    >
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => pickFile(event.target.files)}
      />
      <span className="receipt-dropzone-icon"><ImageIcon size={20} /></span>
      <span>
        {fileName && <strong>{fileName}</strong>}
        <small>{fileName ? "Imagen seleccionada" : "Subí una imagen, sacá una foto o arrastrala acá"}</small>
      </span>
    </label>
  );
}

function EditDebtModal({ activeUser, appUsers, selectedMonimon, selectedMonimonId, debt, onClose, onSave }) {
  const monimonMemberOptions = selectedMonimon ? selectedMonimon.members.map((id) => appUsers.find((user) => user.id === id)).filter(Boolean) : appUsers;
  const isMonimonMode = selectedMonimonId !== "personal";
  const isLoan = debt.kind === "loan";
  const isExpense = !isLoan;
  const allowGroupTarget = !isLoan && monimonMemberOptions.length > 2;
  const otherUser = monimonMemberOptions.find((user) => user.id !== activeUser.id) || appUsers.find((user) => user.id !== activeUser.id);
  const splitParticipants = isMonimonMode ? monimonMemberOptions : [activeUser, otherUser].filter(Boolean);
  const [fromId, setFromId] = useState(debt.fromMemberId || activeUser.id);
  const [toId, setToId] = useState(debt.toMemberId === "group" && !allowGroupTarget ? otherUser?.id : debt.toMemberId || groupTargetId(activeUser, monimonMemberOptions, isMonimonMode));
  const [title, setTitle] = useState(debt.title || "");
  const [category, setCategory] = useState(debt.category || (isLoan ? "loan" : "general"));
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [splitMode, setSplitMode] = useState(debt.splitMode || "equal");
  const [selectedSplitMemberIds, setSelectedSplitMemberIds] = useState(() => (
    Array.isArray(debt.splitParticipantIds) && debt.splitParticipantIds.length
      ? debt.splitParticipantIds
      : splitParticipants.map((member) => member.id)
  ));
  const [splitAmountInputs, setSplitAmountInputs] = useState(() => splitParticipants.reduce((result, member) => ({
    ...result,
    [member.id]: formatAmountInput(String(Math.round(debtSplitAmountFor(debt, member.id, splitParticipants) * 100)))
  }), {}));
  const [splitPercentages, setSplitPercentages] = useState(debt.splitPercentages || {});
  const [currency, setCurrency] = useState(debt.currency || "ARS");
  const [date, setDate] = useState(toISOInputDate(debt.date));
  const [amount, setAmount] = useState(formatAmountInput(String(Math.round((debt.amount || 0) * 100))));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(toISOInputDate(debt.date).slice(0, 7));
  const [receiptFileName, setReceiptFileName] = useState("");
  const [error, setError] = useState("");

  function save() {
    const parsedAmount = parseAmountInput(amount);
    const selectedSplitParticipants = splitParticipants.filter((member) => selectedSplitMemberIds.includes(member.id));
    if (isExpense && !selectedSplitParticipants.length) {
      setError("Seleccioná al menos un integrante para dividir el gasto.");
      return;
    }
    if (!isExpense && isMonimonMode && fromId === toId) {
      setError("De y Para no pueden ser la misma persona.");
      return;
    }
    if (!title.trim() || parsedAmount <= 0) {
      setError("Completá el motivo y el importe.");
      return;
    }
    if (isExpense && splitMode === "amount") {
      const assignedAmount = selectedSplitParticipants.reduce((sum, member) => sum + parseAmountInput(splitAmountInputs[member.id] || ""), 0);
      if (Math.abs(assignedAmount - parsedAmount) > 0.01) {
        setError("Los importes asignados tienen que sumar el total del gasto.");
        return;
      }
    }
    if (isExpense && splitMode === "percent") {
      const assignedPercent = selectedSplitParticipants.reduce((sum, member) => sum + (Number(String(splitPercentages[member.id] || "").replace(",", ".")) || 0), 0);
      if (Math.abs(assignedPercent - 100) > 0.01) {
        setError("Los porcentajes tienen que sumar 100%.");
        return;
      }
    }
    const splitPayload = isExpense
      ? buildSplitPayload({ splitMode, splitAmountInputs, splitPercentages, totalAmount: parsedAmount, participants: selectedSplitParticipants })
      : { splitMode: "equal", splitAmounts: {}, splitPercentages: {} };
    onSave({ id: debt.id, title, category, amount, currency, date: formatISODate(date), fromMemberId: fromId, toMemberId: isExpense ? "group" : toId, kind: debt.kind || "expense", splitParticipantIds: selectedSplitParticipants.map((member) => member.id), ...splitPayload });
  }

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="edit-debt-title">
      <div className="create-modal form-modal">
        <div className="modal-head">
          <h2 id="edit-debt-title">{isLoan ? "Editar préstamo" : "Editar gasto"}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">x</button>
        </div>
        <div className="new-payment-box">
          <div className="expense-form-row two-columns">
            <label>
              <span>Fecha</span>
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
            </label>
            <label>
              <span>Motivo</span>
              <CategoryReasonInput
                category={category}
                setCategory={setCategory}
                menuOpen={categoryMenuOpen}
                setMenuOpen={setCategoryMenuOpen}
                value={title}
                onChange={setTitle}
                placeholder="General"
              />
            </label>
          </div>
          <div className="expense-form-row two-columns">
            {isMonimonMode ? (
              <label>
                <span>Pagado por</span>
                <select value={fromId} onChange={(event) => setFromId(event.target.value)}>
                  {monimonMemberOptions.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
              </label>
            ) : <span />}
            {(!isExpense && isMonimonMode) ? (
              <label>
                <span>Para</span>
                <select value={toId} onChange={(event) => setToId(event.target.value)}>
                  {allowGroupTarget && <option value="group">GRUPO</option>}
                  {monimonMemberOptions.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
              </label>
            ) : (
              <label>
                <span>Importe</span>
                <div className="money-input">
                  <select aria-label="Moneda" value={currency} onChange={(event) => setCurrency(event.target.value)}>
                    <option>ARS</option>
                    <option>USD</option>
                  </select>
                  <input value={amount} inputMode="decimal" onChange={(event) => setAmount(formatAmountInput(event.target.value))} />
                </div>
              </label>
            )}
          </div>
          {!isExpense && (
            <label>
              <span>Importe</span>
              <div className="money-input">
                <select aria-label="Moneda" value={currency} onChange={(event) => setCurrency(event.target.value)}>
                  <option>ARS</option>
                  <option>USD</option>
                </select>
                <input value={amount} inputMode="decimal" onChange={(event) => setAmount(formatAmountInput(event.target.value))} />
              </div>
            </label>
          )}
          {isExpense && (
            <>
              <SplitAdjustmentsTable
                participants={splitParticipants}
                currency={currency}
                totalAmount={parseAmountInput(amount)}
                splitMode={splitMode}
                setSplitMode={setSplitMode}
                splitAmountInputs={splitAmountInputs}
                setSplitAmountInputs={setSplitAmountInputs}
                splitPercentages={splitPercentages}
                setSplitPercentages={setSplitPercentages}
                selectedMemberIds={selectedSplitMemberIds}
                setSelectedMemberIds={setSelectedSplitMemberIds}
              />
              <ReceiptDropzone fileName={receiptFileName} setFileName={setReceiptFileName} />
            </>
          )}
          {error && <p className="form-error payment-error">{error}</p>}
          <button type="button" onClick={save} className="primary-action save-payment">Guardar</button>
        </div>
      </div>
    </div>
  );
}

function PaymentsPanel({ payments, debts = [], appUsers = [], getDebtMembers, activeUserId, personalOnly = false, monimons = [], personalSpaceName = "YO", compact, onEditPayment, onDeletePayment }) {
  return (
    <section className={`glass-card panel ${compact ? "compact-panel" : ""}`}>
      <PanelTitle icon={<History size={18} />} title="Movimientos" />
      <PaymentRows payments={payments} debts={debts} appUsers={appUsers} getDebtMembers={getDebtMembers} activeUserId={activeUserId} personalOnly={personalOnly} monimons={monimons} personalSpaceName={personalSpaceName} />
    </section>
  );
}

function isRegisteredContactCandidate(member) {
  return member?.memberStatus !== "ghost" && Boolean(member?.email);
}

function ContactsPanel({ activeUser, members, contacts, onAddContact, onRemoveContact, onClose }) {
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState("email");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const activeContacts = contacts.filter((contact) => contact.ownerProfileId === activeUser.id && contact.status !== "removed");
  const contactMemberIds = new Set(activeContacts.map((contact) => contact.memberId));
  const contactMembers = activeContacts
    .map((contact) => members.find((member) => member.id === contact.memberId))
    .filter(isRegisteredContactCandidate)
    .sort((a, b) => a.name.localeCompare(b.name));
  const normalizedQuery = searchMode === "email" ? normalizedSearch(searchedQuery) : normalizeUsername(searchedQuery);
  const foundMember = normalizedQuery
    ? members
        .filter(isRegisteredContactCandidate)
        .find((member) => {
          if (member.id === activeUser.id || contactMemberIds.has(member.id)) return false;
          const searchableUsername = normalizeUsername(member.username);
          const searchableEmail = normalizedSearch(member.email);
          return searchMode === "email" ? searchableEmail === normalizedQuery : searchableUsername === normalizedQuery;
        })
    : null;
  const hasSearched = Boolean(searchedQuery);

  function submitContactSearch(event) {
    event.preventDefault();
    setInviteCopied(false);
    setSearchedQuery(query);
  }

  function changeSearchMode(mode) {
    setSearchMode(mode);
    setQuery("");
    setSearchedQuery("");
    setInviteCopied(false);
  }

  function sendContactRequest(memberId) {
    onAddContact(memberId);
    setQuery("");
    setSearchedQuery("");
  }

  async function inviteToApp() {
    const inviteText = `Sumate a MONI MON!: ${window.location.origin}${window.location.pathname}`;
    setInviteCopied(false);
    try {
      await navigator.clipboard.writeText(inviteText);
      setInviteCopied(true);
    } catch {
      window.prompt("Copiá esta invitación", inviteText);
    }
  }

  return (
    <section className="create-modal contacts-modal" role="dialog" aria-modal="true" aria-labelledby="contacts-title">
      <div className="modal-head">
        <h2 id="contacts-title"><BookUser size={22} /> Contactos</h2>
        <button type="button" onClick={onClose} aria-label="Cerrar contactos">Cerrar</button>
      </div>
      <div className="contacts-layout">
        <section className="contacts-column contacts-agenda-column">
          <div className="group-heading">
            <span>Tu agenda</span>
          </div>
          <div className="contacts-list">
            {contactMembers.length ? (
              contactMembers.map((member) => (
                <ContactRow
                  key={member.id}
                  member={member}
                  status={activeContacts.find((contact) => contact.memberId === member.id)?.status}
                  actionLabel="Quitar"
                  actionClassName="danger"
                  onAction={() => onRemoveContact(member.id)}
                />
              ))
            ) : (
              <EmptyState text="Todavía no agregaste contactos." />
            )}
          </div>
        </section>
        <section className="contacts-search-column">
          <form className="contacts-search-form" onSubmit={submitContactSearch}>
            <div className="contacts-search-mode" role="group" aria-label="Tipo de búsqueda">
              <button type="button" className={searchMode === "email" ? "active" : ""} onClick={() => changeSearchMode("email")}>
                <Mail size={16} /> Email
              </button>
              <button type="button" className={searchMode === "username" ? "active" : ""} onClick={() => changeSearchMode("username")}>
                <UserRound size={16} /> Usuario
              </button>
            </div>
            <div className="contacts-search">
              <UserRound size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchMode === "email" ? "Buscar por Email" : "Buscar por nombre de usuario"}
              />
              <button type="submit" aria-label="Buscar contacto"><Search size={18} /></button>
            </div>
          </form>
          {hasSearched && (
            <div className="contact-search-result">
              {foundMember ? (
                <ContactRow member={foundMember} actionLabel="Enviar solicitud" onAction={() => sendContactRequest(foundMember.id)} />
              ) : (
                <div className="contact-not-found">
                  <span>
                    <b>No encontramos ese usuario.</b>
                    <small>Podés invitarlo a crear una cuenta en MONI MON!.</small>
                  </span>
                  <button type="button" onClick={inviteToApp}>{inviteCopied ? "Invitación copiada" : "Invitar"}</button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function ContactRow({ member, status = "active", actionLabel, actionClassName = "", onAction }) {
  const isGhost = member.memberStatus === "ghost";
  const handle = displayHandle(member.username);
  const caption = status === "pending" ? "Solicitud enviada" : isGhost ? "Integrante no registrado" : handle || member.email || "Usuario registrado";
  return (
    <div className="contact-row">
      <Avatar user={member} />
      <span>
        <b>{member.name}</b>
        <small>{caption}</small>
      </span>
      <button type="button" className={actionClassName} onClick={onAction}>{actionLabel}</button>
    </div>
  );
}

function PaymentRows({ payments, debts = [], appUsers = [], getDebtMembers, activeUserId, personalOnly = false, monimons = [], onEditPayment, onDeletePayment, showActions = false, showGroupColumn = true }) {
  const groupNameFor = (monimonId) => {
    if (!monimonId || monimonId === "personal") return "YO";
    return monimons.find((monimon) => monimon.id === monimonId)?.name || "GRUPO";
  };
  const paymentMovements = payments
    .filter((payment) => !personalOnly || payment.fromMemberId === activeUserId || payment.toMemberId === activeUserId)
    .map((payment) => ({
      id: `payment-${payment.id}`,
      kind: "payment",
      source: payment,
      date: debtDateKey(payment),
      member: userLabel(payment.fromMemberId, appUsers),
      movement: payment.fromMemberId === activeUserId ? "Pago de deuda" : payment.toMemberId === activeUserId ? "Recupero de deuda" : "Pago informado",
      amount: payment.amount,
      currency: payment.currency || "ARS",
      groupName: groupNameFor(payment.monimonId),
      destination: userLabel(payment.toMemberId, appUsers)
    }));
  const debtMovements = debts.filter((debt) => !personalOnly || debt.fromMemberId === activeUserId).map((debt) => {
    const members = getDebtMembers?.(debt) || appUsers;
    return {
      id: `debt-${debt.id}`,
      kind: "debt",
      source: debt,
      date: debtDateKey(debt),
      member: userLabel(debt.fromMemberId, members),
      movement: debt.kind === "loan" ? "Préstamo" : "Gasto",
      amount: debt.amount,
      currency: debt.currency || "ARS",
      groupName: groupNameFor(debt.monimonId),
      destination: debt.toMemberId === "group" ? "GRUPO" : userLabel(debt.toMemberId, members)
    };
  });
  const orderedMovements = [...paymentMovements, ...debtMovements].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const columnCount = 5 + (showGroupColumn ? 1 : 0) + (showActions ? 1 : 0);
  return (
    <div className="history-table-wrap">
      <table className="history-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Integrante</th>
            {showGroupColumn && <th>Grupo</th>}
            <th>Tipo de Movimiento</th>
            <th className="history-amount-cell">Importe</th>
            <th>Destino</th>
            {showActions && <th className="history-actions-cell" aria-label="Acciones" />}
          </tr>
        </thead>
        <tbody>
          {orderedMovements.length ? (
            orderedMovements.map((movement) => (
              <tr key={movement.id}>
                <td>{displayDate(movement.date)}</td>
                <td>{movement.member}</td>
                {showGroupColumn && <td>{movement.groupName}</td>}
                <td>
                  <span className="history-movement-cell">
                    <b>{movement.movement}</b>
                  </span>
                </td>
                <td className="history-amount-cell">{money(movement.amount, movement.currency)}</td>
                <td>{movement.destination}</td>
                {showActions && (
                  <td className="history-actions-cell">
                    {movement.kind === "payment" && <RowActions onEdit={() => onEditPayment?.(movement.source)} onDelete={() => onDeletePayment?.(movement.source)} />}
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td className="history-empty-cell" colSpan={columnCount}>
                <EmptyState text="Todavía no hay movimientos." />
              </td>
            </tr>
          )}
        </tbody>
      </table>
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
          ? `✓ Liquidación verificada${request.verifiedByMemberIds?.length ? ` por ${request.verifiedByMemberIds.map((id) => userLabel(id, appUsers)).join(", ")}` : ""}`
          : request.status === "rejected"
            ? `Rechazado por ${userLabel(request.rejectedByMemberId, appUsers)}`
            : waitingNames
              ? `Liquidación pendiente · esperando confirmación de ${waitingNames}`
              : "Liquidación pendiente";

        return (
          <article key={request.id} className={`request-card ${request.status}`}>
            <div className="request-main">
              <span className="history-icon"><ReceiptText size={17} /></span>
              <span className="request-copy min-w-0 flex-1">
                <b>{userLabel(request.fromMemberId, appUsers)} → {userLabel(request.toMemberId, appUsers)}</b>
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
                  <Check size={15} /> Confirmar
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

function DebtGroup({ title, tone, debts, selectable, selectedDebtIds, setSelectedDebtIds, appUsers, getDebtMembers, onEditDebt, onDeleteDebt, onRepeatDebt, amountForDebt, totalOverride }) {
  const calculatedTotal = debts.reduce((sum, debt) => sum + (amountForDebt ? amountForDebt(debt) : debt.amount), 0);
  const total = Number.isFinite(totalOverride) ? totalOverride : calculatedTotal;
  const groupedDebts = debts.reduce((groups, debt) => {
    const date = debt.date || "Sin fecha";
    const existing = groups.find((group) => group.date === date);
    if (existing) {
      existing.items.push(debt);
      return groups;
    }
    return [...groups, { date, items: [debt] }];
  }, []);
  return (
    <div>
      <div className="debt-list">
        {debts.length ? (
          groupedDebts.map((group) => (
            <div className="debt-date-group" key={group.date}>
              <div className="debt-date-heading">{displayDate(group.date)}</div>
              {group.items.map((debt) => (
                <DebtRow
                  key={debt.id}
                  debt={debt}
                  selectable={selectable}
                  checked={selectedDebtIds?.includes(debt.id)}
                  onToggle={() => setSelectedDebtIds?.((items) => toggle(items, debt.id))}
                  onEditDebt={onEditDebt}
                  onDeleteDebt={onDeleteDebt}
                  onRepeatDebt={onRepeatDebt}
                  members={getDebtMembers?.(debt) || appUsers || []}
                />
              ))}
            </div>
          ))
        ) : (
          <EmptyState text="Todavía no hay registros." />
        )}
      </div>
    </div>
  );
}

function DebtRow({ debt, selectable, checked, onToggle, members, onEditDebt, onDeleteDebt, onRepeatDebt }) {
  const counterparty = debtCounterpartyParts(debt, members);
  const splitAmount = debt.kind !== "loan" && members.length > 1 ? debt.amount / members.length : null;
  const category = categoryFor(debt.category, debt.kind === "loan" ? "loan" : "general");
  const [detailOpen, setDetailOpen] = useState(false);
  const participantIds = expenseParticipantIds(debt, members);
  const detailItems = participantIds
    .map((memberId) => {
      const member = members.find((item) => item.id === memberId);
      const share = debtSplitAmountFor(debt, memberId, members);
      if (memberId === debt.fromMemberId) return null;
      return { id: memberId, name: member?.name || memberId, amount: share, type: "debt" };
    })
    .filter(Boolean);
  const recoveredAmount = debt.kind !== "loan" ? debtReceivableFor(debt, debt.fromMemberId, members) : 0;
  const payerName = members.find((member) => member.id === debt.fromMemberId)?.name || counterparty.fromName;
  if (recoveredAmount > 0) {
    detailItems.push({ id: `${debt.fromMemberId}-recovers`, name: payerName, amount: recoveredAmount, type: "recover" });
  }

  return (
    <div role={selectable ? "button" : undefined} tabIndex={selectable ? 0 : undefined} onClick={onToggle} className="debt-row">
      <span className="min-w-0 flex-1">
        <span className="debt-title-line">
          {selectable && <span className={`check ${checked ? "active" : ""}`}>{checked && <Check size={13} />}</span>}
          <b><span className="debt-category-emoji">{category.emoji}</span>{debt.title}</b>
          <RowActions
            onEdit={onEditDebt ? () => onEditDebt(debt) : null}
            onRepeat={debt.kind !== "loan" && onRepeatDebt ? () => onRepeatDebt(debt) : null}
            onDelete={onDeleteDebt ? () => onDeleteDebt(debt) : null}
          />
        </span>
        <span className="debt-line debt-amount-line">
          <strong><span>IMPORTE TOTAL</span> {money(debt.amount)}</strong>
        </span>
        <span className="debt-line">
          <small className="counterparty-line">Pagado por <span>{counterparty.fromName}</span></small>
          {splitAmount && (
            <button type="button" className="debt-detail-btn" onClick={(event) => { event.stopPropagation(); setDetailOpen((open) => !open); }}>
              Ver detalle
            </button>
          )}
        </span>
        {detailOpen && detailItems.length > 0 && (
          <span className="debt-detail-box">
            {detailItems.map((item) => (
              <span key={item.id} className={`debt-detail-line ${item.type}`}>
                <span>{item.name}</span>
                <b>{item.type === "recover" ? "recupera" : "debe"} {money(item.amount, debt.currency)}</b>
              </span>
            ))}
          </span>
        )}
      </span>
    </div>
  );
}

function RowActions({ onRepeat, onEdit, onDelete }) {
  if (!onRepeat && !onEdit && !onDelete) return null;
  return (
    <span className="row-actions">
      {onEdit && (
        <button type="button" onClick={(event) => { event.stopPropagation(); onEdit(); }} aria-label="Editar">
          <Pencil size={15} />
        </button>
      )}
      {onRepeat && (
        <button type="button" className="repeat-action" onClick={(event) => { event.stopPropagation(); onRepeat(); }} aria-label="Repetir gasto">
          <Copy size={15} />
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

function Metric({ id, label, value, currency = "ARS", positive, negative, help, openMetric, setOpenMetric }) {
  const isOpen = openMetric === id;
  return (
    <div className={`metric ${positive ? "positive" : ""} ${negative ? "negative" : ""} ${isOpen ? "active" : ""}`}>
      <div className="metric-label-row">
        <p>{label}</p>
        {help && <span className="metric-help" title={help} aria-label={help}>?</span>}
      </div>
      <b>{money(value, currency)}</b>
      <button
        type="button"
        className="metric-detail-btn"
        onClick={() => setOpenMetric(isOpen ? null : id)}
        aria-expanded={isOpen}
      >
        {isOpen ? "- Detalle" : "+ Detalle"}
      </button>
    </div>
  );
}

function EmptyState({ text, className = "" }) {
  return <div className={`empty-state ${className}`.trim()}>{text}</div>;
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
  const disabled = Boolean(item.disabled);
  return (
    <button
      type="button"
      onClick={() => {
        if (!disabled) setActiveView(item.id);
      }}
      className={`nav-btn ${active ? "active" : ""} ${disabled ? "disabled" : ""}`.trim()}
      disabled={disabled}
      aria-disabled={disabled}
      title={disabled ? "Disponible después del primer release" : undefined}
    >
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
        const disabled = Boolean(item.disabled);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (!disabled) setActiveView(item.id);
            }}
            className={`${activeView === item.id ? "active" : ""} ${disabled ? "disabled" : ""}`.trim()}
            disabled={disabled}
            aria-disabled={disabled}
          >
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
