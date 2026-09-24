"""Local UI fixture. Never connects to Supabase; binds to loopback only.

Run from the repository root: python tests/preview_server.py
Two synthetic logins: misha@example.test / demo123, lucas@example.test / demo123.
"""
import base64
import copy
import json
import sys
import time
from pathlib import Path
from http.server import HTTPServer

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server
from test_groups import fixture

state = fixture()
for p in state['profiles']:
    p.update(name=p['id'].upper(), displayName=p['id'].upper(), email=p['id']+'@example.test', authProvider='email')
for m in state['members']:
    m['displayName'] = m['id'].upper()
    m['status'] = 'active' if m.get('profileId') else 'ghost'
# Deliberately divergent values catch a stale member/Google name overriding
# the current "Nombre visible" stored in the profile.
next(p for p in state['profiles'] if p['id'] == 'lucas').update(name='Lu de casa', displayName='LUCAS SOSA')
next(m for m in state['members'] if m['id'] == 'lucas')['displayName'] = 'LUCAS SOSA'
state['debts'][0].update(title='Gasto sólo de MISHA', currency='ARS', date='2026-09-24')
state['monimons'].append({'id': 'g2', 'name': 'VIAJE TEST', 'inviteCode': 'VIAJE2', 'adminIds': ['misha']})
state['monimonMembers'].extend({'monimonId': 'g2', 'memberId': mid, 'status': 'active'} for mid in ('misha','gor'))
state['contacts'] = [{'id':'friend','ownerProfileId':'misha','memberId':'lucas','status':'pending'}]


def database(method, path, payload=None, headers=None):
    global state
    if not path.startswith('group_state'):
        raise AssertionError('Unexpected database operation: '+path)
    if method == 'GET': return [{'data': copy.deepcopy(state)}]
    if method == 'PATCH':
        rev=state.get('_revision'); predicate='is.null' if rev is None else 'eq.'+rev
        if not path.endswith(predicate): return []
        state=copy.deepcopy(payload['data']); return [{'data': copy.deepcopy(state)}]
    if method == 'POST': return []
    raise AssertionError(method)


def user(identity):
    if identity not in ('misha','lucas'): raise server.StateError('Invalid fixture identity',401)
    return {'id':identity, 'email':identity+'@example.test', 'user_metadata':{'display_name':identity.upper(),'username':identity},'app_metadata':{'provider':'email'}}


def token(identity):
    value = {**user(identity), 'sub':identity, 'exp':int(time.time())+3600}
    encoded=base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
    return 'e30.'+encoded+'.fixture'


def validate(access):
    try:
        part=access.split('.')[1]
        return user(json.loads(base64.urlsafe_b64decode(part+'='*(-len(part)%4)))['sub'])
    except Exception: raise server.StateError('Invalid fixture session',401)


def auth(method, path, payload=None, access_token=None):
    if path.startswith('token?'):
        identity=payload.get('email','').split('@')[0] or payload.get('refresh_token')
        return {'access_token':token(identity),'refresh_token':identity,'user':user(identity),'expires_in':3600}
    if path == 'user': return validate(access_token)
    if path == 'logout': return {}
    raise server.StateError('Disabled in fixture',400)


server.supabase_request=database
server.auth_request=auth
server.require_valid_token=validate
server.ALLOWED_ORIGINS={'http://127.0.0.1:5175'}
if __name__=='__main__':
    print('Local synthetic preview API: http://127.0.0.1:8001', flush=True)
    HTTPServer(('127.0.0.1',8001),server.Handler).serve_forever()
