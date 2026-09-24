"""Exercise the actual HTTP handlers against an in-memory CAS database."""
import copy
import json
import threading
import unittest
import urllib.error
import urllib.request
from http.server import HTTPServer
from unittest.mock import patch

import server
from test_groups import fixture


class HttpTests(unittest.TestCase):
    def setUp(self):
        self.row = fixture()
        self.db = patch.object(server, 'supabase_request', side_effect=self.database)
        self.auth = patch.object(server, 'require_valid_token', side_effect=lambda token: {'id': token})
        self.db.start()
        self.auth.start()
        self.http = HTTPServer(('127.0.0.1', 0), server.Handler)
        self.thread = threading.Thread(target=self.http.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.http.shutdown()
        self.http.server_close()
        self.thread.join()
        self.auth.stop()
        self.db.stop()

    def database(self, method, path, payload=None, headers=None):
        if method == 'GET': return [{'data': copy.deepcopy(self.row)}]
        if method == 'PATCH':
            revision = self.row.get('_revision')
            if not path.endswith('is.null' if revision is None else f'eq.{revision}'): return []
            self.row = copy.deepcopy(payload['data'])
            return [{'data': self.row}]
        if method == 'POST': return []
        raise AssertionError(method)

    def request(self, method, path, actor='misha', payload=None):
        data = json.dumps(payload).encode() if payload is not None else None
        req = urllib.request.Request(f'http://127.0.0.1:{self.http.server_port}{path}', data=data, method=method,
            headers={'Authorization': f'Bearer {actor}', 'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req) as response: return response.status, json.load(response)
        except urllib.error.HTTPError as error:
            return error.code, json.load(error)

    def test_old_frontend_cannot_overwrite_repaired_state(self):
        status, _ = self.request('PUT', '/api/state', payload=fixture())
        self.assertEqual(status, 409)
        self.assertEqual(self.row, fixture())

    def test_link_requires_admin_and_survives_fresh_get(self):
        payload = {'revision': None, 'groupId': 'g', 'guestId': 'gor', 'targetId': 'lucas'}
        self.assertEqual(self.request('POST', '/api/groups/link-member', 'lucas', payload)[0], 403)
        status, saved = self.request('POST', '/api/groups/link-member', payload=payload)
        self.assertEqual(status, 200)
        status, loaded = self.request('GET', '/api/state', 'lucas')
        self.assertEqual(loaded['_revision'], saved['_revision'])
        self.assertEqual(loaded['monimons'][0]['members'], ['misha', 'lucas'])
        self.assertEqual(loaded['debts'][0]['splitPercentages'], {'misha': 100})

    def test_poll_and_stale_save_return_current_revision(self):
        _, state = self.request('GET', '/api/state')
        state['monimons'][0]['name'] = 'New group name'
        status, saved = self.request('PUT', '/api/state', payload={'protocol': 2, 'revision': None, 'state': state})
        self.assertEqual(status, 200)
        status, conflict = self.request('PUT', '/api/state', 'lucas', {'protocol': 2, 'revision': None, 'state': fixture()})
        self.assertEqual(status, 409)
        self.assertEqual(conflict['state']['_revision'], saved['_revision'])
        self.assertEqual(conflict['state']['monimons'][0]['name'], 'New group name')

    def test_non_admin_can_leave_through_api(self):
        status, result = self.request('POST', '/api/groups/leave', 'lucas', {'revision': None, 'groupId': 'g'})
        self.assertEqual(status, 200)
        self.assertNotIn('lucas', result['monimons'][0]['members'])
        self.assertEqual(result['contacts'], fixture()['contacts'])
