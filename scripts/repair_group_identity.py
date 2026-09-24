"""Preview/recover split metadata from an intact snapshot, then merge an identity.

No write without --apply. Source and target snapshots are backed up locally
before any modification. Run only after the protocol-2 backend is deployed.
"""
import argparse
from copy import deepcopy
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from urllib.parse import quote

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server
from state_model import link_member


def prepare(source, target, group_id, guest_id, target_id, actor_id):
    state = deepcopy(target)
    source_debts = {str(d['id']): d for d in source.get('debts', []) if d.get('monimonId') == group_id}
    repaired = []
    for debt in state['debts']:
        if debt.get('monimonId') != group_id:
            continue
        original = source_debts.get(str(debt['id']))
        if not original or any(original.get(k) != debt.get(k) for k in ('title', 'date', 'amount', 'currency')):
            raise ValueError('No hay una copia coincidente para el gasto '+str(debt['id']))
        if not original.get('splitParticipantIds'):
            raise ValueError('La copia original no tiene un reparto explícito: '+str(debt['id']))
        for key in ('splitParticipantIds','splitMode','splitAmounts','splitPercentages'):
            debt[key] = deepcopy(original.get(key, {} if key in ('splitAmounts','splitPercentages') else 'equal'))
        repaired.append(str(debt['id']))
    if not repaired:
        raise ValueError('No hay gastos coincidentes para reparar.')
    link_member(state, actor_id, group_id, guest_id, target_id)
    return state, repaired


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-key', required=True)
    parser.add_argument('--target-key', required=True)
    parser.add_argument('--group-id', required=True)
    parser.add_argument('--guest-id', required=True)
    parser.add_argument('--target-member-id', required=True)
    parser.add_argument('--actor-id', required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    if args.source_key == args.target_key:
        raise ValueError('La copia original y el destino deben ser diferentes.')
    server.STATE_KEY = args.target_key
    rows = server.supabase_request('GET', f'group_state?key=eq.{quote(args.source_key, safe="")}&select=data')
    if not rows:
        raise ValueError('No se encontró la copia original.')
    source = rows[0]['data']
    target = server.get_state()
    result, repairs = prepare(source, target, args.group_id, args.guest_id, args.target_member_id, args.actor_id)
    print(json.dumps({'mode':'apply' if args.apply else 'preview', 'expensesWithRestoredSplits':len(repairs),
        'activeMembersAfter':[m['memberId'] for m in result['monimonMembers'] if m['monimonId']==args.group_id and m['status']=='active'],
        'paymentCountBefore':len(target['payments']), 'paymentCountAfter':len(result['payments']),
        'contactsUnchanged':target['contacts']==result['contacts']}, indent=2))
    if not args.apply:
        return
    # Public readiness check prevents repairing data while an old backend still
    # accepts legacy blind writes. No authenticated data sent to this endpoint.
    health = server.json_http_request('GET', 'https://monimoni-api-staging.onrender.com/api/health')
    if health.get('stateProtocol') != 2:
        raise ValueError('Primero debe estar publicado el backend con stateProtocol 2.')
    directory = Path('backups') / ('identity-repair-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    directory.mkdir(parents=True, exist_ok=False)
    for name, data in [('source',source),('before',target),('planned',result)]:
        (directory / (name+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    saved=server.put_state(result,target.get('_revision'))
    actual=server.get_state()
    if actual.get('_revision') != saved['_revision']:
        raise RuntimeError('Hubo otro cambio después de la reparación; revisar el estado actual.')
    print('Repair saved and verified. Backups:', directory)


if __name__ == '__main__': main()
