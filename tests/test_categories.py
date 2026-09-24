import copy
import unittest
from unittest.mock import patch

import server
from scripts.repair_expense_categories import prepare
from test_groups import fixture


class CategoryTests(unittest.TestCase):
    def test_repair_changes_only_missing_categories(self):
        source = fixture()
        source['debts'][0]['category'] = 'health'
        current = copy.deepcopy(source)
        current['debts'][0]['category'] = 'general'
        result, repairs = prepare(source, current, 'g')
        self.assertEqual(len(repairs), 1)
        self.assertEqual(result, source)
        self.assertEqual(current['debts'][0]['category'], 'general')

    def test_keep_recent_explicit_category_and_other_groups(self):
        source, current = fixture(), fixture()
        source['debts'][0]['category'] = 'health'
        current['debts'][0]['category'] = 'cards'
        self.assertEqual(prepare(source, current, 'g'), (current, []))
        current['debts'][0]['category'] = 'general'
        self.assertEqual(prepare(source, current, 'another-group'), (current, []))

    def test_refuse_category_recovery_from_a_different_expense(self):
        source, current = fixture(), fixture()
        source['debts'][0]['category'] = 'health'
        current['debts'][0]['amount'] += 1
        with self.assertRaises(ValueError): prepare(source, current, 'g')

    def test_category_survives_save_and_reload_without_legacy_tables(self):
        row = fixture()
        def database(method, path, payload=None, headers=None):
            nonlocal row
            if method == 'GET': return [{'data': copy.deepcopy(row)}]
            if method == 'PATCH':
                row = copy.deepcopy(payload['data'])
                return [{'data': row}]
            raise AssertionError(method)
        with patch.object(server, 'supabase_request', side_effect=database), patch.object(server, 'get_normalized_state', side_effect=AssertionError('must not restore obsolete data')):
            state = server.get_state()
            state['debts'][0]['category'] = 'insurance'
            server.put_state(state, state['_revision'])
            self.assertEqual(server.get_state()['debts'][0]['category'], 'insurance')
