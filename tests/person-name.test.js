import test from "node:test";
import assert from "node:assert/strict";
import { memberVisibleName, visibleName } from "../src/person-name.js";

test("the saved visible name overrides stale Google and member names", () => {
  const profile = { name: "Lu de casa", displayName: "LUCAS SOSA" };
  const member = { displayName: "LUCAS SOSA" };
  assert.equal(memberVisibleName(member, profile), "Lu de casa");
  assert.equal(visibleName(profile.name), memberVisibleName(member, profile));
  assert.equal(memberVisibleName(member, { ...profile, name: "Lucas" }), "Lucas");
});

test("opening and saving a compound visible name does not shorten it", () => {
  const saved = "María de los Ángeles";
  assert.equal(visibleName(visibleName(saved)), saved);
  assert.equal(visibleName("LUCAS SOSA"), "LUCAS SOSA");
});

test("guests and legacy profiles retain their full names", () => {
  assert.equal(memberVisibleName({ displayName: "GOR invitado" }, null), "GOR invitado");
  assert.equal(memberVisibleName({ displayName: "Old name" }, { displayName: "Nombre elegido" }), "Nombre elegido");
});
