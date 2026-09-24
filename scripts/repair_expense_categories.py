"""Restore missing/default expense categories from a matching intact snapshot.

Read-only preview by default. --apply writes with CAS after local backups.
Existing non-default categories are always preserved, including recent edits.
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


def prepare(source, current, group_id):
    result = deepcopy(current)
    originals = {str(d['id']): d for d in source.get('debts', []) if d.get('monimonId') == group_id}
    repaired = []
    for debt in result['debts']:
        if debt.get('monimonId') != group_id or debt.get('category') not in (None, '', 'general'):
            continue
        original = originals.get(str(debt['id']))
        if not original or original.get('category') in (None, '', 'general'):
            continue
        if any(original.get(k) != debt.get(k) for k in ('title', 'date', 'amount', 'currency', 'kind')):
            raise ValueError('El gasto cambió respecto de la copia original: ' + str(debt['id']))
        debt['category'] = original['category']
        repaired.append({'id': debt['id'], 'category': debt['category']})
    return result, repaired


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-key', required=True)
    parser.add_argument('--target-key', required=True)
    parser.add_argument('--group-id', required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    if args.source_key == args.target_key:
        raise ValueError('La copia original y el destino deben ser diferentes.')
    server.STATE_KEY = args.target_key
    rows = server.supabase_request('GET', f'group_state?key=eq.{quote(args.source_key, safe="")}&select=data')
    if not rows:
        raise ValueError('No se encontró la copia original.')
    source, before = rows[0]['data'], server.get_state()
    result, repairs = prepare(source, before, args.group_id)
    print(json.dumps({'mode': 'apply' if args.apply else 'preview', 'restoredCategories': repairs}, indent=2))
    if not args.apply or not repairs:
        return
    if server.json_http_request('GET', 'https://monimoni-api-staging.onrender.com/api/health').get('stateProtocol') != 2:
        raise ValueError('La API publicada debe usar el protocolo 2.')
    backup = Path('backups') / ('category-repair-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    backup.mkdir(parents=True, exist_ok=False)
    for name, state in [('source', source), ('before', before), ('planned', result)]:
        (backup / (name + '.json')).write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding='utf-8')
    saved = server.put_state(result, before.get('_revision'))
    actual = server.get_state()
    if actual.get('_revision') != saved['_revision'] or any(actual[k] != saved[k] for k in server.EMPTY_STATE):
        raise RuntimeError('Hubo otro cambio después de la reparación; revisar el estado actual.')
    print('Categories saved and verified. Backups:', backup)


if __name__ == '__main__': main()
