import test from "node:test";
import assert from "node:assert/strict";
import { emptyState, mergeStates, freezeExpenseParticipants } from "../src/shared-state.js";

test("two clients adding expenses preserve both changes", () => {
  const base = structuredClone(emptyState);
  const a = { ...base, debts: [{ id: 1, amount: 100 }] };
  const b = { ...base, debts: [{ id: 2, amount: 200 }] };
  assert.deepEqual(mergeStates(base, a, b).debts.map(d => d.id), [1, 2]);
});
test("stale client cannot restore a removed membership", () => {
  const base = { ...emptyState, monimonMembers: [{ monimonId: "g", memberId: "gor", status: "active" }] };
  const local = { ...base, debts: [{ id: "new", amount: 10 }] };
  const remote = { ...base, monimonMembers: [{ monimonId: "g", memberId: "gor", status: "removed" }] };
  assert.equal(mergeStates(base, local, remote).monimonMembers[0].status, "removed");
});
test("conflicting changes to a split require human resolution", () => {
  const base = { ...emptyState, debts: [{ id: "e", splitParticipantIds: ["misha"] }] };
  assert.throws(() => mergeStates(base, { ...base, debts: [{ id: "e", splitParticipantIds: ["lucas"] }] }, { ...base, debts: [{ id: "e", splitParticipantIds: ["gor"] }] }), /Otra persona/);
});
test("disjoint fields of the same record can merge", () => {
  const base = { ...emptyState, monimons: [{ id: "g", name: "old", icon: "home" }] };
  const result = mergeStates(base, { ...base, monimons: [{ id: "g", name: "new", icon: "home" }] }, { ...base, monimons: [{ id: "g", name: "old", icon: "trip" }] });
  assert.deepEqual(result.monimons[0], { id: "g", name: "new", icon: "trip" });
});
test("explicit MISHA-only splits stay unchanged when someone joins", () => {
  const debt = { id: "e", monimonId: "g", kind: "expense", splitParticipantIds: ["misha"] };
  assert.deepEqual(freezeExpenseParticipants([debt], "g", ["misha", "gor", "lucas"]), [debt]);
});
