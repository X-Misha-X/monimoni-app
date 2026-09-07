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
  MessageCircle,
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
import "./theme-editor.css";

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

const initialActivityLog = [];

const appThemes = [
  { id: "default", name: "Syringa" },
  { id: "cocoa", name: "Hortensia" },
  { id: "botanical", name: "Índigo" },
  { id: "rust-blue", name: "Lavanda" }
];

const defaultAppTheme = "cocoa";
const themePreferenceVersion = "hortensia-default-v1";
const appThemeIds = new Set(appThemes.map((theme) => theme.id));

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
  { id: "solicitudes", label: "Solicitudes", icon: Bell }
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
  { id: "cards", label: "Tarjetas", emoji: "💳" },
  { id: "services", label: "Servicios", emoji: "🧰" },
  { id: "supplies", label: "Suministros", emoji: "📦" },
  { id: "electronics", label: "Electrónica", emoji: "🔌" },
  { id: "food", label: "Alimentos", emoji: "🍽️" },
  { id: "games", label: "Juegos", emoji: "🎮" },
  { id: "music", label: "Música", emoji: "🎵" },
  { id: "movies", label: "Películas", emoji: "🎬" },
  { id: "transport", label: "Transporte", emoji: "🚗" },
  { id: "lodging", label: "Hospedaje", emoji: "🏨" },
  { id: "facilities", label: "Instalaciones", emoji: "🛠️" },
  { id: "cleaning", label: "Limpieza", emoji: "🧼" },
  { id: "health", label: "Salud", emoji: "🩺" },
  { id: "gift", label: "Regalos", emoji: "🎁" },
  { id: "insurance", label: "Seguro", emoji: "🛡️" },
  { id: "loan", label: "Préstamos", emoji: "💸" },
  { id: "beauty", label: "Belleza", emoji: "💄" },
  { id: "shopping", label: "Compras", emoji: "🛍️" },
  { id: "entertainment", label: "Entretenimiento", emoji: "🎟️" },
  { id: "education", label: "Educación", emoji: "🎓" },
  { id: "sports", label: "Deportes", emoji: "⚽" },
  { id: "social", label: "Social", emoji: "🥂" },
  { id: "clothing", label: "Ropa", emoji: "👕" },
  { id: "cigarettes", label: "Cigarrillos", emoji: "🚬" },
  { id: "devices", label: "Electrónicos", emoji: "📱" },
  { id: "travel", label: "Viajes", emoji: "✈️" },
  { id: "pets", label: "Mascotas", emoji: "🐾" },
  { id: "repairs", label: "Reparaciones", emoji: "🔧" },
  { id: "home", label: "Vivienda", emoji: "🏠" },
  { id: "donations", label: "Donaciones", emoji: "🤝" },
  { id: "children", label: "Hijos", emoji: "🧒" }
];

const validViewIds = new Set(navItems.map((item) => item.id));
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const DEFAULT_PUBLIC_APP_URL = "https://monimoni-web.vercel.app";
const PUBLIC_APP_URL = String(import.meta.env.VITE_PUBLIC_APP_URL || DEFAULT_PUBLIC_APP_URL).replace(/\/+$/, "");
const pendingInviteStorageKey = "monimon-pending-invite";
const inviteCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function normalizeInviteCode(value = "") {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

function deterministicInviteCode(seed = "", salt = "") {
  const source = `${seed || "monimon"}:${salt}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  let value = hash >>> 0;
  let code = "";
  for (let index = 0; index < 6; index += 1) {
    code += inviteCodeAlphabet[value % inviteCodeAlphabet.length];
    value = Math.floor(value / inviteCodeAlphabet.length);
  }
  return code;
}

function createInviteCode(usedCodes = new Set()) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    let code = "";
    for (let index = 0; index < 6; index += 1) {
      code += inviteCodeAlphabet[Math.floor(Math.random() * inviteCodeAlphabet.length)];
    }
    if (!usedCodes.has(code)) return code;
  }
  let fallbackIndex = 1;
  let fallback = deterministicInviteCode(`${Date.now()}-${fallbackIndex}`);
  while (usedCodes.has(fallback)) {
    fallbackIndex += 1;
    fallback = deterministicInviteCode(`${Date.now()}-${fallbackIndex}`);
  }
  return fallback;
}

function inviteCodeForMonimon(monimon = {}) {
  return normalizeInviteCode(monimon.inviteCode) || deterministicInviteCode(monimon.id);
}

function inviteTokenFromText(value = "") {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const url = new URL(text);
    const pathMatch = url.pathname.match(/^\/grupo\/([^/?&]+)$/i);
    return pathMatch ? decodeURIComponent(pathMatch[1]) : "";
  } catch {
    const pathMatch = text.match(/^\/?grupo\/([^/?&]+)$/i);
    if (pathMatch) return decodeURIComponent(pathMatch[1]);
    return normalizeInviteCode(text);
  }
}

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

function displayPersonName(value, appUsers = []) {
  if (!value) return "-";
  const raw = String(value);
  if (raw === "group" || raw.toUpperCase() === "GRUPO") return "GRUPO";
  const normalizedRaw = normalizeUsername(raw.replace(/^@/, ""));
  const normalizedText = normalizedSearch(raw);
  const match = appUsers.find((user) => (
    user.id === raw
    || normalizeUsername(user.username) === normalizedRaw
    || normalizedSearch(user.email) === normalizedText
    || normalizedSearch(user.name) === normalizedText
  ));
  if (!match && raw.toLowerCase().startsWith("ghost-")) return "INTEGRANTE INVITADO";
  return match ? shortDisplayName(match.name) : shortDisplayName(raw);
}

function shortDisplayName(value = "") {
  const firstName = String(value).trim().split(/\s+/)[0];
  return (firstName || "").toUpperCase();
}

function isHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || "").trim());
}

function memberFrameColor(monimon, memberId) {
  const color = monimon?.memberColors?.[memberId];
  return isHexColor(color) ? color : "";
}

function PersonChip({ children, className = "", color = "" }) {
  const style = isHexColor(color) ? { "--person-chip-fondo": color } : undefined;
  return <span className={`person-chip ${className}`.trim()} style={style}>{children}</span>;
}

function profileFromAuthUser(user) {
  const metadata = user?.user_metadata || {};
  const displayName = metadata.display_name || metadata.full_name || metadata.name || user?.email?.split("@")[0] || "Usuario";
  const username = normalizeUsername(metadata.username || metadata.user_name || metadata.preferred_username || usernameFromEmail(user?.email) || displayName);
  const provider = user?.app_metadata?.provider || user?.identities?.[0]?.provider || metadata.provider || "email";
  return {
    id: user.id,
    name: displayName.toUpperCase(),
    username,
    email: user.email || "",
    authProvider: provider,
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
        monimonId: item.monimonId || ""
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
        monimonId: item.monimonId || ""
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
        monimonId: item.monimonId || "",
        status: item.status || "pending",
        createdAt: item.createdAt || new Date().toISOString()
      }))
    : [];
}

function normalizeMonimonOptions(items) {
  if (!Array.isArray(items)) return [];
  const usedCodes = new Set();
  return items
    .filter((item) => item && item.id && item.name)
    .map((item) => {
      const members = Array.isArray(item.members) ? item.members : [];
      const adminIds = Array.isArray(item.adminIds) && item.adminIds.length ? item.adminIds : members.slice(0, 1);
      let inviteCode = normalizeInviteCode(item.inviteCode) || deterministicInviteCode(item.id);
      let collisionIndex = 1;
      while (usedCodes.has(inviteCode)) {
        inviteCode = deterministicInviteCode(item.id, collisionIndex);
        collisionIndex += 1;
      }
      usedCodes.add(inviteCode);
      const memberColors = item.memberColors && typeof item.memberColors === "object" && !Array.isArray(item.memberColors)
        ? Object.fromEntries(
            Object.entries(item.memberColors)
              .filter(([memberId, color]) => members.includes(memberId) && isHexColor(color))
          )
        : {};
      return { ...item, inviteCode, icon: item.icon || "home", members, memberColors, adminIds: adminIds.filter((id) => members.includes(id)) };
    });
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
  if (!Array.isArray(items)) return [];
  const usedCodes = new Set();
  return items
    .filter((item) => item && item.id && item.name)
    .map((item) => {
      let inviteCode = normalizeInviteCode(item.inviteCode) || deterministicInviteCode(item.id);
      let collisionIndex = 1;
      while (usedCodes.has(inviteCode)) {
        inviteCode = deterministicInviteCode(item.id, collisionIndex);
        collisionIndex += 1;
      }
      usedCodes.add(inviteCode);
      return { ...item, name: item.name, inviteCode, icon: item.icon || "home", adminIds: Array.isArray(item.adminIds) ? item.adminIds : [] };
    });
}

function normalizeMonimonMembers(items) {
  return Array.isArray(items)
    ? items
        .filter((item) => item && item.monimonId && item.memberId)
        .map((item) => ({
          ...item,
          status: item.status === "invited" ? "pending" : ["active", "pending", "removed"].includes(item.status) ? item.status : "active",
          source: item.source || "direct",
          invitedByMemberId: item.invitedByMemberId || null,
          createdAt: item.createdAt || new Date().toISOString()
        }))
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

function normalizeActivityLog(items) {
  return Array.isArray(items)
    ? items.filter(Boolean).map((item) => ({
        ...item,
        id: item.id || `activity-${Date.now()}-${Math.random()}`,
        monimonId: item.monimonId || "",
        memberId: item.memberId || "unknown",
        activity: item.activity || "Actividad",
        amount: Number(item.amount) || 0,
        currency: item.currency || "ARS",
        destination: item.destination || "",
        destinationMemberId: item.destinationMemberId || "",
        targetMemberId: item.targetMemberId || "",
        balanceDelta: Number(item.balanceDelta) || 0,
        date: item.date || formatISODate(todayISO()),
        createdAt: item.createdAt || new Date().toISOString()
      }))
    : [];
}

function normalizeArchiveFiles(items) {
  return Array.isArray(items)
    ? items
        .filter((item) => item && typeof item.dataUrl === "string" && item.dataUrl.startsWith("data:image/"))
        .map((item) => ({
          id: item.id || `archive-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: item.name || "imagen.png",
          size: Number(item.size) || 0,
          dataUrl: item.dataUrl,
          monimonId: item.monimonId || "",
          createdAt: item.createdAt || formatISODate(todayISO()),
          uploadedBy: item.uploadedBy || "Usuario",
          category: item.category || "General"
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

function authUserFromProfile(profile) {
  const displayName = profile.name || profile.displayName || profile.email?.split("@")[0] || "Usuario";
  return {
    id: profile.id,
    email: profile.email || "",
    app_metadata: { role: profile.role || "user" },
    user_metadata: {
      display_name: displayName,
      username: profile.username || usernameFromProfile(profile),
      avatar_url: profile.avatarSrc || ""
    }
  };
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
  const paid = debt.fromMemberId === memberId ? Number(debt.amount) || 0 : 0;
  return paid - debtSplitAmountFor(debt, memberId, members);
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue).sort();
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]));
}

