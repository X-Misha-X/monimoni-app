import copy
import unittest
from unittest.mock import patch

import server
from state_model import StateError, join_group, link_member, leave_group, validate_group_edits, assign_invite_codes
from scripts.repair_group_identity import prepare


def fixture():
    state = copy.deepcopy(server.EMPTY_STATE)
    state.update({
        'profiles': [{'id': 'misha', 'username': 'misha'}, {'id': 'lucas', 'username': 'lucas'}],
        'members': [{'id': 'misha', 'profileId': 'misha'}, {'id': 'gor', 'profileId': None}, {'id': 'lucas', 'profileId': 'lucas'}],
        'monimons': [{'id': 'g', 'name': 'GORBANK', 'inviteCode': 'ABC123', 'adminIds': ['misha']}],
        'monimonMembers': [{'monimonId': 'g', 'memberId': mid, 'status': 'active'} for mid in ('misha', 'gor', 'lucas')],
        'debts': [{'id': 'expense', 'monimonId': 'g', 'fromMemberId': 'gor', 'toMemberId': 'group', 'amount': 100,
                   'kind': 'expense', 'status': 'open', 'splitParticipantIds': ['misha'], 'splitMode': 'percent', 'splitPercentages': {'misha': 100}}],
        'contacts': [{'id': 'friend', 'ownerProfileId': 'misha', 'memberId': 'lucas', 'status': 'active'}]
    })
    return state


class GroupTests(unittest.TestCase):
    def test_merge_existing_member_retains_expense_and_friendship(self):
        state = fixture()
        link_member(state, 'misha', 'g', 'gor', 'lucas')
        self.assertEqual(state['debts'][0]['fromMemberId'], 'lucas')
        self.assertEqual(state['debts'][0]['splitParticipantIds'], ['misha'])
        self.assertEqual(state['debts'][0]['splitPercentages'], {'misha': 100})
        self.assertEqual([m['memberId'] for m in state['monimonMembers'] if m['status'] == 'active'], ['misha', 'lucas'])
        self.assertEqual(state['contacts'], fixture()['contacts'])

    def test_link_is_scoped_to_one_group(self):
        state = fixture()
        other = {**state['debts'][0], 'id': 'other', 'monimonId': 'other-group'}
        state['debts'].append(copy.deepcopy(other))
        link_member(state, 'misha', 'g', 'gor', 'lucas')
        self.assertEqual(state['debts'][1], other)
        self.assertIsNone(next(m for m in state['members'] if m['id'] == 'gor')['profileId'])

    def test_duplicate_shares_are_added_not_overwritten(self):
        state = fixture()
        state['debts'][0].update(splitMode='amount', splitParticipantIds=['gor', 'lucas'], splitAmounts={'gor': 30, 'lucas': 70})
        link_member(state, 'misha', 'g', 'gor', 'lucas')
        self.assertEqual(state['debts'][0]['splitAmounts'], {'lucas': 100})

    def test_self_transfer_is_void_after_link(self):
        state = fixture()
        state['payments'] = [{'id': 'payment', 'monimonId': 'g', 'fromMemberId': 'lucas', 'toMemberId': 'gor', 'amount': 10}]
        link_member(state, 'misha', 'g', 'gor', 'lucas')
        self.assertEqual(state['payments'][0]['status'], 'void')
        self.assertTrue(state['payments'][0]['identityMerged'])

    def test_claim_waits_for_admin_without_adding_duplicate(self):
        state = fixture()
        state['monimonMembers'] = state['monimonMembers'][:2]
        join_group(state, 'lucas', 'ABC123', 'gor')
        join_group(state, 'lucas', 'ABC123', 'gor')
        self.assertEqual(len(state['monimonMembers']), 2)
        self.assertEqual(len(state['identityRequests']), 1)
        link_member(state, 'misha', 'g', 'gor', 'lucas')
        self.assertEqual(state['identityRequests'][0]['status'], 'approved')

    def test_non_admin_cannot_merge_or_leave_group_without_admin(self):
        for operation in (lambda s: link_member(s, 'lucas', 'g', 'gor', 'lucas'), lambda s: leave_group(s, 'misha', 'g')):
            with self.assertRaises(StateError): operation(fixture())

    def test_member_can_leave_without_losing_history_or_contacts(self):
        state = fixture()
        original = copy.deepcopy(state['debts'])
        leave_group(state, 'lucas', 'g')
        self.assertEqual(next(m for m in state['monimonMembers'] if m['memberId'] == 'lucas')['status'], 'removed')
        self.assertEqual(state['debts'], original)
        self.assertEqual(state['contacts'], fixture()['contacts'])

    def test_guest_cannot_be_left_as_only_admin(self):
        state = fixture()
        state['monimons'][0]['adminIds'] = ['misha', 'gor']
        with self.assertRaises(StateError): leave_group(state, 'misha', 'g')

    def test_new_arrival_does_not_join_old_splits(self):
        state = fixture()
        state['monimonMembers'] = state['monimonMembers'][:2]
        state['debts'][0].update(splitParticipantIds=[], splitMode='equal')
        join_group(state, 'lucas', 'ABC123')
        self.assertEqual(state['debts'][0]['splitParticipantIds'], ['misha', 'gor'])

    def test_generic_save_cannot_bypass_admin_or_restore_merged_member(self):
        state = fixture()
        changed = copy.deepcopy(state)
        changed['monimonMembers'][1]['status'] = 'removed'
        with self.assertRaises(StateError): validate_group_edits(state, changed, 'lucas')
        link_member(state, 'misha', 'g', 'gor', 'lucas')
        changed = copy.deepcopy(state)
        changed['monimonMembers'][1]['status'] = 'active'
        with self.assertRaises(StateError): validate_group_edits(state, changed, 'misha')

    def test_stale_expense_editor_cannot_reintroduce_linked_guest(self):
        state = fixture()
        link_member(state, 'misha', 'g', 'gor', 'lucas')
        changed = copy.deepcopy(state)
        changed['debts'][0]['fromMemberId'] = 'gor'
        with self.assertRaises(StateError): validate_group_edits(state, changed, 'misha')

    def test_legacy_invite_codes_are_stable_and_unique(self):
        state = fixture()
        state['monimons'][0].pop('inviteCode')
        state['monimons'].append({'id': 'other', 'name': 'Other'})
        assign_invite_codes(state)
        codes = [g['inviteCode'] for g in state['monimons']]
        assign_invite_codes(state)
        self.assertEqual(codes, [g['inviteCode'] for g in state['monimons']])
        self.assertEqual(len(set(codes)), 2)
        join_group(state, 'lucas', codes[0])

    def test_repair_restores_original_split_and_preserves_other_data(self):
        source = fixture()
        target = copy.deepcopy(source)
        target['debts'][0].update(splitParticipantIds=[], splitMode='equal', splitPercentages={})
        repaired, ids = prepare(source, target, 'g', 'gor', 'lucas', 'misha')
        self.assertEqual(ids, ['expense'])
        self.assertEqual(repaired['debts'][0]['splitPercentages'], {'misha': 100})
        self.assertEqual(repaired['contacts'], target['contacts'])
        self.assertEqual(target['debts'][0]['splitParticipantIds'], [])

    def test_repair_refuses_changed_expense_instead_of_guessing_split(self):
        source, target = fixture(), fixture()
        target['debts'][0]['amount'] += 1
        with self.assertRaises(ValueError): prepare(source, target, 'g', 'gor', 'lucas', 'misha')


