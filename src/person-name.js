// profiles.name is the value edited in "Nombre visible". A registered member's
// old displayName (often copied from Google) must never override that choice.
export function visibleName(value = "") {
  return String(value ?? "").trim();
}

export function memberVisibleName(member, profile) {
  return visibleName(profile?.name) || visibleName(profile?.displayName)
    || visibleName(member?.displayName) || visibleName(member?.name) || "USUARIO";
}