function sameCanonicalValue(a, b) {
  return JSON.stringify(canonicalValue(a)) === JSON.stringify(canonicalValue(b));
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

function signedMoney(value, currency = "ARS") {
  const amount = Number(value) || 0;
  if (Math.abs(amount) <= 0.009) return money(0, currency);
  return `${amount > 0 ? "+" : "-"}${money(Math.abs(amount), currency)}`;
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

function groupTargetId(activeUser, members) {
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
  const [activityLog, setActivityLog] = useState(() => normalizeActivityLog(initialActivityLog));
  const [selectedDebtIds, setSelectedDebtIds] = useState([]);
  const [manualAmount, setManualAmount] = useState("");
  const [paymentCurrency, setPaymentCurrency] = useState("ARS");
  const [paymentReason, setPaymentReason] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [showNewPayment, setShowNewPayment] = useState(false);
  const [showNewDebt, setShowNewDebt] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [archiveFiles, setArchiveFiles] = useState(() => normalizeArchiveFiles([]));
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileModal, setProfileModal] = useState(null);
  const [showContacts, setShowContacts] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [sideNavCollapsed, setSideNavCollapsed] = useState(false);
  const [selectedMonimonId, setSelectedMonimonId] = useState("");
  const [showCreateMonimon, setShowCreateMonimon] = useState(false);
  const [editingMonimonId, setEditingMonimonId] = useState(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [stateHydrated, setStateHydrated] = useState(false);
  const [stateLoadFailed, setStateLoadFailed] = useState(false);
  const [stateLoadRetryTick, setStateLoadRetryTick] = useState(0);
  const [backendWakeElapsed, setBackendWakeElapsed] = useState(0);
  const [saveError, setSaveError] = useState("");
  const [saveRetryTick, setSaveRetryTick] = useState(0);
  const [appTheme, setAppTheme] = useState(() => {
    const savedTheme = window.localStorage.getItem("monimon-theme");
    const savedVersion = window.localStorage.getItem("monimon-theme-version");
    if (savedVersion !== themePreferenceVersion && (!savedTheme || savedTheme === "default")) {
      return defaultAppTheme;
    }
    return appThemeIds.has(savedTheme) ? savedTheme : defaultAppTheme;
  });
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
  const monimonOptions = useMemo(() => monimons.map((monimon) => {
    const persistedMemberIds = monimonMembers
      .filter((item) => item.monimonId === monimon.id && item.status !== "removed")
      .map((item) => item.memberId);
    return {
      ...monimon,
      members: [...new Set(persistedMemberIds.length ? persistedMemberIds : (monimon.members || []))]
    };
  }), [monimons, monimonMembers]);

  function replaceMonimonsFromOptions(nextMonimonsOrUpdater) {
    const nextMonimons = typeof nextMonimonsOrUpdater === "function" ? nextMonimonsOrUpdater(monimonOptions) : nextMonimonsOrUpdater;
    const normalizedMonimons = normalizeMonimonOptions(nextMonimons);
    setMonimons(normalizedMonimons.map(({ members: _members, ...monimon }) => monimon));
    setMonimonMembers((existingMemberships) => {
      const nextMonimonIds = new Set(normalizedMonimons.map((monimon) => monimon.id));
      const activeKeys = new Set(normalizedMonimons.flatMap((monimon) => (
        (monimon.members || []).map((memberId) => `${monimon.id}:${memberId}`)
      )));
      const membershipByKey = new Map(existingMemberships.map((membership) => [`${membership.monimonId}:${membership.memberId}`, membership]));
      const now = new Date().toISOString();
      const memberById = new Map(memberOptions.map((member) => [member.id, member]));
      const preservedRemoved = existingMemberships
        .filter((membership) => nextMonimonIds.has(membership.monimonId))
        .filter((membership) => !activeKeys.has(`${membership.monimonId}:${membership.memberId}`))
        .map((membership) => ({ ...membership, status: "removed", removedAt: membership.removedAt || now }));
      const activeMemberships = normalizedMonimons.flatMap((monimon) => (
        (monimon.members || []).map((memberId) => {
          const previous = membershipByKey.get(`${monimon.id}:${memberId}`);
          const member = memberById.get(memberId);
          const isInvitedProfile = member?.profileId && memberId !== activeUser?.id;
          const status = previous?.status && previous.status !== "removed"
            ? previous.status
            : isInvitedProfile
              ? "pending"
              : "active";
          return {
            ...(previous || {}),
            monimonId: monimon.id,
            memberId,
            status,
            source: previous?.source || (isInvitedProfile ? "agenda" : member?.memberStatus === "ghost" ? "manual" : "direct"),
            invitedByMemberId: previous?.invitedByMemberId || (isInvitedProfile ? activeUser?.id || null : null),
            createdAt: previous?.createdAt || now
          };
        })
      ));
      return [...activeMemberships, ...preservedRemoved];
    });
  }

  useEffect(() => {
    let cancelled = false;
    let wakeTimer = null;
    if (!session?.accessToken) {
      backendLoaded.current = false;
      setBackendOnline(false);
      setStateLoadFailed(false);
      setStateHydrated(true);
      setBackendWakeElapsed(0);
      return () => {};
    }
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
        if (Array.isArray(state.activityLog)) setActivityLog(normalizeActivityLog(state.activityLog));
        if (Array.isArray(state.archiveFiles)) setArchiveFiles(normalizeArchiveFiles(state.archiveFiles));
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
        body: JSON.stringify({ profiles: appUsers, members, monimons, monimonMembers, debts, payments, paymentRequests, contacts, activityLog, archiveFiles })
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
  }, [saveRetryTick, session?.accessToken, appUsers, members, monimons, monimonMembers, debts, payments, paymentRequests, contacts, activityLog, archiveFiles]);
  useEffect(() => () => {
    if (saveRetryTimer.current) window.clearTimeout(saveRetryTimer.current);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("monimon-theme", appTheme);
    window.localStorage.setItem("monimon-theme-version", themePreferenceVersion);
  }, [appTheme]);

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
    const sharedSpace = inviteTokenFromText(window.location.href);
    const matchedGroup = sharedSpace
      ? monimonOptions.find((monimon) => (
        monimon.id === sharedSpace
        || normalizedSearch(inviteCodeForMonimon(monimon)) === normalizedSearch(sharedSpace)
      ))
      : null;
    if (sharedSpace) {
      window.localStorage.setItem(pendingInviteStorageKey, sharedSpace);
    }
    if (matchedGroup) {
      setSelectedMonimonId(matchedGroup.id);
    }
  }, [monimonOptions]);
  useEffect(() => {
    if (selectedMonimonId && !monimonOptions.some((monimon) => monimon.id === selectedMonimonId)) {
      setSelectedMonimonId("");
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
          authProvider: incomingProfile.authProvider,
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
        ? items.map((user) => (user.id === profile.id ? { ...profile, ...user, email: profile.email, authProvider: profile.authProvider, username: user.username || profile.username } : user))
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
    setSelectedMonimonId("");
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
    if (updates.name || updates.username || updates.email) {
      setMembers((items) =>
        items.map((member) =>
          member.profileId === activeUser.id || member.id === activeUser.id
            ? {
                ...member,
                ...(updates.name ? { displayName: updates.name } : {}),
                ...(updates.username ? { username: updates.username } : {}),
                ...(updates.email ? { email: updates.email } : {})
              }
            : member
        )
      );
    }
  }

  async function updateAccountEmail(email) {
    const accessToken = session?.accessToken;
    if (!accessToken) throw new Error("No hay sesión activa.");
    const payload = await apiRequest("/api/auth/update-email", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ access_token: accessToken, email })
    });
    updateActiveUser({ email });
    if (payload?.user) {
      setSession((current) => current ? { ...current, user: payload.user } : current);
    }
  }

  async function updateAccountPassword(password) {
    const accessToken = session?.accessToken;
    if (!accessToken) throw new Error("No hay sesión activa.");
    await apiRequest("/api/auth/update-password", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ access_token: accessToken, password })
    });
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

  function recordActivity({ monimonId = selectedMonimonId, memberId = activeUser?.id, activity, amount = 0, currency = "ARS", destination = "", destinationMemberId = "", targetMemberId = "", balanceDelta = 0 }) {
    if (!activity) return;
    setActivityLog((items) => [
      {
        id: `activity-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        monimonId,
        memberId: memberId || "unknown",
        activity,
        amount: Number(amount) || 0,
        currency,
        destination,
        destinationMemberId,
        targetMemberId,
        balanceDelta: Number(balanceDelta) || 0,
        date: formatISODate(todayISO()),
        createdAt: new Date().toISOString()
      },
      ...items
    ]);
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
    if (!selectedMonimon || !canRegisterGroupPayment) {
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
    const paymentId = `payment-${Date.now()}`;
    setPayments((items) => [
      {
        id: paymentId,
        monimonId: monimonIdOverride,
        fromMemberId: fromId,
        toMemberId: toId,
        amount,
        currency: paymentCurrency,
        date: formatISODate(paymentDate),
        detail: paymentReason.trim() || "Pago",
        verifiedByMemberIds: [activeUser.id],
        registeredByMemberId: activeUser.id,
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
    const paymentId = `payment-${Date.now()}`;
    setPayments((items) => [
      {
        id: paymentId,
        monimonId: request.monimonId,
        fromMemberId: request.fromMemberId,
        toMemberId: request.toMemberId,
        amount: request.amount,
        currency: request.currency,
        date: request.date,
        detail: request.detail,
        verifiedByMemberIds: approvedByMemberIds,
        registeredByMemberId: activeUser.id,
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
    const debtId = Date.now();
    setDebts((items) => [
      {
        id: debtId,
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
        status: "open",
        registeredByMemberId: activeUser.id
      },
      ...items
    ]);
    setShowNewDebt(false);
    return true;
  }

  function deleteMonimonFromBackend(monimonId) {
    if (!monimonId) return Promise.reject(new Error("Falta el grupo a eliminar."));
    if (!session?.accessToken) return Promise.reject(new Error("Necesitás iniciar sesión para eliminar un grupo en la base de datos."));
    return apiRequest("/api/monimons/delete", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.accessToken}` },
      body: JSON.stringify({ id: monimonId })
    });
  }

  if (!session) {
    return (
      <main className="min-h-screen inicio-screen" data-theme={appTheme}>
        <div className="ambient" />
        <section className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-4 py-8 lg:grid-cols-[1fr_430px] lg:px-8">
          <div className="brand-copy">
            <img src="/moni-logo-current.png" alt="moni mon!" className="hero-logo" />
            <h1>Las cuentas <span>claritas</span>.</h1>
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
      <main className="min-h-screen inicio-screen" data-theme={appTheme}>
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
      <BackendWakeScreen elapsed={backendWakeElapsed} appTheme={appTheme} />
    );
  }

  if (stateLoadFailed) {
    return (
      <BackendWakeScreen
        elapsed={backendWakeElapsed}
        failed
        appTheme={appTheme}
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
      activityLog={activityLog}
      recordActivity={recordActivity}
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
      monimonMembers={monimonMembers}
      setMonimonMembers={setMonimonMembers}
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
      updateActiveUser={updateActiveUser}
      registerPayment={registerPayment}
      registerDebt={registerDebt}
      deleteMonimonFromBackend={deleteMonimonFromBackend}
      saveError={saveError}
      logout={logout}
      deleteAccount={deleteAccount}
      updateAccountEmail={updateAccountEmail}
      updateAccountPassword={updateAccountPassword}
      appTheme={appTheme}
      setAppTheme={setAppTheme}
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

function BackendWakeScreen({ elapsed = 0, failed = false, onRetry, appTheme = defaultAppTheme }) {
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
    <main className="min-h-screen inicio-screen" data-theme={appTheme}>
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
  activityLog,
  recordActivity,
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
  monimonMembers,
  setMonimonMembers,
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
  updateActiveUser,
  registerPayment,
  registerDebt,
  deleteMonimonFromBackend,
  saveError,
  logout,
  deleteAccount,
  updateAccountEmail,
  updateAccountPassword,
  appTheme,
  setAppTheme
}) {
  const [toastMessage, setToastMessage] = useState("");
  const [groupHubActionsOpen, setGroupHubActionsOpen] = useState(false);
  const [showJoinMonimon, setShowJoinMonimon] = useState(false);
  const [showShareMonimon, setShowShareMonimon] = useState(false);
  const [joinInviteValue, setJoinInviteValue] = useState("");
  const [joinInviteError, setJoinInviteError] = useState("");
  const profileAreaRef = useRef(null);
  const handledInviteRef = useRef("");
  const incomingContactRequests = contacts.filter((contact) => contact.memberId === activeUser.id && contact.status === "pending");
  const activeGroups = useMemo(() => monimons.filter((monimon) => {
    if (!monimon.members.includes(activeUser.id)) return false;
    const membership = monimonMembers.find((item) => item.monimonId === monimon.id && item.memberId === activeUser.id);
    return !membership || membership.status === "active";
  }), [monimons, monimonMembers, activeUser.id]);
  useEffect(() => {
    if (selectedMonimonId && !activeGroups.some((monimon) => monimon.id === selectedMonimonId)) {
      setSelectedMonimonId("");
    }
  }, [activeGroups, selectedMonimonId, setSelectedMonimonId]);
  const selectedMonimon = activeGroups.find((monimon) => monimon.id === selectedMonimonId);
  const scopedDebts = selectedMonimon ? debts.filter((debt) => debt.monimonId === selectedMonimonId) : [];
  const scopedPayments = selectedMonimon ? payments.filter((payment) => payment.monimonId === selectedMonimonId) : [];
  const scopedPaymentRequests = selectedMonimon ? paymentRequests.filter((request) => request.monimonId === selectedMonimonId) : [];
  const openDebts = scopedDebts.filter((debt) => debt.status === "open");
  const openExpenses = openDebts.filter((debt) => debt.kind !== "loan");
  const openLoans = openDebts.filter((debt) => debt.kind === "loan");
  const currentNavItems = navItems;
  const selectedGroupIconOption = groupIconOptions.find((item) => item.id === selectedMonimon?.icon) || groupIconOptions[0];
  const editingMonimon = editingMonimonId ? monimons.find((monimon) => monimon.id === editingMonimonId) : null;
  const selectedAdminIds = selectedMonimon?.adminIds?.length ? selectedMonimon.adminIds : selectedMonimon?.members?.slice(0, 1) || [];
  const canManageSelectedGroup = selectedAdminIds.includes(activeUser.id);
  const memberById = useMemo(() => new Map(appUsers.map((member) => [member.id, member])), [appUsers]);
  const membersForSelectedMonimon = selectedMonimon ? selectedMonimon.members.map((id) => memberById.get(id)).filter(Boolean) : [];
  const shareBaseUrl = PUBLIC_APP_URL || `${window.location.origin}${window.location.pathname}`;
  const shareCode = selectedMonimon ? inviteCodeForMonimon(selectedMonimon) : "";
  const shareUrl = selectedMonimon ? `${shareBaseUrl}/grupo/${encodeURIComponent(shareCode)}` : "";
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
  const getSummaryDebtMembers = () => membersForSelectedMonimon;
  const summaryDetailExpenses = openExpenses;
  const summaryDetailGroups = selectedMonimon
    ? [{ id: selectedMonimonId, expenses: openExpenses, payments: scopedPayments, members: membersForSelectedMonimon }]
    : [];
  const paymentPanelSettlementGroups = selectedMonimon
    ? [{ id: selectedMonimonId, name: selectedMonimon.name || "Grupo", debts: openDebts, payments: scopedPayments, members: membersForSelectedMonimon }]
    : [];
  const paymentPanelDebts = paymentPanelSettlementGroups.flatMap((group) => group.debts);
  const paymentPanelPendingDebts = outgoingDebts;
  const paymentPanelPayments = scopedPayments;
  const historyDebts = scopedDebts;
  const historyPayments = scopedPayments;
  const historyActivityLog = activityLog.filter((item) => item.monimonId === selectedMonimonId);

  function acceptGroupInvite(inviteToken, { quiet = false } = {}) {
    if (!inviteToken || !activeUser?.id) {
      return { ok: false, error: "Pegá un link o código de invitación." };
    }
    const normalizedInviteToken = normalizedSearch(inviteToken);
    const group = monimons.find((monimon) => (
      normalizedSearch(inviteCodeForMonimon(monimon)) === normalizedInviteToken
    ));
    if (!group) {
      if (!quiet) window.alert("No encontré ese grupo. Revisá que el link o código esté completo.");
      return { ok: false, error: "No encontré ese grupo. Revisá que el link o código esté completo." };
    }
    const membership = monimonMembers.find((item) => item.monimonId === group.id && item.memberId === activeUser.id && item.status !== "removed");
    if (membership?.status === "active") {
      setSelectedMonimonId(group.id);
      setShowJoinMonimon(false);
      window.localStorage.removeItem(pendingInviteStorageKey);
      if (!quiet) {
        setToastMessage(`Ya estás en ${group.name}.`);
        window.setTimeout(() => setToastMessage(""), 2200);
      }
      return { ok: true, group };
    }
    if (membership?.status === "pending") {
      setMonimonMembers((items) => items.map((item) => (
        item.monimonId === group.id && item.memberId === activeUser.id
          ? { ...item, status: "active", linkedAt: new Date().toISOString() }
          : item
      )));
      recordActivity?.({
        monimonId: group.id,
        memberId: activeUser.id,
        activity: "Aceptación de invitación al grupo",
        destination: group.name
      });
      setSelectedMonimonId(group.id);
      setShowJoinMonimon(false);
      window.localStorage.removeItem(pendingInviteStorageKey);
      setToastMessage(`Te uniste a ${group.name}.`);
      window.setTimeout(() => setToastMessage(""), 2200);
      return { ok: true, group };
    }
    replaceMonimons(monimons.map((monimon) => (
      monimon.id === group.id
        ? { ...monimon, members: [...new Set([...(monimon.members || []), activeUser.id])] }
        : monimon
    )));
    recordActivity?.({
      monimonId: group.id,
      memberId: activeUser.id,
      activity: "Agregado de integrante",
      destination: userLabel(activeUser.id, appUsers),
      destinationMemberId: activeUser.id
    });
    setSelectedMonimonId(group.id);
    setShowJoinMonimon(false);
    window.localStorage.removeItem(pendingInviteStorageKey);
    setToastMessage(`Te uniste a ${group.name}.`);
    window.setTimeout(() => setToastMessage(""), 2200);
    return { ok: true, group };
  }

  useEffect(() => {
    const inviteToken = inviteTokenFromText(window.location.href) || window.localStorage.getItem(pendingInviteStorageKey) || "";
    if (!inviteToken || handledInviteRef.current === inviteToken) return;
    const result = acceptGroupInvite(inviteToken, { quiet: true });
    if (result.ok) handledInviteRef.current = inviteToken;
  }, [activeUser?.id, monimons, monimonMembers]);

  useEffect(() => {
    function closeFloatingMenus(event) {
      if (profileAreaRef.current && !profileAreaRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeFloatingMenus);
    return () => document.removeEventListener("pointerdown", closeFloatingMenus);
  }, [setProfileMenuOpen]);

  function closeMonimonModals() {
    setEditingMonimonId(null);
    setShowCreateMonimon(false);
    setShowJoinMonimon(false);
    setShowShareMonimon(false);
    setGroupHubActionsOpen(false);
  }

  function openCreateGroup() {
    setEditingMonimonId(null);
    setShowCreateMonimon(true);
    setGroupHubActionsOpen(false);
  }

  function joinGroupFromInvite() {
    setJoinInviteValue("");
    setJoinInviteError("");
    setShowJoinMonimon(true);
    setGroupHubActionsOpen(false);
  }

  function submitJoinGroupInvite(event) {
    event.preventDefault();
    const result = acceptGroupInvite(inviteTokenFromText(joinInviteValue));
    if (result.ok) {
      setJoinInviteValue("");
      setJoinInviteError("");
      return;
    }
    setJoinInviteError(result.error);
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
    recordActivity?.({
      monimonId: "personal",
      memberId: activeUser.id,
      activity: "Solicitud de amistad enviada",
      destination: userLabel(memberId, appUsers),
      destinationMemberId: memberId
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

  function approveContactRequest(ownerProfileId) {
    if (!activeUser || !ownerProfileId) return;
    const now = new Date().toISOString();
    setContacts((items) => {
      const nextItems = items.map((item) => (
        (item.ownerProfileId === ownerProfileId && item.memberId === activeUser.id)
          || (item.ownerProfileId === activeUser.id && item.memberId === ownerProfileId)
          ? { ...item, status: "active", acceptedAt: item.acceptedAt || now }
          : item
      ));
      const hasMirror = nextItems.some((item) => item.ownerProfileId === activeUser.id && item.memberId === ownerProfileId && item.status !== "removed");
      return hasMirror
        ? nextItems
        : [
            {
              id: contactKey(activeUser.id, ownerProfileId),
              ownerProfileId: activeUser.id,
              memberId: ownerProfileId,
              status: "active",
              createdAt: now,
              acceptedAt: now
            },
            ...nextItems
          ];
    });
    recordActivity?.({
      monimonId: "personal",
      memberId: activeUser.id,
      activity: "Aceptación de solicitud de amistad",
      destination: userLabel(ownerProfileId, appUsers),
      destinationMemberId: ownerProfileId
    });
  }

  function rejectContactRequest(ownerProfileId) {
    if (!activeUser || !ownerProfileId) return;
    setContacts((items) => items.map((item) => (
      item.ownerProfileId === ownerProfileId && item.memberId === activeUser.id
        ? { ...item, status: "removed", rejectedAt: new Date().toISOString() }
        : item
    )));
  }

  function saveEditedDebt({ id, title, category, amount, currency, date, fromMemberId, toMemberId, kind, splitParticipantIds, splitMode, splitAmounts, splitPercentages }) {
    const parsedAmount = parseAmountInput(amount);
    if (!title.trim() || parsedAmount <= 0) return;
    const previousDebt = debts.find((item) => item.id === id);
    const nextDebt = previousDebt
      ? {
          ...previousDebt,
          title: title.trim(),
          category: category || previousDebt.category || "general",
          splitParticipantIds: splitParticipantIds || previousDebt.splitParticipantIds || [],
          splitMode: splitMode || previousDebt.splitMode || "equal",
          splitAmounts: splitAmounts || previousDebt.splitAmounts || {},
          splitPercentages: splitPercentages || previousDebt.splitPercentages || {},
          amount: parsedAmount,
          currency,
          date,
          fromMemberId,
          toMemberId,
          kind: kind || previousDebt.kind || "expense"
        }
      : null;
    setDebts((items) => items.map((item) => (item.id === id ? { ...item, title: title.trim(), category: category || item.category || "general", splitParticipantIds: splitParticipantIds || item.splitParticipantIds || [], splitMode: splitMode || item.splitMode || "equal", splitAmounts: splitAmounts || item.splitAmounts || {}, splitPercentages: splitPercentages || item.splitPercentages || {}, amount: parsedAmount, currency, date, fromMemberId, toMemberId, kind: kind || item.kind || "expense" } : item)));
    const changedFields = previousDebt && nextDebt
      ? [
          previousDebt.title !== nextDebt.title ? "NOMBRE" : null,
          Number(previousDebt.amount) !== Number(nextDebt.amount) || (previousDebt.currency || "ARS") !== (nextDebt.currency || "ARS") ? "IMPORTE" : null,
          (previousDebt.category || "general") !== (nextDebt.category || "general") ? "CATEGORÍA" : null,
          debtDateKey(previousDebt) !== debtDateKey(nextDebt) ? "FECHA" : null,
          previousDebt.fromMemberId !== nextDebt.fromMemberId
            || previousDebt.toMemberId !== nextDebt.toMemberId
            || (previousDebt.kind || "expense") !== (nextDebt.kind || "expense")
            || (previousDebt.splitMode || "equal") !== (nextDebt.splitMode || "equal")
            || !sameCanonicalValue(previousDebt.splitParticipantIds || [], nextDebt.splitParticipantIds || [])
            || !sameCanonicalValue(previousDebt.splitAmounts || {}, nextDebt.splitAmounts || {})
            || !sameCanonicalValue(previousDebt.splitPercentages || {}, nextDebt.splitPercentages || {})
            ? "AJUSTE"
            : null
        ].filter(Boolean)
      : [];
    const members = getSummaryDebtMembers(previousDebt);
    const previousNet = previousDebt ? expenseNetFor(previousDebt, activeUser.id, members) : 0;
    const nextNet = nextDebt ? expenseNetFor(nextDebt, activeUser.id, members) : 0;
    recordActivity?.({
      monimonId: previousDebt?.monimonId || selectedMonimonId,
      memberId: activeUser.id,
      activity: `${nextDebt?.kind === "loan" ? "Modificación de préstamo" : "Modificación de gasto"}${changedFields.length ? `: ${changedFields.join(", ")}` : ""}`,
      amount: parsedAmount,
      currency,
      destination: toMemberId === "group" ? "GRUPO" : userLabel(toMemberId, appUsers),
      destinationMemberId: toMemberId === "group" ? "" : toMemberId,
      targetMemberId: fromMemberId,
      balanceDelta: nextDebt?.kind === "loan" ? 0 : nextNet - previousNet
    });
    setEditingDebt(null);
  }

  function deleteDebt(debt) {
    if (!window.confirm(`Eliminar ${debt.title}?`)) return;
    setDebts((items) => items.filter((item) => item.id !== debt.id));
    setSelectedDebtIds((items) => items.filter((id) => id !== debt.id));
    recordActivity?.({
      monimonId: debt.monimonId,
      memberId: activeUser.id,
      activity: debt.kind === "loan" ? "Eliminación de préstamo" : "Eliminación de gasto",
      amount: debt.amount,
      currency: debt.currency,
      destination: debt.toMemberId === "group" ? "GRUPO" : userLabel(debt.toMemberId, appUsers),
      destinationMemberId: debt.toMemberId === "group" ? "" : debt.toMemberId
    });
  }

  function repeatDebt(debt) {
    if (!debt || debt.kind === "loan") return;
    setDebts((items) => [
      {
        ...debt,
        id: Date.now(),
        date: formatISODate(todayISO()),
        status: "open",
        registeredByMemberId: activeUser.id
      },
      ...items
    ]);
  }

  function saveEditedPayment({ id, detail, amount }) {
    const parsedAmount = parseAmountInput(amount);
    if (!detail.trim() || parsedAmount <= 0) return;
    const previousPayment = payments.find((item) => item.id === id);
    setPayments((items) => items.map((item) => (item.id === id ? { ...item, detail: detail.trim(), amount: parsedAmount } : item)));
    if (previousPayment) {
      recordActivity?.({
        monimonId: previousPayment.monimonId,
        memberId: activeUser.id,
        activity: "Modificación de pago",
        amount: parsedAmount,
        currency: previousPayment.currency,
        destination: userLabel(previousPayment.toMemberId, appUsers),
        destinationMemberId: previousPayment.toMemberId
      });
    }
    setEditingPayment(null);
  }

  function deletePayment(payment) {
    if (!window.confirm(`Eliminar ${payment.detail}?`)) return;
    setPayments((items) => items.filter((item) => item.id !== payment.id));
    recordActivity?.({
      monimonId: payment.monimonId,
      memberId: activeUser.id,
      activity: "Eliminación de registro de pago",
      amount: payment.amount,
      currency: payment.currency,
      destination: userLabel(payment.toMemberId, appUsers),
      destinationMemberId: payment.toMemberId
    });
  }

  async function deleteMonimon(monimon) {
    if (!monimon) return false;
    const confirmed = window.confirm(
      `Eliminar el grupo ${monimon.name}?\n\nSe eliminará por completo y no se puede recuperar. Sus gastos, pagos, solicitudes y registros se perderán para siempre.`
    );
    if (!confirmed) return false;
    try {
      await deleteMonimonFromBackend(monimon.id);
      recordActivity?.({
        monimonId: monimon.id,
        memberId: activeUser.id,
        activity: "Eliminación del grupo",
        destination: monimon.name
      });
      closeMonimonModals();
      replaceMonimons(monimons.filter((item) => item.id !== monimon.id));
      setDebts((items) => items.filter((item) => item.monimonId !== monimon.id));
      setPayments((items) => items.filter((item) => item.monimonId !== monimon.id));
      setPaymentRequests((items) => items.filter((item) => item.monimonId !== monimon.id));
      setSelectedDebtIds([]);
      setActiveView("resumen");
      setSelectedMonimonId("");
      return true;
    } catch (error) {
      window.alert(error.message || "No se pudo eliminar el grupo en la base de datos.");
      return false;
    }
  }

  const agendaInviteMembers = contacts
    .filter((contact) => contact.ownerProfileId === activeUser.id && contact.status === "active")
    .map((contact) => appUsers.find((member) => member.id === contact.memberId))
    .filter((member) => member && member.id !== activeUser.id)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  function inviteAgendaMemberToGroup(memberId) {
    if (!selectedMonimon || !memberId) return;
    if (!canManageSelectedGroup) {
      setToastMessage("Solo un administrador puede invitar integrantes desde Agenda.");
      window.setTimeout(() => setToastMessage(""), 2200);
      return;
    }
    const memberName = userLabel(memberId, appUsers);
    if (selectedMonimon.members.includes(memberId)) {
      setToastMessage(`${memberName} ya está en ${selectedMonimon.name}.`);
      window.setTimeout(() => setToastMessage(""), 2200);
      return;
    }
    const now = new Date().toISOString();
    replaceMonimons(monimons.map((monimon) => (
      monimon.id === selectedMonimon.id
        ? { ...monimon, members: [...new Set([...(monimon.members || []), memberId])] }
        : monimon
    )));
    setMonimonMembers((items) => [
      ...items.filter((item) => !(item.monimonId === selectedMonimon.id && item.memberId === memberId)),
      {
        monimonId: selectedMonimon.id,
        memberId,
        status: "pending",
        source: "agenda",
        invitedByMemberId: activeUser.id,
        createdAt: now
      }
    ]);
    recordActivity?.({
      monimonId: selectedMonimon.id,
      memberId: activeUser.id,
      activity: "Invitación de integrante",
      destination: memberName,
      destinationMemberId: memberId
    });
    setToastMessage(`Invitaste a ${memberName}.`);
    window.setTimeout(() => setToastMessage(""), 2200);
  }

  async function shareMonimon() {
    if (!selectedMonimon) return;
    setShowShareMonimon(true);
  }

  async function copyShareUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToastMessage("Link de grupo copiado.");
      window.setTimeout(() => setToastMessage(""), 2200);
    } catch {
      window.prompt("Copiá este link", shareUrl);
    }
  }

  function shareMonimonByWhatsapp() {
    const text = `Sumate al grupo ${selectedMonimon?.name || "MONI MON!"}: ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="min-h-screen bg-app text-milk" data-theme={appTheme}>
      <div className="ambient" />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pt-4 lg:px-6">
        <header className={`topbar ${selectedMonimon ? "with-workspace" : ""} ${sideNavCollapsed ? "nav-collapsed-topbar" : ""}`}>
          {!selectedMonimon && (
            <img src="/moni-logo-current.png" alt="moni mon!" className="topbar-logo" />
          )}
          {selectedMonimon && (
            <div className="topbar-workspace">
              <div className="workspace-select-row">
                <span className="workspace-group-icon" title={selectedGroupIconOption.label}>
                  {selectedGroupIconOption.emoji}
                </span>
                <h1 className="workspace-group-title">{selectedMonimon.name}</h1>
                {canManageSelectedGroup && (
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
                <button type="button" className="share-monimon-btn" onClick={shareMonimon} aria-label="Compartir grupo">
                  <Share2 size={17} />
                </button>
              </div>
            </div>
          )}
          <div className="topbar-actions flex items-center gap-3">
            <div className="profile-area" ref={profileAreaRef}>
              <button type="button" className="profile-trigger" onClick={() => setProfileMenuOpen((open) => !open)}>
                <Avatar user={activeUser} />
                <span>{shortDisplayName(activeUser.name)}</span>
                <ChevronDown size={16} className="profile-trigger-chevron" />
              </button>
              {profileMenuOpen && (
                <ProfileMenu
                  activeUser={activeUser}
                  appTheme={appTheme}
                  appThemes={appThemes}
                  setAppTheme={setAppTheme}
                  setProfileModal={setProfileModal}
                  setProfileMenuOpen={setProfileMenuOpen}
                  setShowContacts={setShowContacts}
                />
              )}
            </div>
          </div>
        </header>

        <div className={`app-layout ${sideNavCollapsed ? "nav-collapsed" : ""} ${!selectedMonimon ? "group-space-layout" : ""}`}>
          {selectedMonimon && (
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
                className="create-monimon-btn side-create-monimon-btn side-back-to-groups-btn"
                onClick={() => setSelectedMonimonId("")}
                aria-label="Volver a mis grupos"
              >
                <ChevronLeft size={17} /> <span>VOLVER</span>
              </button>
            </div>
            {currentNavItems.map((item) => <NavButton key={item.id} item={item} active={activeView === item.id} setActiveView={setActiveView} />)}
          </aside>
          )}

          <section className="content-area">
            {selectedMonimon && (
              <div className="workspace-people workspace-people-strip">
                {membersForSelectedMonimon.map((member) => <PersonChip key={member.id} color={memberFrameColor(selectedMonimon, member.id)}>{shortDisplayName(member.name)}</PersonChip>)}
              </div>
            )}
            <div className="dashboard-grid">
              <section className="main-column">
                {!selectedMonimon ? (
                  <GroupSpace
                    groups={activeGroups}
                    appUsers={appUsers}
                    groupHubActionsOpen={groupHubActionsOpen}
                    setGroupHubActionsOpen={setGroupHubActionsOpen}
                    onEnterGroup={(groupId) => {
                      setSelectedMonimonId(groupId);
                      setActiveView("resumen");
                    }}
                    onCreateGroup={openCreateGroup}
                    onJoinGroup={joinGroupFromInvite}
                  />
                ) : (
                  <>
                {activeView === "resumen" && (
                  <SummaryHeader
                    title="Resumen"
                    summaryByCurrency={summaryByCurrency}
                    grossExpensesByCurrency={grossExpensesByCurrency}
                    myExpensesByCurrency={myRealExpensesByCurrency}
                    labels={{ gross: "Gastos", balance: "Me deben", debt: "Mi deuda", expenses: "Mi parte" }}
                    detailLabels={{ gross: "Gastos", expenses: "Repartos", debt: "Detalle", balance: "Detalle" }}
                    onViewDebt={() => setActiveView("pago")}
                    detailData={{
                      activeUserId: activeUser.id,
                      expenses: summaryDetailExpenses,
                      groups: summaryDetailGroups,
                      members: membersForSelectedMonimon,
                      memberColors: selectedMonimon.memberColors || {},
                      settlementGroups: paymentPanelSettlementGroups,
                      getDebtMembers: getSummaryDebtMembers
                    }}
                  />
                )}
                {activeView === "gastos" && (
                  <DebtPanel activeUser={activeUser} appUsers={membersForSelectedMonimon} memberColors={selectedMonimon.memberColors || {}} getDebtMembers={getSummaryDebtMembers} listDebts={openExpenses} incomingDebts={incomingDebts} outgoingDebts={outgoingDebts} incomingTotal={expenseTotalsByCurrency.ARS.theyOwe} outgoingTotal={expenseTotalsByCurrency.ARS.iOwe} selectedDebtIds={selectedDebtIds} setSelectedDebtIds={setSelectedDebtIds} title="Gastos" action="Nuevo gasto" onNewDebt={() => setShowNewDebt(true)} onEditDebt={setEditingDebt} onDeleteDebt={deleteDebt} onRepeatDebt={repeatDebt} />
                )}
                {activeView === "prestamos" && (
                  <DebtPanel activeUser={activeUser} appUsers={membersForSelectedMonimon} memberColors={selectedMonimon.memberColors || {}} listDebts={openLoans} incomingDebts={incomingLoans} outgoingDebts={outgoingLoans} selectedDebtIds={selectedDebtIds} setSelectedDebtIds={setSelectedDebtIds} title="Préstamos" action="Nuevo préstamo" onNewDebt={() => setShowNewDebt(true)} onEditDebt={setEditingDebt} onDeleteDebt={deleteDebt} />
                )}
                {activeView === "pagos" && <PaymentsPanel payments={historyPayments} debts={historyDebts} activityLog={historyActivityLog} appUsers={appUsers} getDebtMembers={getSummaryDebtMembers} activeUserId={activeUser.id} monimons={monimons} onEditPayment={setEditingPayment} onDeletePayment={deletePayment} />}
                {activeView === "archivo" && (
                  <section className="glass-card panel">
                    <ArchivePanel files={archiveFiles} setFiles={setArchiveFiles} activeUser={activeUser} monimonId={selectedMonimonId} />
                  </section>
                )}
                {activeView === "solicitudes" && (
                  <section className="glass-card panel">
                    <PanelTitle icon={<Bell size={18} />} title="Solicitudes" />
                    <RequestsPanel
                      requests={scopedPaymentRequests}
                      contactRequests={incomingContactRequests}
                      activeUser={activeUser}
                      appUsers={appUsers}
                      selectedMonimon={selectedMonimon}
                      approvePaymentRequest={approvePaymentRequest}
                      rejectPaymentRequest={rejectPaymentRequest}
                      approveContactRequest={approveContactRequest}
                      rejectContactRequest={rejectContactRequest}
                    />
                  </section>
                )}
                {activeView === "pago" && (
                  <PaymentPanel
                    appTheme={appTheme}
                    activeUser={activeUser}
                    appUsers={appUsers}
                    selectedMonimon={selectedMonimon}
                    debts={paymentPanelDebts}
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
                    payments={paymentPanelPayments}
                    pendingDebts={paymentPanelPendingDebts}
                    settlementGroups={paymentPanelSettlementGroups}
                    onEditPayment={setEditingPayment}
                    onDeletePayment={deletePayment}
                    registerPayment={registerPayment}
                  />
                )}
                  </>
                )}
              </section>
            </div>
          </section>
        </div>
      </div>
      {toastMessage && <div className="app-toast" role="status">{toastMessage}</div>}
      {saveError && <div className="app-toast app-toast-error" role="alert">{saveError}</div>}
      {selectedMonimon && <MobileNav activeView={activeView} setActiveView={setActiveView} items={currentNavItems} />}
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
          monimonMembers={monimonMembers}
          setMonimonMembers={setMonimonMembers}
          replaceMonimons={replaceMonimons}
          setDebts={setDebts}
          setPayments={setPayments}
          setPaymentRequests={setPaymentRequests}
          setSelectedMonimonId={setSelectedMonimonId}
          contacts={contacts}
          onActivity={recordActivity}
          onClose={closeMonimonModals}
        />
      )}
      {showJoinMonimon && (
        <JoinMonimonModal
          value={joinInviteValue}
          setValue={setJoinInviteValue}
          error={joinInviteError}
          onSubmit={submitJoinGroupInvite}
          onClose={closeMonimonModals}
        />
      )}
      {showShareMonimon && selectedMonimon && (
        <ShareMonimonModal
          group={selectedMonimon}
          members={agendaInviteMembers}
          monimonMembers={monimonMembers}
          canInviteMembers={canManageSelectedGroup}
          shareUrl={shareUrl}
          onInviteMember={inviteAgendaMemberToGroup}
          onCopy={copyShareUrl}
          onWhatsapp={shareMonimonByWhatsapp}
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
          monimonMembers={monimonMembers}
          setMonimonMembers={setMonimonMembers}
          replaceMonimons={replaceMonimons}
          setDebts={setDebts}
          setPayments={setPayments}
          setPaymentRequests={setPaymentRequests}
          setSelectedMonimonId={setSelectedMonimonId}
          onDeleteMonimon={deleteMonimon}
          contacts={contacts}
          onActivity={recordActivity}
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
          contacts={contacts}
          updateActiveUser={updateActiveUser}
          deleteAccount={deleteAccount}
          updateAccountEmail={updateAccountEmail}
          updateAccountPassword={updateAccountPassword}
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

function SummaryHeader({ title = "Resumen", summaryByCurrency, grossExpensesByCurrency, myExpensesByCurrency, labels, detailLabels = {}, detailData, onViewDebt }) {
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
        <Metric id="gross" label={metricLabels.gross} detailLabel={detailLabels.gross} value={grossExpenses} currency={currentCurrency} neutro help={metricHelp.gross} openMetric={openMetric} setOpenMetric={setOpenMetric} />
        <Metric id="expenses" label={metricLabels.expenses} detailLabel={detailLabels.expenses} value={myExpenses} currency={currentCurrency} neutro help={metricHelp.expenses} openMetric={openMetric} setOpenMetric={setOpenMetric} />
        <Metric id="debt" label={metricLabels.debt} detailLabel={detailLabels.debt} value={totals.iOwe} currency={currentCurrency} negative sign="-" help={metricHelp.debt} openMetric={openMetric} setOpenMetric={setOpenMetric} />
        <Metric id="balance" label={metricLabels.balance} detailLabel={detailLabels.balance} value={totals.theyOwe} currency={currentCurrency} positive sign="+" help={metricHelp.balance} openMetric={openMetric} setOpenMetric={setOpenMetric} />
      </div>
      <SettlementPaySummary
        debts={activeSettlementDebts}
        members={detailData?.members || []}
        memberColors={detailData?.memberColors || {}}
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
        payerColor: detailData.memberColors?.[debt.fromMemberId] || "",
        amount: debt.amount
      };
    });
  const normalizedQuery = normalizedSearch(searchTerm);
  const visibleRows = expenseRows
    .filter((row) => {
      const matchesSearch = !normalizedQuery || normalizedSearch(`${row.date} ${displayDate(row.date)} ${row.motive} ${row.payer} ${row.amount}`).includes(normalizedQuery);
      const matchesDate = !dateFilter || row.date === dateFilter;
      const matchesMember = !memberFilter || row.payerId === memberFilter;
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
  function clearDateFilter() {
    setDateFilter("");
  }

  return (
    <div className="summary-detail-panel">
      <div className="summary-detail-head gross">
        <div className="summary-detail-title-row">
          <h2>{label}</h2>
          <div className="summary-title-controls">
            <label className="summary-search">
              <Search size={16} />
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar" />
            </label>
            <label className="summary-labeled-control">
              <span>Integrante</span>
              <select value={memberFilter} onChange={(event) => setMemberFilter(event.target.value)} aria-label="Filtrar gastos por integrante">
              <option value="">Todos</option>
              {payerOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
          </div>
        </div>
        <div className="summary-detail-tools">
          <div className="summary-date-filter">
            <label htmlFor="summary-gross-date-filter">Filtrar por fecha</label>
            <input id="summary-gross-date-filter" className="summary-filter-input" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="Filtrar por fecha" />
            <button type="button" onClick={clearDateFilter} disabled={!dateFilter} aria-label="Limpiar fecha">x</button>
          </div>
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
        columns={["Fecha", "Actividad", "Pagado por", "Importe"]}
        rows={visibleRows}
        renderRow={(row) => [displayDate(row.date), row.motive, <PersonChip color={row.payerColor}>{row.payer}</PersonChip>, money(row.amount, currency)]}
        totalAmount={visibleRows.reduce((sum, row) => sum + row.amount, 0)}
        currency={currency}
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
          other: otherMember?.name || "INTEGRANTE",
          otherColor: detailData.memberColors?.[detail.otherMemberId] || ""
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
        renderRow={(row) => [<PersonChip color={row.otherColor}>{mode === "recover" ? row.other : row.other}</PersonChip>, money(row.amount, currency), row.status]}
        totalAmount={rows.reduce((sum, row) => sum + row.amount, 0)}
        currency={currency}
      />
    </div>
  );
}

function SummaryMyExpensesDetail({ label, currency, detailData }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const memberOptions = (detailData.members || []).filter((member) => member?.id);
  const [selectedMemberId, setSelectedMemberId] = useState(detailData.activeUserId || "group");
  const expenseMemberId = selectedMemberId === "group" || memberOptions.some((member) => member.id === selectedMemberId)
    ? selectedMemberId
    : detailData.activeUserId || "group";
  const expenseRows = (detailData.expenses || [])
    .filter((debt) => debt.currency === currency)
    .map((debt) => {
      const members = detailData.getDebtMembers?.(debt) || detailData.members || [];
      const amount = expenseMemberId === "group" ? debt.amount : debtSplitAmountFor(debt, expenseMemberId, members);
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
  function clearDateFilter() {
    setDateFilter("");
  }
  const normalizedQuery = normalizedSearch(searchTerm);
  const rows = expenseRows
    .filter((row) => {
      const matchesSearch = !normalizedQuery || normalizedSearch(`${row.date} ${displayDate(row.date)} ${row.motive} ${row.payer} ${row.amount}`).includes(normalizedQuery);
      const matchesDate = !dateFilter || row.date === dateFilter;
      return matchesSearch && matchesDate;
    })
    .sort((a, b) => {
      return String(b.date).localeCompare(String(a.date));
    });

  return (
    <div className="summary-detail-panel">
      <div className="summary-detail-head gross">
        <div className="summary-detail-title-row">
          <h2>{label}</h2>
          <div className="summary-title-controls">
            <label className="summary-search">
              <Search size={16} />
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar" />
            </label>
            <label className="summary-labeled-control">
              <span>Integrante</span>
              <select value={expenseMemberId} onChange={(event) => setSelectedMemberId(event.target.value)} aria-label="Ver gasto real de integrante">
                <option value="group">GRUPO</option>
                {memberOptions.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </label>
          </div>
        </div>
        <div className="summary-detail-tools">
          <div className="summary-date-filter">
            <label htmlFor="summary-expense-date-filter">Filtrar por fecha</label>
            <input id="summary-expense-date-filter" className="summary-filter-input" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="Filtrar por fecha" />
            <button type="button" onClick={clearDateFilter} disabled={!dateFilter} aria-label="Limpiar fecha">x</button>
          </div>
        </div>
      </div>
      <SummaryTable
        columns={["Fecha", "Actividad", "Importe"]}
        rows={rows}
        renderRow={(row) => [displayDate(row.date), row.motive, money(row.amount, currency)]}
        totalAmount={rows.reduce((sum, row) => sum + row.amount, 0)}
        currency={currency}
      />
    </div>
  );
}

function SummaryTable({ columns, rows, renderRow, totalAmount = null, currency = "ARS" }) {
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
      {totalAmount !== null && (
        <div className="summary-table-total">
          <span>IMPORTE TOTAL:</span>
          <strong>{money(totalAmount, currency)}</strong>
        </div>
      )}
    </div>
  );
}

function ProfileMenu({ activeUser, appTheme, appThemes, setAppTheme, setProfileModal, setProfileMenuOpen, setShowContacts }) {
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  function chooseModal(modal) {
    setProfileMenuOpen(false);
    setProfileModal(modal);
  }

  return (
    <div className="profile-menu">
      <div className="profile-menu-head">
        <Avatar user={activeUser} />
        <div>
          <b>{shortDisplayName(activeUser.name)}</b>
          <small>{activeUser.role === "admin" ? "Admin" : "Usuario activo"}</small>
        </div>
        {activeUser.role === "admin" && <span className="profile-role-badge"><ShieldCheck size={14} /> Admin</span>}
      </div>
      <button
        type="button"
        onClick={() => {
          setShowContacts(true);
          setProfileMenuOpen(false);
        }}
      >
        <BookUser size={17} /> Agenda
      </button>
      <div className="profile-menu-nested">
        <button type="button" onClick={() => setThemeMenuOpen((open) => !open)} aria-expanded={themeMenuOpen}>
          <Palette size={17} /> Tema {themeMenuOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
        {themeMenuOpen && (
          <div className="profile-theme-options">
            {appThemes.map((theme) => (
              <button
                key={theme.id}
                type="button"
                className={theme.id === appTheme ? "active" : ""}
                onClick={() => setAppTheme(theme.id)}
              >
                {theme.name}
              </button>
            ))}
          </div>
        )}
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

function SettingsModal({ activeUser, appUsers, contacts, updateActiveUser, deleteAccount, updateAccountEmail, updateAccountPassword, onClose }) {
  const [username, setUsername] = useState(activeUser.username || usernameFromProfile(activeUser));
  const [name, setName] = useState(shortDisplayName(activeUser.name));
  const [email, setEmail] = useState(activeUser.email || "");
  const [editingEmail, setEditingEmail] = useState(false);
  const [password, setPassword] = useState("");
  const [editingPassword, setEditingPassword] = useState(false);
  const [bankAlias, setBankAlias] = useState(activeUser.bankAlias || "");
  const [bankCbu, setBankCbu] = useState(activeUser.bankCbu || "");
  const [bankVisibilityMode, setBankVisibilityMode] = useState(activeUser.bankVisibilityMode || "hidden");
  const [bankVisibleMemberIds, setBankVisibleMemberIds] = useState(Array.isArray(activeUser.bankVisibleMemberIds) ? activeUser.bankVisibleMemberIds : []);
  const [visibilityMenuOpen, setVisibilityMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [accountSaving, setAccountSaving] = useState("");
  const [deleting, setDeleting] = useState(false);
  const isGoogleAccount = activeUser.authProvider === "google";
  const agendaContactIds = new Set(
    (contacts || [])
      .filter((contact) => contact.ownerProfileId === activeUser.id && contact.status === "active")
      .map((contact) => contact.memberId)
  );
  const visibilityMembers = appUsers
    .filter((user) => user.id !== activeUser.id && agendaContactIds.has(user.id))
    .filter(isRegisteredContactCandidate)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  async function saveSettings() {
    const cleanUsername = normalizeUsername(username);
    const cleanName = shortDisplayName(name).slice(0, 20);
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
    updateActiveUser({
      name: cleanName,
      username: cleanUsername,
      bankAlias: bankAlias.trim(),
      bankCbu: bankCbu.trim(),
      bankVisibilityMode,
      bankVisibleMemberIds: bankVisibilityMode === "selected" ? bankVisibleMemberIds : []
    });
    onClose();
  }

  function toggleBankVisibleMember(memberId) {
    setBankVisibleMemberIds((items) => (
      items.includes(memberId)
        ? items.filter((id) => id !== memberId)
        : [...items, memberId]
    ));
  }

  async function saveEmailChange() {
    if (isGoogleAccount) {
      setEditingEmail(false);
      setAccountMessage("");
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes("@")) {
      setError("Ingresá un correo válido.");
      return;
    }
    setAccountSaving("email");
    setError("");
    setAccountMessage("");
    try {
      await updateAccountEmail(cleanEmail);
      setEditingEmail(false);
      setAccountMessage("Correo actualizado. Puede requerir confirmación según la configuración de la cuenta.");
    } catch (updateError) {
      setError(updateError.message || "No se pudo actualizar el correo.");
    } finally {
      setAccountSaving("");
    }
  }

  async function savePasswordChange() {
    if (isGoogleAccount) return;
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setAccountSaving("password");
    setError("");
    setAccountMessage("");
    try {
      await updateAccountPassword(password);
      setPassword("");
      setEditingPassword(false);
      setAccountMessage("Contraseña actualizada.");
    } catch (updateError) {
      setError(updateError.message || "No se pudo actualizar la contraseña.");
    } finally {
      setAccountSaving("");
    }
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
        <label>Nombre de Usuario</label>
        <div className="username-input">
          <span aria-hidden="true">@</span>
          <input
            value={username}
            maxLength={24}
            onChange={(event) => setUsername(normalizeUsername(event.target.value))}
            placeholder="usuario.unico"
          />
        </div>
        <p className="settings-hint">Usuario para que te encuentren tus amigos.</p>
        <label>Nombre visible</label>
        <input value={name} maxLength={20} onChange={(event) => setName(event.target.value.trim() ? shortDisplayName(event.target.value).slice(0, 20) : "")} />
        <p className="settings-hint">Nombre visible para tus amigos.</p>
        <label id="account-access-title">Cuenta y acceso</label>
        <section className="account-access-section" aria-labelledby="account-access-title">
          <div className="settings-account-grid">
            <label className="settings-account-field">
              <span>Correo</span>
              <input value={email} disabled={isGoogleAccount || !editingEmail || accountSaving === "email"} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <button
              type="button"
              className="settings-inline-edit"
              onClick={editingEmail ? saveEmailChange : () => setEditingEmail(true)}
              disabled={isGoogleAccount || accountSaving === "email"}
            >
              {isGoogleAccount ? "Cuenta Google" : accountSaving === "email" ? "Guardando" : editingEmail ? "Guardar correo" : "Editar correo"}
            </button>
            <label className="settings-account-field">
              <span>Contraseña</span>
              <input
                value={editingPassword ? password : "********"}
                disabled={!editingPassword || isGoogleAccount || accountSaving === "password"}
                type="password"
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="settings-inline-edit"
              onClick={editingPassword ? savePasswordChange : () => setEditingPassword(true)}
              disabled={isGoogleAccount || accountSaving === "password"}
            >
              {isGoogleAccount ? "Cuenta Google" : accountSaving === "password" ? "Guardando" : editingPassword ? "Guardar contraseña" : "Editar contraseña"}
            </button>
          </div>
          {isGoogleAccount && <p className="settings-hint">Cuenta vinculada con Google.</p>}
          {accountMessage && <p className="settings-hint">{accountMessage}</p>}
        </section>
        <section className="optional-info-section" aria-labelledby="optional-info-title">
          <h3 id="optional-info-title">INFORMACIÓN OPCIONAL:</h3>
          <div className="optional-info-grid">
            <div>
              <h4>Datos para transferencia bancaria</h4>
              <label>Alias:</label>
              <input value={bankAlias} onChange={(event) => setBankAlias(event.target.value)} placeholder="alias.banco" />
              <label>CBU:</label>
              <input value={bankCbu} onChange={(event) => setBankCbu(event.target.value.replace(/\D/g, "").slice(0, 22))} placeholder="0000000000000000000000" />
            </div>
            <div className="optional-visibility-card">
              <h4>VISIBILIDAD</h4>
              <div className="optional-visibility-options">
                <label className="optional-radio-row">
                  <input
                    type="radio"
                    name="bank-visibility"
                    checked={bankVisibilityMode === "hidden"}
                    onChange={() => {
                      setBankVisibilityMode("hidden");
                      setVisibilityMenuOpen(false);
                    }}
                  />
                  No mostrar
                </label>
                <label className="optional-radio-row">
                  <input
                    type="radio"
                    name="bank-visibility"
                    checked={bankVisibilityMode === "friends"}
                    onChange={() => {
                      setBankVisibilityMode("friends");
                      setVisibilityMenuOpen(false);
                    }}
                  />
                  Todos mis amigos
                </label>
                <div className="optional-checkbox-select">
                  <label className="optional-radio-row optional-select-radio">
                    <input
                      type="radio"
                      name="bank-visibility"
                      checked={bankVisibilityMode === "selected"}
                      onChange={() => {
                        setBankVisibilityMode("selected");
                        setVisibilityMenuOpen(true);
                      }}
                    />
                    <button
                      type="button"
                      className="optional-friends-select"
                      onClick={() => {
                        setBankVisibilityMode("selected");
                        setVisibilityMenuOpen((open) => !open);
                      }}
                      aria-expanded={bankVisibilityMode === "selected" && visibilityMenuOpen}
                    >
                      <span>Seleccionar amigos</span>
                      <ChevronDown size={16} />
                    </button>
                  </label>
                  {bankVisibilityMode === "selected" && visibilityMenuOpen && (
                    <div className="optional-check-list">
                      {visibilityMembers.length ? visibilityMembers.map((member) => (
                        <label key={member.id} className="optional-check-row">
                          <input
                            type="checkbox"
                            checked={bankVisibleMemberIds.includes(member.id)}
                            onChange={() => toggleBankVisibleMember(member.id)}
                          />
                          {shortDisplayName(member.name)}
                        </label>
                      )) : (
                        <p className="settings-hint">Todavía no tenés amigos registrados en tu agenda.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
        {error && <p className="form-error">{error}</p>}
        <button type="button" className="primary-action modal-create-btn" onClick={saveSettings}>GUARDAR</button>
        <section className="sensitive-zone" aria-labelledby="sensitive-zone-title">
          <div>
            <span className="sensitive-icon"><ShieldAlert size={17} /></span>
            <div>
              <h3 id="sensitive-zone-title">Zona de riesgo</h3>
            </div>
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

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function ArchivePanel({ files, setFiles, activeUser, monimonId }) {
  const [dragging, setDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [galleryGroupBy, setGalleryGroupBy] = useState("uploadedBy");
  const [gallerySortBy, setGallerySortBy] = useState("date-desc");
  const scopedFiles = files.filter((file) => !file.monimonId || file.monimonId === monimonId);
  const orderedFiles = [...scopedFiles].sort((a, b) => {
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

  async function addFiles(fileList) {
    const imageFiles = [...fileList].filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length) return;
    const nextFiles = await Promise.all(imageFiles.map(async (file) => ({
      id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
      name: file.name,
      size: file.size,
      dataUrl: await fileToDataUrl(file),
      monimonId,
      createdAt: formatISODate(todayISO()),
      uploadedBy: activeUser?.name || "Usuario",
      category: "General"
    })));
    setFiles((items) => [...nextFiles, ...items]);
  }

  function addPastedImages(event) {
    const clipboardItems = [...(event.clipboardData?.items || [])];
    const imageFiles = clipboardItems
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter(Boolean)
      .map((file, index) => new File(
        [file],
        file.name && file.name !== "image.png" ? file.name : `captura-portapapeles-${Date.now()}-${index + 1}.png`,
        { type: file.type || "image/png", lastModified: Date.now() }
      ));
    if (!imageFiles.length) return;
    event.preventDefault();
    addFiles(imageFiles);
  }

  useEffect(() => {
    window.addEventListener("paste", addPastedImages);
    return () => window.removeEventListener("paste", addPastedImages);
  });

  function deleteFile(fileId) {
    setFiles((items) => {
      return items.filter((item) => item.id !== fileId);
    });
    setPreviewFile((file) => (file?.id === fileId ? null : file));
  }

  return (
    <>
      <PanelTitle icon={<Archive size={18} />} title="Archivo" />
      <label
        className={`archive-dropzone ${dragging ? "dragging" : ""}`}
        tabIndex={0}
        onPaste={addPastedImages}
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
        <strong>Arrastrá, pegá una imagen o seleccioná desde tu dispositivo</strong>
        <span>Fotos de tickets, facturas, comprobantes o capturas.</span>
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
                      <img src={file.dataUrl} alt={file.name} />
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
        <img className="archive-preview-image" src={file.dataUrl} alt={file.name} />
        <div className="archive-preview-actions">
          <button type="button" className="archive-delete large" onClick={onDelete}>
            <Trash2 size={16} /> Eliminar imagen
          </button>
        </div>
      </div>
    </div>
  );
}

function JoinMonimonModal({ value, setValue, error, onSubmit, onClose }) {
  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="join-monimon-title">
      <form className="create-modal join-monimon-modal" onSubmit={onSubmit}>
        <div className="modal-head">
          <h2 id="join-monimon-title">Unirme a grupo</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <section className="monimon-editor-section join-monimon-section">
          <label htmlFor="join-monimon-invite">
            Link o código de invitación
            <input
              id="join-monimon-invite"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="ABC123 o https://monimoni-web.vercel.app/grupo/ABC123"
              autoFocus
            />
          </label>
          <p>Usá el enlace o código que te compartieron para unirte a un grupo nuevo.</p>
          {error && <span className="form-error">{error}</span>}
        </section>
        <div className="monimon-modal-actions">
          <button type="button" className="cancel-monimon" onClick={onClose}>Cancelar</button>
          <button type="submit" className="modal-create-btn">Unirme</button>
        </div>
      </form>
    </div>
  );
}

function ShareMonimonModal({ group, members, monimonMembers = [], canInviteMembers, shareUrl, onInviteMember, onCopy, onWhatsapp, onClose }) {
  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="share-monimon-title">
      <div className="create-modal share-monimon-modal">
        <div className="modal-head">
          <h2 id="share-monimon-title">Compartir grupo</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <section className="share-monimon-section">
          <div className="group-heading">
            <span>Agenda</span>
          </div>
          {!canInviteMembers && <p className="share-empty">Solo un administrador puede invitar integrantes desde Agenda.</p>}
          <div className="share-agenda-list">
            {members.length ? (
              members.map((member) => {
                const membership = monimonMembers.find((item) => item.monimonId === group.id && item.memberId === member.id && item.status !== "removed");
                const alreadyInGroup = Boolean(membership || group.members.includes(member.id));
                const isPending = membership?.status === "pending";
                return (
                  <div className="share-agenda-row" key={member.id}>
                    <PersonChip color={memberFrameColor(group, member.id)}>{shortDisplayName(member.name)}</PersonChip>
                    <button type="button" onClick={() => onInviteMember(member.id)} disabled={!canInviteMembers || alreadyInGroup}>
                      {isPending ? "Pendiente" : alreadyInGroup ? "En grupo" : "Invitar"}
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="share-empty">Todavía no tenés amigos en tu agenda.</p>
            )}
          </div>
        </section>
        <section className="share-monimon-section">
          <div className="group-heading">
            <span>Enlace de invitación</span>
          </div>
          <div className="share-link-row">
            <input value={shareUrl} readOnly aria-label="Enlace de invitación" />
            <button type="button" onClick={onCopy}>Copiar</button>
            <button type="button" className="whatsapp-share-btn" onClick={onWhatsapp} aria-label="Compartir por WhatsApp">
              <MessageCircle size={17} /> WhatsApp
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function GroupSpace({ groups, appUsers, groupHubActionsOpen, setGroupHubActionsOpen, onEnterGroup, onCreateGroup, onJoinGroup }) {
  const memberById = new Map(appUsers.map((member) => [member.id, member]));
  const creatorNameFor = (group) => {
    const creatorId = group.createdByMemberId || group.adminIds?.[0] || group.members?.[0];
    return shortDisplayName(memberById.get(creatorId)?.name || creatorId || "USUARIO");
  };
  return (
    <section className="group-space">
      <div className="group-space-head">
        <PanelTitle icon={<Home size={20} />} title="MIS GRUPOS" />
      </div>
      {groups.length ? (
        <div className="group-card-grid">
          {groups.map((group) => {
            const icon = groupIconOptions.find((item) => item.id === group.icon) || groupIconOptions[0];
            const members = (group.members || []).map((memberId) => memberById.get(memberId)).filter(Boolean);
            return (
              <button type="button" className="group-card" key={group.id} onClick={() => onEnterGroup(group.id)}>
                <span className="group-card-icon" aria-hidden="true">{icon.emoji}</span>
                <span className="group-card-main">
                  <b>{group.name}</b>
                  <span className="group-card-members">
                    {members.length
                      ? members.map((member) => <PersonChip key={member.id} color={memberFrameColor(group, member.id)}>{shortDisplayName(member.name)}</PersonChip>)
                      : <PersonChip>Sin integrantes</PersonChip>}
                  </span>
                  <small>Creado por <strong>{creatorNameFor(group)}</strong></small>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="group-space-empty">Todavía no estás en ningún grupo.</p>
      )}
      <div className="group-space-actions">
        <button
          type="button"
          className="create-monimon-btn group-space-create-btn"
          onClick={() => setGroupHubActionsOpen((open) => !open)}
          aria-expanded={groupHubActionsOpen}
        >
          <Plus size={17} /> <span>NUEVO GRUPO</span>
        </button>
        {groupHubActionsOpen && (
          <div className="group-action-menu group-space-action-menu">
            <button type="button" onClick={onCreateGroup}>Crear</button>
            <button type="button" onClick={onJoinGroup}>Unirme</button>
          </div>
        )}
      </div>
    </section>
  );
}

function CreateMonimonModal({ activeUser, appUsers, setMembers, monimon, monimons, monimonMembers = [], setMonimonMembers, replaceMonimons, setDebts, setPayments, setPaymentRequests, setSelectedMonimonId, onDeleteMonimon, contacts, onActivity, onClose }) {
  const [monimonName, setMonimonName] = useState(monimon?.name || "");
  const [groupIcon, setGroupIcon] = useState(monimon?.icon || "home");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [memberIds, setMemberIds] = useState(monimon?.members || [activeUser.id]);
  const [memberColors, setMemberColors] = useState(monimon?.memberColors || {});
  const [adminIds, setAdminIds] = useState(monimon?.adminIds?.length ? monimon.adminIds : [activeUser.id]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [ghostName, setGhostName] = useState("");
  const [editingGuestId, setEditingGuestId] = useState(null);
  const [editingGuestName, setEditingGuestName] = useState("");
  const [linkingGuestId, setLinkingGuestId] = useState(null);
  const [linkTargetId, setLinkTargetId] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [dangerOpen, setDangerOpen] = useState(false);
  const [error, setError] = useState("");
  const isEditing = Boolean(monimon);
  const canLinkGuests = isEditing && adminIds.includes(activeUser.id);
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
  const availableLinkUsers = appUsers.filter((user) => (
    contactMemberIds.has(user.id)
    && user.profileId
    && user.memberStatus !== "ghost"
    && !memberIds.includes(user.id)
  ));
  const membershipByMemberId = new Map(
    monimonMembers
      .filter((membership) => membership.monimonId === monimon?.id && membership.status !== "removed")
      .map((membership) => [membership.memberId, membership])
  );
  const memberNameForActivity = (memberId) => displayPersonName(memberId, appUsers);
  const colorForMember = (memberId) => memberFrameColor({ memberColors }, memberId);

  function cleanMemberColors(colors, ids) {
    const cleanIds = new Set(ids);
    return Object.fromEntries(
      Object.entries(colors || {})
        .filter(([memberId, color]) => cleanIds.has(memberId) && isHexColor(color))
    );
  }

  function updateMemberColor(memberId, color) {
    setMemberColors((items) => {
      if (!isHexColor(color)) {
        const { [memberId]: _removed, ...rest } = items;
        return rest;
      }
      return { ...items, [memberId]: color };
    });
  }

  function replaceMemberIdInObject(value, fromId, toId) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    return Object.fromEntries(Object.entries(value).map(([key, amount]) => [key === fromId ? toId : key, amount]));
  }

  function replaceMemberIdInRecords(records, fromId, toId) {
    return records.map((record) => ({
      ...record,
      fromMemberId: record.fromMemberId === fromId ? toId : record.fromMemberId,
      toMemberId: record.toMemberId === fromId ? toId : record.toMemberId,
      requestedByMemberId: record.requestedByMemberId === fromId ? toId : record.requestedByMemberId,
      rejectedByMemberId: record.rejectedByMemberId === fromId ? toId : record.rejectedByMemberId,
      registeredByMemberId: record.registeredByMemberId === fromId ? toId : record.registeredByMemberId,
      approvedByMemberIds: Array.isArray(record.approvedByMemberIds)
        ? [...new Set(record.approvedByMemberIds.map((id) => (id === fromId ? toId : id)))]
        : record.approvedByMemberIds,
      requiredApproverMemberIds: Array.isArray(record.requiredApproverMemberIds)
        ? [...new Set(record.requiredApproverMemberIds.map((id) => (id === fromId ? toId : id)))]
        : record.requiredApproverMemberIds,
      verifiedByMemberIds: Array.isArray(record.verifiedByMemberIds)
        ? [...new Set(record.verifiedByMemberIds.map((id) => (id === fromId ? toId : id)))]
        : record.verifiedByMemberIds,
      splitParticipantIds: Array.isArray(record.splitParticipantIds)
        ? [...new Set(record.splitParticipantIds.map((id) => (id === fromId ? toId : id)))]
        : record.splitParticipantIds,
      splitAmounts: replaceMemberIdInObject(record.splitAmounts, fromId, toId),
      splitPercentages: replaceMemberIdInObject(record.splitPercentages, fromId, toId)
    }));
  }

  function addMember() {
    if (!selectedMemberId) {
      setError("Seleccioná un contacto.");
      return;
    }
    setMemberIds((items) => [...items, selectedMemberId]);
    setSelectedMemberId("");
    setError("");
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
    setMemberColors((items) => {
      const { [memberId]: _removed, ...rest } = items;
      return rest;
    });
    setAdminIds((items) => {
      const nextAdmins = items.filter((id) => id !== memberId);
      return nextAdmins.length ? nextAdmins : [activeUser.id];
    });
  }

  function addGhostMember() {
    const cleanName = ghostName.trim().slice(0, 40);
    if (!cleanName) {
      setError("Ingresá un nombre de integrante invitado.");
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

  function startLinkingGuest(memberId) {
    if (!canLinkGuests) {
      setError("Solo un administrador puede vincular invitados.");
      return;
    }
    setEditingGuestId(null);
    setEditingGuestName("");
    setLinkingGuestId(memberId);
    setLinkTargetId("");
    setError("");
  }

  function linkGuestToContact() {
    if (!canLinkGuests || !linkingGuestId) {
      setError("Solo un administrador puede vincular invitados.");
      return;
    }
    if (!linkTargetId) {
      setError("Seleccioná un contacto para vincular.");
      return;
    }
    const guest = appUsers.find((user) => user.id === linkingGuestId);
    const linkedUser = appUsers.find((user) => user.id === linkTargetId);
    if (!guest || !linkedUser) {
      setError("No encontré el invitado o el contacto seleccionado.");
      return;
    }
    const now = new Date().toISOString();
    setMemberIds((items) => [...new Set(items.map((id) => (id === linkingGuestId ? linkTargetId : id)))]);
    setAdminIds((items) => [...new Set(items.map((id) => (id === linkingGuestId ? linkTargetId : id)))]);
    setMemberColors((items) => {
      const { [linkingGuestId]: guestColor, ...rest } = items;
      return guestColor && !rest[linkTargetId] ? { ...rest, [linkTargetId]: guestColor } : rest;
    });
    replaceMonimons(monimons.map((item) => (
      item.id === monimon.id
        ? {
            ...item,
            members: [...new Set((item.members || []).map((id) => (id === linkingGuestId ? linkTargetId : id)))],
            memberColors: cleanMemberColors({
              ...(item.memberColors || {}),
              ...(item.memberColors?.[linkingGuestId] && !item.memberColors?.[linkTargetId] ? { [linkTargetId]: item.memberColors[linkingGuestId] } : {})
            }, [...new Set((item.members || []).map((id) => (id === linkingGuestId ? linkTargetId : id)))])
          }
        : item
    )));
    setMonimonMembers?.((items) => {
      const linkedMemberships = items
        .filter((item) => !(item.monimonId === monimon.id && item.memberId === linkTargetId))
        .map((item) => (
          item.monimonId === monimon.id && item.memberId === linkingGuestId
            ? { ...item, memberId: linkTargetId, status: "active", source: "linked", linkedFromMemberId: linkingGuestId, linkedByMemberId: activeUser.id, linkedAt: now }
            : item
        ));
      const hasLinkedMembership = linkedMemberships.some((item) => item.monimonId === monimon.id && item.memberId === linkTargetId);
      return hasLinkedMembership
        ? linkedMemberships
        : [
            ...linkedMemberships,
            {
              monimonId: monimon.id,
              memberId: linkTargetId,
              status: "active",
              source: "linked",
              linkedFromMemberId: linkingGuestId,
              linkedByMemberId: activeUser.id,
              createdAt: now,
              linkedAt: now
            }
          ];
    });
    setMembers((items) => items.map((member) => (
      member.id === linkingGuestId
        ? { ...member, status: "linked", linkedProfileId: linkTargetId, linkedAt: now }
        : member
    )));
    setDebts?.((items) => replaceMemberIdInRecords(items, linkingGuestId, linkTargetId));
    setPayments?.((items) => replaceMemberIdInRecords(items, linkingGuestId, linkTargetId));
    setPaymentRequests?.((items) => replaceMemberIdInRecords(items, linkingGuestId, linkTargetId));
    onActivity?.({
      monimonId: monimon.id,
      memberId: activeUser.id,
      activity: "Vinculación de integrante",
      destination: `${shortDisplayName(guest.name)} -> ${shortDisplayName(linkedUser.name)}`,
      destinationMemberId: linkTargetId
    });
    setLinkingGuestId(null);
    setLinkTargetId("");
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
      if (!canLinkGuests) {
        setError("Solo un administrador puede modificar el grupo.");
        return;
      }
      const cleanAdminIds = adminIds.filter((id) => cleanMembers.includes(id));
      const cleanColors = cleanMemberColors(memberColors, cleanMembers);
      replaceMonimons(monimons.map((item) => (item.id === monimon.id ? { ...item, name: cleanName, members: cleanMembers, memberColors: cleanColors, icon: groupIcon, adminIds: cleanAdminIds.length ? cleanAdminIds : [cleanMembers[0]] } : item)));
      if (cleanName !== monimon.name) {
        onActivity?.({
          monimonId: monimon.id,
          memberId: activeUser.id,
          activity: "Modificación de nombre de grupo",
          destination: cleanName
        });
      }
      const previousMembers = new Set(monimon.members || []);
      cleanMembers
        .filter((memberId) => !previousMembers.has(memberId))
        .forEach((memberId) => {
          const addedMember = appUsers.find((user) => user.id === memberId);
          onActivity?.({
            monimonId: monimon.id,
            memberId: activeUser.id,
            activity: addedMember?.profileId ? "Invitación de integrante" : "Agregado de integrante",
            destination: memberNameForActivity(memberId),
            destinationMemberId: memberId
          });
        });
      (monimon.members || [])
        .filter((memberId) => !cleanMembers.includes(memberId))
        .forEach((memberId) => onActivity?.({
          monimonId: monimon.id,
          memberId: activeUser.id,
          activity: "Eliminación de integrante",
          destination: memberNameForActivity(memberId),
          destinationMemberId: memberId
        }));
      setSelectedMonimonId(monimon.id);
      onClose();
      return;
    }
    const id = `monimon-${Date.now()}`;
    const cleanAdminIds = adminIds.filter((adminId) => cleanMembers.includes(adminId));
    const cleanColors = cleanMemberColors(memberColors, cleanMembers);
    const usedInviteCodes = new Set(monimons.map((item) => inviteCodeForMonimon(item)));
    const inviteCode = createInviteCode(usedInviteCodes);
    replaceMonimons([...monimons, { id, name: cleanName, inviteCode, members: cleanMembers, memberColors: cleanColors, icon: groupIcon, adminIds: cleanAdminIds.length ? cleanAdminIds : [activeUser.id], createdByMemberId: activeUser.id, createdAt: new Date().toISOString() }]);
    onActivity?.({
      monimonId: id,
      memberId: activeUser.id,
      activity: "Creación del grupo",
      destination: cleanName
    });
    cleanMembers
      .filter((memberId) => memberId !== activeUser.id)
      .forEach((memberId) => {
        const addedMember = appUsers.find((user) => user.id === memberId);
        onActivity?.({
          monimonId: id,
          memberId: activeUser.id,
          activity: addedMember?.profileId ? "Invitación de integrante" : "Agregado de integrante",
          destination: memberNameForActivity(memberId),
          destinationMemberId: memberId
        });
      });
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
            <div className="member-chip-row member-chip-header">
              <span className="member-chip-header-integrantes">Integrantes</span>
              <span className="member-admin-column-head">
                <ShieldCheck size={16} />
                <span>Admin</span>
              </span>
              <span className="member-link-column-head">
                <BookUser size={16} />
                <span>Vincular</span>
              </span>
              <span aria-hidden="true" />
            </div>
            {memberIds.map((memberId, index) => {
              const member = appUsers.find((user) => user.id === memberId);
              const memberName = shortDisplayName(member?.name || (memberId === activeUser.id ? activeUser.name : "INTEGRANTE"));
              const isOwnUser = memberId === activeUser.id;
              const isEditableGuest = isEditing && !isOwnUser && !member?.profileId;
              const membership = membershipByMemberId.get(memberId);
              const isPendingMember = membership?.status === "pending";
              const isAdmin = adminIds.includes(memberId);
              const isLastAdmin = isAdmin && adminIds.length === 1;
              return (
                <div className={`member-chip-row ${editingGuestId === memberId || linkingGuestId === memberId ? "editing" : ""}`} key={`${memberId}-${index}`}>
                  <label
                    className="member-color-picker"
                    style={{ "--member-picker-fondo": colorForMember(memberId) || "var(--nav-fondo)" }}
                    title={`Color de ${memberName}`}
                  >
                    <Palette size={17} aria-hidden="true" />
                    <input
                      type="color"
                      value={colorForMember(memberId) || "#0d1020"}
                      onChange={(event) => updateMemberColor(memberId, event.target.value)}
                      aria-label={`Color de ${memberName}`}
                    />
                  </label>
                  <span className="member-chip-name-cell">
                    <PersonChip className="member-chip" color={colorForMember(memberId)}>
                      {editingGuestId === memberId ? (
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
                      ) : (
                        memberName
                      )}
                      {isPendingMember && <small className="member-pending-badge">Pendiente</small>}
                    </PersonChip>
                  </span>
                  <label className="member-admin-checkbox" title="Administrador">
                    <input
                      type="checkbox"
                      checked={isAdmin}
                      disabled={isLastAdmin}
                      onChange={() => toggleAdmin(memberId)}
                      aria-label={`Administrador: ${memberName}`}
                    />
                  </label>
                  <div className="member-link-cell">
                    {isEditableGuest && canLinkGuests ? (
                      <select
                        className="member-link-select"
                        value={linkingGuestId === memberId ? linkTargetId : ""}
                        onFocus={() => {
                          if (linkingGuestId !== memberId) startLinkingGuest(memberId);
                        }}
                        onChange={(event) => {
                          if (linkingGuestId !== memberId) setLinkingGuestId(memberId);
                          setLinkTargetId(event.target.value);
                        }}
                        disabled={!availableLinkUsers.length}
                      >
                        <option value="">Invitado</option>
                        {availableLinkUsers.map((user) => (
                          <option key={user.id} value={user.id}>{shortDisplayName(user.name)}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="member-link-status">-</span>
                    )}
                  </div>
                  <div className="member-chip-actions">
                    {editingGuestId === memberId && (
                      <button type="button" onClick={saveGuestName} aria-label="Guardar nombre de invitado">
                        <Check size={15} />
                      </button>
                    )}
                    {linkingGuestId === memberId && (
                      <button type="button" onClick={linkGuestToContact} aria-label="Vincular invitado">
                        <Check size={15} />
                      </button>
                    )}
                    {linkingGuestId === memberId && (
                      <button type="button" onClick={() => { setLinkingGuestId(null); setLinkTargetId(""); }} aria-label="Cancelar vinculación">
                        <X size={15} />
                      </button>
                    )}
                    {isEditableGuest && editingGuestId !== memberId && linkingGuestId !== memberId && (
                      <button type="button" onClick={() => startEditingGuest(memberId)} aria-label="Editar nombre de invitado">
                        <Pencil size={14} />
                      </button>
                    )}
                    {memberIds.length > 1 && !isOwnUser && editingGuestId !== memberId && linkingGuestId !== memberId && (
                      <button type="button" onClick={() => removeMember(index)} aria-label="Eliminar integrante">
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="member-add-grid manual-member-add">
            <label className="member-add-label">Añadir nuevo integrante</label>
            <input value={ghostName} maxLength={40} onChange={(event) => setGhostName(event.target.value)} placeholder="Nombre de integrante" />
            <button type="button" className="member-add square" onClick={addGhostMember} aria-label="Agregar no registrado">
              <Plus size={22} />
            </button>
          </div>
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
        <div className="monimon-modal-actions">
          <button type="button" className="secondary-action cancel-monimon" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="primary-action modal-create-btn" onClick={saveMonimon}>
            {isEditing ? "ACTUALIZAR CAMBIOS" : "CREAR"}
          </button>
        </div>
        {isEditing && (
          <section className="danger-zone-section">
            <button
              type="button"
              className="danger-zone-toggle"
              onClick={() => setDangerOpen((open) => !open)}
              aria-expanded={dangerOpen}
            >
              <span>Danger Zone</span>
              {dangerOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {dangerOpen && (
              <div className="delete-monimon-zone">
                <button
                  type="button"
                  className="delete-monimon-btn"
                  onClick={async () => {
                    const deleted = await onDeleteMonimon?.(monimon);
                    if (deleted) onClose();
                  }}
                >
                  <Trash2 size={16} /> Eliminar grupo
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function DebtPanel({ activeUser, appUsers, memberColors = {}, getDebtMembers, listDebts, incomingDebts, outgoingDebts, incomingTotal, outgoingTotal, selectedDebtIds, setSelectedDebtIds, preview, title, action, onNewDebt, onEditDebt, onDeleteDebt, onRepeatDebt }) {
  const hasOutgoingDebts = preview ? outgoingDebts.slice(0, 2).length > 0 : outgoingDebts.length > 0;
  const groupedDebts = Array.isArray(listDebts) ? listDebts : uniqueDebtsById(incomingDebts, outgoingDebts);
  return (
    <section className="glass-card panel">
      <PanelTitle icon={<ListChecks size={18} />} title={title || "Gastos"} action={preview ? null : action || "Nuevo gasto"} onAction={onNewDebt} />
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
            memberColors={memberColors}
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
              memberColors={memberColors}
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
          memberColors={memberColors}
          emptyText={title === "Gastos" ? "Todavía no hay gastos." : "Todavía no hay préstamos."}
        />
      )}
    </section>
  );
}

function DebtGroupedList({ debts, selectedDebtIds, setSelectedDebtIds, appUsers, memberColors = {}, getDebtMembers, onEditDebt, onDeleteDebt, onRepeatDebt, emptyText = "Todavía no hay registros." }) {
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
                  memberColors={memberColors}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <EmptyState text={emptyText} />
      )}
    </div>
  );
}

function PaymentPanel({
  appTheme,
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
  const monimonMemberKey = selectedMonimon?.members.join("|") || "group";
  const groupAdminIds = selectedMonimon?.adminIds?.length ? selectedMonimon.adminIds : selectedMonimon?.members?.slice(0, 1) || [];
  const canManageGroupPayments = groupAdminIds.includes(activeUser.id);
  const allowGroupTarget = monimonMemberOptions.length > 2;
  const [fromId, setFromId] = useState(activeUser.id);
  const [toId, setToId] = useState(groupTargetId(activeUser, monimonMemberOptions));
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
    const nextTo = allowGroupTarget ? "group" : monimonMemberOptions.find((user) => user.id !== nextFrom)?.id || monimonMemberOptions[0]?.id;
    setFromId(nextFrom);
    setToId(nextTo);
  }, [activeUser.id, selectedMonimonId, monimonMemberKey, allowGroupTarget]);

  function cancelPayment() {
    const nextFrom = monimonMemberOptions.some((user) => user.id === activeUser.id) ? activeUser.id : monimonMemberOptions[0]?.id;
    const nextTo = allowGroupTarget ? "group" : monimonMemberOptions.find((user) => user.id !== nextFrom)?.id || monimonMemberOptions[0]?.id;
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
    if (fromId === toId) {
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
      fromId,
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
        memberColors={selectedMonimon?.memberColors || {}}
        expandedIds={expandedSettlementIds}
        setExpandedIds={setExpandedSettlementIds}
        canManagePayments={canManageGroupPayments}
        onInformPayment={(detail, row) => {
          setPaymentTargetDetail(detail || null);
          setFromId(row?.member?.id || activeUser.id);
          setToId(detail?.otherMemberId || toId);
          setPaymentCurrency(currentSettlementCurrency);
          setPaymentMode("total");
          setManualAmount("");
          setShowNewPayment(true);
        }}
      />
      {showNewPayment && createPortal((
        <div className="modal-layer payment-modal-layer" data-theme={appTheme} role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
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
              <strong>{userLabel(fromId, activePaymentTargetMembers)}</strong>
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
      {payments.length > 0 && (
        <PaymentRows
          payments={payments}
          appUsers={monimonMemberOptions}
          activeUserId={activeUser.id}
          monimons={selectedMonimon ? [selectedMonimon] : []}
          onEditPayment={onEditPayment}
          onDeletePayment={onDeletePayment}
          showActions
          showGroupColumn={false}
        />
      )}
    </section>
  );
}

function SettlementPaySummary({ debts, members, memberColors = {}, currency, onLiquidate, actionLabel = "REGISTRAR PAGO", showClear = true }) {
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
            TENÉS UNA DEUDA PENDIENTE CON <PersonChip color={memberColors[firstCreditor?.id]}>{creditorName}</PersonChip>
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
                  {money(detail.amount, currency)} a <PersonChip color={memberColors[detail.otherMemberId]}>{creditor?.name || "INTEGRANTE"}</PersonChip>
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

function SettlementRows({ rows, members, activeUserId, currency, memberColors = {}, expandedIds, setExpandedIds, canManagePayments = false, onInformPayment }) {
  const hasPendingSettlement = rows.some((row) => row.details.length > 0 || Math.abs(row.balance) > 0.009);
  const rowsToShow = hasPendingSettlement
    ? rows.filter((row) => row.member.id === activeUserId || row.details.length > 0 || Math.abs(row.balance) > 0.009)
    : rows;
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
        const rowTitle = row.member.name;
        return (
          <article key={rowKey} className={`settlement-card ${isExpanded ? "expanded" : ""}`} onClick={() => setExpandedIds((items) => toggle(items, rowKey))}>
            <button
              type="button"
              className="settlement-main"
              onClick={(event) => {
                event.stopPropagation();
                setExpandedIds((items) => toggle(items, rowKey));
              }}
              aria-expanded={isExpanded}
            >
              <PersonChip className="settlement-member" color={memberColors[row.member.id]}>{rowTitle}</PersonChip>
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
                  const canInformPayment = detail.type === "debt" && (row.member.id === activeUserId || canManagePayments);
                  return (
                    <div key={detail.id} className={`settlement-detail-line ${detail.type}`}>
                      <b>{detail.type === "recover" ? "Recupera" : "Debe"}</b>
                      <strong>{money(detail.amount, currency)}</strong>
                      <span className="settlement-other-party">
                        <span className="settlement-relation">{detail.type === "recover" ? "de" : "a"}</span>
                        <PersonChip className="settlement-other-name" color={memberColors[detail.otherMemberId]}>{otherMember?.name || "INTEGRANTE"}</PersonChip>
                      </span>
                      {canInformPayment && (
                        <button type="button" className="settlement-inform-pay-btn" onClick={(event) => { event.stopPropagation(); onInformPayment(detail, row); }}>
                          REGISTRAR PAGO
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

function PaymentDebtCards({ debts, selectedDebtIds, setSelectedDebtIds, members, memberColors = {} }) {
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
                  <span>Pagado por <PersonChip color={memberColors[debt.fromMemberId]}>{counterparty.fromName}</PersonChip></span>
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
  const defaultPayer = monimonMemberOptions.find((user) => user.id === activeUser.id) || monimonMemberOptions[0] || activeUser;
  const otherUser = monimonMemberOptions.find((user) => user.id !== defaultPayer.id);
  const isExpense = kind === "expense";
  const allowGroupTarget = kind === "expense" && monimonMemberOptions.length > 2;
  const splitParticipants = monimonMemberOptions;
  const [fromId, setFromId] = useState(defaultPayer.id);
  const [toId, setToId] = useState(kind === "loan" ? otherUser?.id : groupTargetId(activeUser, monimonMemberOptions));
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

  function resetDebtForm() {
    setFromId(defaultPayer.id);
    setToId(kind === "loan" ? otherUser?.id : groupTargetId(activeUser, monimonMemberOptions));
    setTitle("");
    setCategory(kind === "loan" ? "loan" : "general");
    setCategoryMenuOpen(false);
    setAmountInput("");
    setSplitMode("equal");
    setSelectedSplitMemberIds(splitParticipants.map((member) => member.id));
    setSplitAmountInputs({});
    setSplitPercentages({});
    setCurrency("ARS");
    setDate(todayISO());
    setCalendarOpen(false);
    setCalendarMonth(todayISO().slice(0, 7));
    setReceiptFileName("");
    setError("");
  }

  function cancelDebtForm() {
    resetDebtForm();
    onClose();
  }

  function saveDebt() {
    const totalAmount = parseAmountInput(amountInput);
    const selectedSplitParticipants = splitParticipants.filter((member) => selectedSplitMemberIds.includes(member.id));
    if (isExpense && !selectedSplitParticipants.length) {
      setError("Seleccioná al menos un integrante para dividir el gasto.");
      return;
    }
    if (!isExpense && fromId === toId) {
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
      fromId,
      toId: isExpense ? "group" : toId,
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
            <label>
              <span>Pagado por</span>
              <select value={fromId} onChange={(event) => setFromId(event.target.value)}>
                {monimonMemberOptions.map((user) => <option key={user.id} value={user.id}>{shortDisplayName(user.name)}</option>)}
              </select>
            </label>
            {!isExpense ? (
              <label>
                <span>Para</span>
                <select value={toId} onChange={(event) => setToId(event.target.value)}>
                  {allowGroupTarget && <option value="group">GRUPO</option>}
                  {monimonMemberOptions.map((user) => <option key={user.id} value={user.id}>{shortDisplayName(user.name)}</option>)}
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
          <div className="modal-actions">
            <button type="button" onClick={cancelDebtForm} className="secondary-action cancel-debt">
              Cancelar
            </button>
            <button type="button" onClick={saveDebt} className="primary-action save-payment save-debt">
              {kind === "loan" ? "Guardar préstamo" : "Guardar gasto"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryReasonInput({ category, setCategory, menuOpen, setMenuOpen, value, onChange, placeholder }) {
  const selectedCategory = categoryFor(category);
  const triggerRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState({});

  useEffect(() => {
    if (!menuOpen) return undefined;
    const positionMenu = () => {
      const trigger = triggerRef.current;
      const anchor = trigger?.closest(".category-reason-row") || trigger;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = Math.min(760, window.innerWidth - 48);
      const maxHeight = Math.min(720, window.innerHeight - 132);
      const left = Math.min(Math.max(24, rect.left), window.innerWidth - width - 24);
      const top = Math.min(rect.bottom + 8, window.innerHeight - maxHeight - 24);
      setMenuStyle({ width: `${width}px`, maxHeight: `${maxHeight}px`, left: `${left}px`, top: `${top}px` });
    };
    positionMenu();
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    return () => {
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
    };
  }, [menuOpen]);

  return (
    <div className="category-reason-row">
      <div className="category-dropdown">
        <button
          ref={triggerRef}
          type="button"
          className="category-trigger"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={`Categoría: ${selectedCategory.label}`}
          aria-expanded={menuOpen}
        >
          {selectedCategory.emoji}
        </button>
        {menuOpen && createPortal(
          <div className="category-menu" style={menuStyle}>
            <span className="category-menu-title">Categorías</span>
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
          </div>,
          document.body
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
  const isLoan = debt.kind === "loan";
  const isExpense = !isLoan;
  const allowGroupTarget = !isLoan && monimonMemberOptions.length > 2;
  const defaultPayer = monimonMemberOptions.find((user) => user.id === debt.fromMemberId) || monimonMemberOptions.find((user) => user.id === activeUser.id) || monimonMemberOptions[0] || activeUser;
  const otherUser = monimonMemberOptions.find((user) => user.id !== defaultPayer.id);
  const splitParticipants = monimonMemberOptions;
  const [fromId, setFromId] = useState(debt.fromMemberId || defaultPayer.id);
  const [toId, setToId] = useState(debt.toMemberId === "group" && !allowGroupTarget ? otherUser?.id : debt.toMemberId || groupTargetId(activeUser, monimonMemberOptions));
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
    if (!isExpense && fromId === toId) {
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
            <label>
              <span>Pagado por</span>
              <select value={fromId} onChange={(event) => setFromId(event.target.value)}>
                {monimonMemberOptions.map((user) => <option key={user.id} value={user.id}>{shortDisplayName(user.name)}</option>)}
              </select>
            </label>
            {!isExpense ? (
              <label>
                <span>Para</span>
                <select value={toId} onChange={(event) => setToId(event.target.value)}>
                  {allowGroupTarget && <option value="group">GRUPO</option>}
                  {monimonMemberOptions.map((user) => <option key={user.id} value={user.id}>{shortDisplayName(user.name)}</option>)}
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

function PaymentsPanel({ payments, debts = [], activityLog = [], appUsers = [], getDebtMembers, activeUserId, monimons = [], compact, onEditPayment, onDeletePayment }) {
  const [historyTab, setHistoryTab] = useState("movimientos");
  return (
    <section className={`glass-card panel ${compact ? "compact-panel" : ""}`}>
      <PanelTitle icon={<History size={18} />} title="Historial" />
      <div className="history-tabs" role="tablist" aria-label="Tipo de historial">
        <button type="button" className={historyTab === "movimientos" ? "active" : ""} onClick={() => setHistoryTab("movimientos")}>Movimientos</button>
        <button type="button" className={historyTab === "actividad" ? "active" : ""} onClick={() => setHistoryTab("actividad")}>Actividad</button>
      </div>
      <PaymentRows payments={payments} debts={debts} activityLog={activityLog} appUsers={appUsers} getDebtMembers={getDebtMembers} activeUserId={activeUserId} monimons={monimons} mode={historyTab} />
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
        <b>{shortDisplayName(member.name)}</b>
        <small>{caption}</small>
      </span>
      <button type="button" className={actionClassName} onClick={onAction}>{actionLabel}</button>
    </div>
  );
}

function activityLabelFor(activity, memberName, destinationName, groupName, targetName) {
  const name = memberName || "INTEGRANTE";
  const normalized = String(activity || "").toLowerCase();
  const destinationIsGroup = destinationName && groupName && normalizedSearch(destinationName) === normalizedSearch(groupName);
  const memberTargetName = destinationName && !destinationIsGroup ? destinationName : name;
  const groupTargetName = destinationName && destinationName !== "GRUPO" ? destinationName : groupName || name;
  const debtTargetName = targetName || name;
  const changedFieldText = String(activity || "").split(":").slice(1).join(":").trim();
  if (normalized.includes("solicitud de amistad enviada")) return `Envió solicitud de amistad a ${destinationName || name}`;
  if (normalized.includes("aceptación de solicitud de amistad")) return `Aceptó solicitud de amistad de ${destinationName || name}`;
  if (normalized.includes("agregó contacto") || normalized.includes("agrego contacto")) return `Envió solicitud de amistad a ${destinationName || name}`;
  if (normalized.includes("eliminación de registro de pago")) return `Eliminó registro de pago de ${name}`;
  if (normalized.includes("modificación de pago")) return `Modificó pago de ${name}`;
  if (normalized.includes("registro de pago")) return `Registró pago de ${name}`;
  if (normalized.includes("eliminación de gasto")) return `Eliminó gasto de ${name}`;
  if (normalized.includes("modificación de gasto")) return `Modificó ${changedFieldText || "DATOS"} en gasto de ${debtTargetName}`;
  if (normalized.includes("registro de gasto")) return `Añadió gasto de ${name}`;
  if (normalized.includes("eliminación de préstamo")) return `Eliminó préstamo de ${name}`;
  if (normalized.includes("modificación de préstamo")) return `Modificó ${changedFieldText || "DATOS"} en préstamo de ${debtTargetName}`;
  if (normalized.includes("registro de préstamo")) return `Añadió préstamo de ${name}`;
  if (normalized.includes("invitación de integrante") || normalized.includes("invitacion de integrante")) return `Invitó a ${memberTargetName}`;
  if (normalized.includes("aceptación de invitación al grupo") || normalized.includes("aceptacion de invitacion al grupo")) return `Aceptó invitación a ${groupName || "grupo"}`;
  if (normalized.includes("vinculación de integrante") || normalized.includes("vinculacion de integrante")) return `Vinculó ${destinationName || name}`;
  if (normalized.includes("agregado de integrante")) return `Añadió a ${memberTargetName}`;
  if (normalized.includes("eliminación de integrante")) return `Eliminó a ${memberTargetName}`;
  if (normalized.includes("modificación de nombre de grupo")) return `Modificó nombre de grupo a ${groupTargetName}`;
  if (normalized.includes("creación del grupo")) return `Creó grupo ${groupTargetName}`;
  if (normalized.includes("eliminación del grupo")) return `Eliminó grupo ${groupTargetName}`;
  return `${activity || "Actividad"} de ${name}`;
}

function PaymentRows({ payments, debts = [], activityLog = [], appUsers = [], getDebtMembers, activeUserId, monimons = [], mode = "movimientos", onEditPayment, onDeletePayment, showActions = false, showGroupColumn = true }) {
  const groupNameFor = (monimonId) => {
    return monimons.find((monimon) => monimon.id === monimonId)?.name || "GRUPO";
  };
  const groupFor = (monimonId) => monimons.find((monimon) => monimon.id === monimonId);
  const colorFor = (monimonId, memberId) => {
    const group = groupFor(monimonId);
    return memberFrameColor(group, memberId);
  };
  const isActivityOnly = (activity) => {
    const normalized = String(activity || "").toLowerCase();
    return (
      normalized.includes("solicitud de amistad")
      || normalized.includes("contacto")
      || normalized.includes("integrante")
      || normalized.includes("grupo")
    );
  };
  const paymentMovements = payments
    .map((payment) => ({
      id: `payment-${payment.id}`,
      kind: "payment",
      source: payment,
      date: debtDateKey(payment),
      monimonId: payment.monimonId,
      memberId: payment.registeredByMemberId || activeUserId || payment.fromMemberId,
      member: userLabel(payment.registeredByMemberId || activeUserId || payment.fromMemberId, appUsers),
      memberColor: colorFor(payment.monimonId, payment.registeredByMemberId || activeUserId || payment.fromMemberId),
      movement: `Registró pago de ${userLabel(payment.fromMemberId, appUsers)}`,
      movementPeople: [{ memberId: payment.fromMemberId, name: userLabel(payment.fromMemberId, appUsers), color: colorFor(payment.monimonId, payment.fromMemberId) }],
      amount: payment.amount,
      currency: payment.currency || "ARS",
      balanceDelta: payment.fromMemberId === activeUserId
        ? Number(payment.amount) || 0
        : payment.toMemberId === activeUserId
          ? -(Number(payment.amount) || 0)
          : 0,
      groupName: groupNameFor(payment.monimonId),
      destination: userLabel(payment.toMemberId, appUsers),
      destinationMemberId: payment.toMemberId,
      destinationColor: colorFor(payment.monimonId, payment.toMemberId)
    }));
  const debtMovements = debts.map((debt) => {
    const members = getDebtMembers?.(debt) || appUsers;
    const registeredByMemberId = debt.registeredByMemberId || activeUserId || debt.fromMemberId;
    return {
      id: `debt-${debt.id}`,
      kind: "debt",
      source: debt,
      date: debtDateKey(debt),
      monimonId: debt.monimonId,
      memberId: registeredByMemberId,
      member: userLabel(registeredByMemberId, appUsers),
      memberColor: colorFor(debt.monimonId, registeredByMemberId),
      movement: `${debt.kind === "loan" ? "Añadió préstamo" : "Añadió gasto"} de ${userLabel(debt.fromMemberId, members)}`,
      movementPeople: [{ memberId: debt.fromMemberId, name: userLabel(debt.fromMemberId, members), color: colorFor(debt.monimonId, debt.fromMemberId) }],
      amount: debt.amount,
      currency: debt.currency || "ARS",
      balanceDelta: expenseNetFor(debt, activeUserId, members),
      groupName: groupNameFor(debt.monimonId),
      destination: debt.toMemberId === "group" ? "GRUPO" : userLabel(debt.toMemberId, members),
      destinationMemberId: debt.toMemberId === "group" ? "" : debt.toMemberId,
      destinationColor: debt.toMemberId === "group" ? "" : colorFor(debt.monimonId, debt.toMemberId)
    };
  });
  const activityMovements = activityLog
    .filter((item) => !isActivityOnly(item.activity))
    .map((item) => {
      const destinationMemberId = item.destinationMemberId || (appUsers.some((user) => user.id === item.destination) ? item.destination : "");
      const destinationName = destinationMemberId ? userLabel(destinationMemberId, appUsers) : displayPersonName(item.destination, appUsers);
      const targetMemberId = item.targetMemberId || "";
      const targetName = targetMemberId ? userLabel(targetMemberId, appUsers) : "";
      const groupName = groupNameFor(item.monimonId);
      const memberName = userLabel(item.memberId, appUsers);
      return {
        id: `activity-${item.id}`,
        kind: "activity",
        source: item,
        date: debtDateKey(item),
        monimonId: item.monimonId,
        memberId: item.memberId,
        member: memberName,
        memberColor: colorFor(item.monimonId, item.memberId),
        movement: activityLabelFor(item.activity, memberName, destinationName, groupName, targetName),
        movementPeople: [
          { memberId: item.memberId, name: memberName, color: colorFor(item.monimonId, item.memberId) },
          targetMemberId ? { memberId: targetMemberId, name: targetName, color: colorFor(item.monimonId, targetMemberId) } : null,
          destinationMemberId ? { memberId: destinationMemberId, name: destinationName, color: colorFor(item.monimonId, destinationMemberId) } : null
        ].filter(Boolean),
        amount: Number(item.amount) || 0,
        currency: item.currency || "ARS",
        balanceDelta: Number(item.balanceDelta) || 0,
        groupName,
        destination: destinationName,
        destinationMemberId,
        destinationColor: destinationMemberId ? colorFor(item.monimonId, destinationMemberId) : ""
      };
    });
  const socialActivities = activityLog
    .filter((item) => isActivityOnly(item.activity))
    .map((item) => {
      const destinationMemberId = item.destinationMemberId || (appUsers.some((user) => user.id === item.destination) ? item.destination : "");
      const destinationName = destinationMemberId ? userLabel(destinationMemberId, appUsers) : displayPersonName(item.destination, appUsers);
      const groupName = groupNameFor(item.monimonId);
      const memberName = userLabel(item.memberId, appUsers);
      return {
        id: `activity-${item.id}`,
        kind: "activity",
        source: item,
        date: debtDateKey(item),
        monimonId: item.monimonId,
        memberId: item.memberId,
        member: memberName,
        memberColor: colorFor(item.monimonId, item.memberId),
        movement: activityLabelFor(item.activity, memberName, destinationName, groupName),
        movementPeople: [
          { memberId: item.memberId, name: memberName, color: colorFor(item.monimonId, item.memberId) },
          destinationMemberId ? { memberId: destinationMemberId, name: destinationName, color: colorFor(item.monimonId, destinationMemberId) } : null
        ].filter(Boolean),
        destination: destinationName,
        destinationMemberId,
        destinationColor: destinationMemberId ? colorFor(item.monimonId, destinationMemberId) : ""
      };
    });
  const movementTimestamp = (movement) => {
    const createdAt = movement.source?.createdAt || movement.source?.verifiedAt || "";
    return createdAt || debtDateKey(movement);
  };
  const movementSortValue = (movement) => String(movementTimestamp(movement));
  const movementRows = [...paymentMovements, ...debtMovements, ...activityMovements];
  const orderedMovementsForBalance = movementRows
    .map((movement, order) => ({ ...movement, order }))
    .sort((a, b) => {
      const dateCompare = movementSortValue(a).localeCompare(movementSortValue(b));
      return dateCompare || b.order - a.order;
    });
  const balanceAfterByMovementId = orderedMovementsForBalance.reduce((result, movement) => {
    const currency = movement.currency === "USD" ? "USD" : "ARS";
    const previous = result.running[currency] || 0;
    const next = previous + (Number(movement.balanceDelta) || 0);
    return {
      running: { ...result.running, [currency]: next },
      byId: { ...result.byId, [movement.id]: next }
    };
  }, { running: emptyCurrencyBalances(), byId: {} }).byId;
  const orderedMovements = movementRows
    .map((movement, order) => ({ ...movement, order, balanceAfter: balanceAfterByMovementId[movement.id] }))
    .sort((a, b) => {
      const dateCompare = movementSortValue(b).localeCompare(movementSortValue(a));
      return dateCompare || a.order - b.order;
    });
  const orderedActivities = socialActivities.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const columnCount = 5 + (showGroupColumn ? 1 : 0) + (showActions ? 1 : 0);
  const activityColumnCount = 3;
  function renderMovementLabel(movement) {
    const people = (movement.movementPeople || [])
      .filter((person) => person?.name && normalizedSearch(person.name) !== normalizedSearch("GRUPO"))
      .reduce((items, person) => {
        const label = shortDisplayName(person.name);
        if (!label || items.some((item) => normalizedSearch(item.label) === normalizedSearch(label))) return items;
        return [...items, {
          memberId: person.memberId,
          label,
          color: person.color || colorFor(movement.monimonId, person.memberId)
        }];
      }, []);
    const escapedPeople = people.map((person) => person.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const pattern = [...escapedPeople, "solicitud de amistad", "gasto", "pago"].join("|");
    const tokenRegex = new RegExp(`(${pattern})`, "gi");

    return String(movement.movement).split(tokenRegex).map((part, index) => {
      const person = people.find((item) => normalizedSearch(item.label) === normalizedSearch(part));
      if (person) {
        return <PersonChip key={`${part}-${index}`} color={person.color}>{person.label}</PersonChip>;
      }
      return /^(solicitud de amistad|gasto|pago)$/i.test(part)
        ? <mark key={`${part}-${index}`}>{part}</mark>
        : <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
    });
  }
  if (mode === "actividad") {
    return (
      <div className="history-table-wrap">
        <table className="history-table activity-history-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Integrante</th>
              <th>Actividad</th>
            </tr>
          </thead>
          <tbody>
            {orderedActivities.length ? (
              orderedActivities.map((movement) => (
                <tr key={movement.id}>
                  <td>{displayDate(movement.date)}</td>
                  <td><PersonChip color={movement.memberColor}>{movement.member}</PersonChip></td>
                  <td>
                    <span className="history-movement-cell">
                      <b>{renderMovementLabel(movement)}</b>
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="history-empty-cell" colSpan={activityColumnCount}>
                  <EmptyState text="Todavía no hay actividad." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div className="history-table-wrap">
      <table className="history-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Integrante</th>
            <th>Movimiento</th>
            <th className="history-amount-cell">Importe</th>
            <th className="history-balance-cell">Saldo</th>
            {showGroupColumn && <th>Grupo</th>}
            {showActions && <th className="history-actions-cell" aria-label="Acciones" />}
          </tr>
        </thead>
        <tbody>
          {orderedMovements.length ? (
            orderedMovements.map((movement) => (
              <tr key={movement.id}>
                <td>{displayDate(movement.date)}</td>
                <td><PersonChip color={movement.memberColor}>{movement.member}</PersonChip></td>
                <td>
                  <span className="history-movement-cell">
                    <b>{renderMovementLabel(movement)}</b>
                  </span>
                </td>
                <td className="history-amount-cell">{movement.amount ? money(movement.amount, movement.currency) : "-"}</td>
                <td className="history-balance-cell">
                  {Number.isFinite(movement.balanceAfter) ? (
                    <strong className={movement.balanceAfter > 0 ? "positive" : movement.balanceAfter < 0 ? "negative" : "neutral"}>
                      {signedMoney(movement.balanceAfter, movement.currency)}
                    </strong>
                  ) : "-"}
                </td>
                {showGroupColumn && <td>{movement.groupName}</td>}
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
  const userName = appUsers.find((user) => user.id === userId)?.name;
  if (!userName && String(userId || "").toLowerCase().startsWith("ghost-")) return "INTEGRANTE INVITADO";
  return userName ? shortDisplayName(userName) : userId?.toUpperCase?.() || "Usuario";
}

function RequestsPanel({ contactRequests = [], appUsers, approveContactRequest, rejectContactRequest }) {
  const orderedContactRequests = [...contactRequests].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

  if (!orderedContactRequests.length) {
    return <EmptyState text="Todavía no hay solicitudes." />;
  }

  return (
    <div className="request-list">
      {orderedContactRequests.map((request) => {
        const requester = appUsers.find((user) => user.id === request.ownerProfileId);
        const requesterName = shortDisplayName(requester?.name || userLabel(request.ownerProfileId, appUsers));
        return (
          <article key={`contact-${request.id}`} className="request-card pending">
            <div className="request-main">
              <span className="history-icon"><BookUser size={17} /></span>
              <span className="request-copy min-w-0 flex-1">
                <b>SOLICITUD DE AMISTAD</b>
                <small><span className="request-person-token">[{requesterName}]</span> {displayHandle(requester?.username)} quiere agregarte a su agenda.</small>
                <small className="request-status-text">Estado: Pendiente</small>
              </span>
            </div>
            <div className="request-actions">
              <button type="button" className="request-reject" onClick={() => rejectContactRequest(request.ownerProfileId)}>
                <X size={15} /> Rechazar
              </button>
              <button type="button" className="request-approve" onClick={() => approveContactRequest(request.ownerProfileId)}>
                <Check size={15} /> Aceptar
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function DebtGroup({ title, tone, debts, selectable, selectedDebtIds, setSelectedDebtIds, appUsers, memberColors = {}, getDebtMembers, onEditDebt, onDeleteDebt, onRepeatDebt, amountForDebt, totalOverride }) {
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
                  memberColors={memberColors}
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

function DebtRow({ debt, selectable, checked, onToggle, members, memberColors = {}, onEditDebt, onDeleteDebt, onRepeatDebt }) {
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
          <strong><span>IMPORTE TOTAL</span> {money(debt.amount, debt.currency)}</strong>
        </span>
        <span className="debt-line">
          <small className="counterparty-line">Pagado por <PersonChip color={memberColors[debt.fromMemberId]}>{counterparty.fromName}</PersonChip></small>
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
                <PersonChip color={memberColors[item.id]}>{item.name}</PersonChip>
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

function Metric({ id, label, detailLabel = "Detalle", value, currency = "ARS", positive, negative, neutro, sign = "", help, openMetric, setOpenMetric }) {
  const isOpen = openMetric === id;
  const toggleMetric = () => setOpenMetric(isOpen ? null : id);
  const toneClass = [
    positive ? "positive" : "",
    negative ? "negative" : "",
    neutro ? "neutro" : "",
    isOpen ? "active" : ""
  ].filter(Boolean).join(" ");
  return (
    <div
      className={`metric ${toneClass}`}
      role="button"
      tabIndex={0}
      onClick={toggleMetric}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleMetric();
        }
      }}
      aria-expanded={isOpen}
    >
      <div className="metric-label-row">
        <p>{label}</p>
        {help && <span className="metric-help" title={help} aria-label={help}>?</span>}
      </div>
      <b>{sign}{money(value, currency)}</b>
      <button
        type="button"
        className="metric-detail-btn"
        onClick={(event) => {
          event.stopPropagation();
          toggleMetric();
        }}
        aria-expanded={isOpen}
      >
        {isOpen ? `- ${detailLabel}` : `+ ${detailLabel}`}
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