class PersistenceTests(unittest.TestCase):
    def setUp(self):
        self.row = fixture()

    def database(self, method, path, payload=None, headers=None):
        if method == 'GET': return [{'data': copy.deepcopy(self.row)}]
        if method == 'PATCH':
            revision = self.row.get('_revision')
            predicate = 'is.null' if revision is None else f'eq.{revision}'
            if not path.endswith(predicate): return []
            self.row = copy.deepcopy(payload['data'])
            return [{'data': self.row}]
        if method == 'POST': return []
        raise AssertionError(method)

    def test_save_link_reload_cannot_resurrect_guest(self):
        with patch.object(server, 'supabase_request', side_effect=self.database), patch.object(server, 'get_normalized_state', side_effect=AssertionError('must not read stale tables')):
            state = server.get_state()
            link_member(state, 'misha', 'g', 'gor', 'lucas')
            server.put_state(state, state['_revision'])
            restored = server.get_state()
            self.assertNotIn('gor', restored['monimons'][0]['members'])
            self.assertEqual(restored['debts'][0]['splitPercentages'], {'misha': 100})

    def test_stale_writer_rejected_and_first_write_preserved(self):
        with patch.object(server, 'supabase_request', side_effect=self.database):
            alice = server.get_state()
            bob = server.get_state()
            alice['monimons'][0]['name'] = 'Nombre nuevo'
            server.put_state(alice, alice['_revision'])
            with self.assertRaises(StateError) as error:
                server.put_state(bob, bob['_revision'])
            self.assertEqual(error.exception.status, 409)
            self.assertEqual(server.get_state()['monimons'][0]['name'], 'Nombre nuevo')

    def test_failure_is_not_reported_as_success(self):
        with patch.object(server, 'supabase_request', side_effect=RuntimeError('database unavailable')):
            with self.assertRaises(RuntimeError): server.put_state(fixture(), None)


if __name__ == '__main__': unittest.main()
