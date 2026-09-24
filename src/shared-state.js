export const collections = ["profiles", "members", "monimons", "monimonMembers", "debts", "payments", "paymentRequests", "contacts", "activityLog", "archiveFiles", "identityRequests"];
export const emptyState = Object.fromEntries(collections.map(key => [key, []]));
export const equal = (a, b) => canonical(a) === canonical(b);
function canonical(value) {
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
const recordKey = (name, row) => name === "monimonMembers" ? `${row.monimonId}:${row.memberId}` : String(row.id);

// Only disjoint edits are merged automatically. Arrays inside a record (such as
// split participants) are one value: silently merging them could change a debt.
export function mergeStates(base, local, remote) {
  function merge(before, ours, theirs, path) {
    if (equal(ours, before)) return theirs;
    if (equal(theirs, before) || equal(ours, theirs)) return ours;
    if ([before, ours, theirs].every(x => x && typeof x === "object" && !Array.isArray(x))) {
      return Object.fromEntries([...new Set([...Object.keys(before), ...Object.keys(ours), ...Object.keys(theirs)])]
        .map(key => [key, merge(before[key], ours[key], theirs[key], `${path}.${key}`)])
        .filter(([, value]) => value !== undefined));
    }
    throw new Error(`Otra persona modificó el mismo dato (${path}). Conservamos tu edición para que puedas revisarla.`);
  }
  return Object.fromEntries(collections.map(name => {
    const maps = [base, local, remote].map(state => new Map((state[name] || []).map(row => [recordKey(name, row), row])));
    const keys = [...new Set([...maps[1].keys(), ...maps[2].keys(), ...maps[0].keys()])];
    return [name, keys.map(key => merge(maps[0].get(key), maps[1].get(key), maps[2].get(key), `${name}:${key}`)).filter(Boolean)];
  }));
}

// Preserve the participants of existing expenses before any membership change.
// New arrivals must not be charged for old expenses implicitly.
export function freezeExpenseParticipants(debts, groupId, memberIds) {
  return debts.map(debt => debt.monimonId === groupId && debt.kind !== "loan" && !debt.splitParticipantIds?.length
    ? { ...debt, splitParticipantIds: [...memberIds] } : debt);
}
