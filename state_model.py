"""Pure group operations. No network calls; all changes are committed together."""
from copy import deepcopy
from datetime import datetime, timezone
import uuid
import re


class StateError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def assign_invite_codes(state):
    """Keep links issued by the original JavaScript client valid on the server."""
    alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    used = set()
    def generated(seed, salt=''):
        value = 2166136261
        source = f'{seed or "monimon"}:{salt}'.encode('utf-16-le')
        for i in range(0, len(source), 2):
            value = ((value ^ int.from_bytes(source[i:i+2], 'little')) * 16777619) & 0xffffffff
        code = ''
        for _ in range(6):
            code += alphabet[value % len(alphabet)]
            value //= len(alphabet)
        return code
    for group in state['monimons']:
        code = re.sub('[^A-Z0-9]', '', str(group.get('inviteCode') or '').upper())[:6] or generated(group['id'])
        salt = 1
        while code in used:
            code = generated(group['id'], salt)
            salt += 1
        group['inviteCode'] = code
        used.add(code)


def validate_group_edits(current, incoming, actor):
    """Generic autosave cannot bypass group roles or undo an identity merge."""
    old_groups = {g['id']: g for g in current['monimons']}
    new_groups = {g['id']: g for g in incoming.get('monimons', [])}
    for gid, old in old_groups.items():
        new = new_groups.get(gid)
        fields = {'name': '', 'icon': 'home', 'adminIds': [], 'memberColors': {}}
        if new is None or any((old.get(k) or default) != (new.get(k) or default) for k, default in fields.items()):
            require_admin(current, gid, actor)
    for gid in new_groups.keys() - old_groups.keys():
        if actor not in new_groups[gid].get('adminIds', []) or actor not in active_ids(incoming, gid):
            raise StateError('El creador debe ser integrante y administrador del grupo.', 403)
    old_rows = {(m['monimonId'], m['memberId']): m for m in current['monimonMembers']}
    new_rows = {(m['monimonId'], m['memberId']): m for m in incoming.get('monimonMembers', [])}
    for key in old_rows.keys() | new_rows.keys():
        old, new = old_rows.get(key), new_rows.get(key)
        gid, mid = key
        if gid not in new_groups:
            continue  # Group deletion was authorized above.
        if old and old.get('linkedToMemberId') and (not new or new.get('linkedToMemberId') != old['linkedToMemberId'] or new.get('status') != 'removed'):
            raise StateError('Ese invitado ya fue vinculado. Actualizá el grupo antes de guardar.', 409)
        if old and new and old.get('status', 'active') == new.get('status', 'active'):
            continue
        if gid in old_groups:
            require_admin(current, gid, actor)
    for key, old in old_rows.items():
        if not old.get('linkedToMemberId') or key[0] not in new_groups:
            continue
        for collection in ('debts', 'payments', 'paymentRequests'):
            for record in incoming.get(collection, []):
                if record.get('monimonId') != key[0]:
                    continue
                references = [record.get('fromMemberId'), record.get('toMemberId'), *(record.get('splitParticipantIds') or [])]
                if key[1] in references:
                    raise StateError('El integrante de este movimiento fue vinculado a otra cuenta. Volvé a abrirlo.', 409)


def group_for(state, group_id):
    group = next((g for g in state['monimons'] if g['id'] == group_id), None)
    if not group:
        raise StateError('No se encontró el grupo.', 404)
    return group


def memberships(state, group_id):
    return [m for m in state['monimonMembers'] if m['monimonId'] == group_id]


def active_ids(state, group_id):
    return list(dict.fromkeys(m['memberId'] for m in memberships(state, group_id) if m.get('status') == 'active'))


def require_admin(state, group_id, actor):
    group = group_for(state, group_id)
    admins = group.get('adminIds') or active_ids(state, group_id)[:1]
    if actor not in admins or actor not in active_ids(state, group_id):
        raise StateError('Solo un administrador del grupo puede hacer este cambio.', 403)


def freeze_splits(state, group_id):
    ids = active_ids(state, group_id)
    for debt in state['debts']:
        if debt.get('monimonId') == group_id and debt.get('kind') != 'loan' and not debt.get('splitParticipantIds'):
            debt['splitParticipantIds'] = list(ids)


def log(state, group_id, actor, activity, **extra):
    state['activityLog'].insert(0, {'id': str(uuid.uuid4()), 'monimonId': group_id,
        'memberId': actor, 'activity': activity, 'createdAt': datetime.now(timezone.utc).isoformat(), **extra})


def ensure_membership(state, group_id, member_id):
    row = next((m for m in memberships(state, group_id) if m['memberId'] == member_id), None)
    if row:
        row.update(status='active', removedAt=None)
    else:
        state['monimonMembers'].append({'monimonId': group_id, 'memberId': member_id, 'status': 'active', 'role': 'member'})
    group = group_for(state, group_id)
    group['members'] = list(dict.fromkeys([*(group.get('members') or []), member_id]))


def join_group(state, actor, invite_code, guest_id=None):
    group = next((g for g in state['monimons'] if str(g.get('inviteCode', '')).lower() == str(invite_code).lower() and invite_code), None)
    if not group:
        raise StateError('El enlace de invitación no es válido.', 404)
    group_id = group['id']
    if guest_id:
        guest = next((m for m in state['members'] if m['id'] == guest_id), None)
        if not guest or guest.get('profileId') or guest_id not in active_ids(state, group_id):
            raise StateError('Ese invitado ya no está disponible. Actualizá el grupo.')
        requests = state.setdefault('identityRequests', [])
        if not any(r.get('status') == 'pending' and r['monimonId'] == group_id and r['memberId'] == actor and r['guestId'] == guest_id for r in requests):
            requests.append({'id': str(uuid.uuid4()), 'monimonId': group_id, 'memberId': actor,
                'guestId': guest_id, 'status': 'pending', 'createdAt': datetime.now(timezone.utc).isoformat()})
            log(state, group_id, actor, 'Solicitó vincularse con un invitado', targetMemberId=guest_id)
        # Do not introduce a second person, or transfer debts without approval.
        return
    freeze_splits(state, group_id)
    ensure_membership(state, group_id, actor)
    log(state, group_id, actor, 'Se unió al grupo')


def link_member(state, actor, group_id, guest_id, target_id):
    require_admin(state, group_id, actor)
    guest = next((m for m in state['members'] if m['id'] == guest_id), None)
    target = next((m for m in state['members'] if m['id'] == target_id and m.get('profileId')), None)
    if guest_id == target_id or not guest or guest.get('profileId') or not target:
        raise StateError('Seleccioná un invitado y una cuenta registrada diferentes.')
    if guest_id not in active_ids(state, group_id):
        raise StateError('El invitado ya fue vinculado o retirado. Actualizá el grupo.', 409)
    requested = any(r.get('status') == 'pending' and r['monimonId'] == group_id and r['guestId'] == guest_id and r['memberId'] == target_id for r in state.get('identityRequests', []))
    contact = any(c.get('ownerProfileId') == actor and c.get('memberId') == target_id and c.get('status') == 'active' for c in state.get('contacts', []))
    if target_id not in active_ids(state, group_id) and not requested and not contact:
        raise StateError('La cuenta debe estar en el grupo, en tu agenda o haber solicitado la vinculación.', 403)
    freeze_splits(state, group_id)
    fields = ('fromMemberId', 'toMemberId', 'requestedByMemberId', 'rejectedByMemberId', 'registeredByMemberId')
    arrays = ('approvedByMemberIds', 'requiredApproverMemberIds', 'verifiedByMemberIds')
    for collection in ('debts', 'payments', 'paymentRequests'):
        for record in state[collection]:
            if record.get('monimonId') != group_id:
                continue
            participants = record.get('splitParticipantIds', [])
            # Collapse two shares by addition, never by overwriting one of them.
            if guest_id in participants and target_id in participants and record.get('splitMode', 'equal') == 'equal':
                record['splitAmounts'] = {mid: float(record['amount']) / len(participants) for mid in participants}
                record['splitMode'] = 'amount'
            for key in ('splitAmounts', 'splitPercentages'):
                values = record.get(key, {})
                if guest_id in values:
                    values[target_id] = float(values.get(target_id, 0)) + float(values.pop(guest_id))
            if participants:
                record['splitParticipantIds'] = list(dict.fromkeys(target_id if mid == guest_id else mid for mid in participants))
            for key in fields:
                if record.get(key) == guest_id:
                    record[key] = target_id
            for key in arrays:
                if key in record:
                    record[key] = list(dict.fromkeys(target_id if mid == guest_id else mid for mid in record[key]))
            if record.get('fromMemberId') == record.get('toMemberId') and (collection != 'debts' or record.get('kind') == 'loan'):
                # Retain the audit record, but a transfer to oneself has no balance.
                record['identityMerged'] = True
                record['status'] = 'void'
            if collection == 'paymentRequests' and record.get('status') == 'pending':
                requester = record.get('requestedByMemberId')
                record['approvedByMemberIds'] = [mid for mid in record.get('approvedByMemberIds', []) if mid != requester]
                required = [mid for mid in record.get('requiredApproverMemberIds', []) if mid != requester]
                record['requiredApproverMemberIds'] = required or list(dict.fromkeys(mid for mid in (record.get('fromMemberId'), record.get('toMemberId')) if mid and mid != requester))
    for row in memberships(state, group_id):
        if row['memberId'] == guest_id:
            row.update(status='removed', linkedToMemberId=target_id, linkedByMemberId=actor)
    ensure_membership(state, group_id, target_id)
    group = group_for(state, group_id)
    group['members'] = [mid for mid in group['members'] if mid != guest_id]
    group['adminIds'] = list(dict.fromkeys(target_id if mid == guest_id else mid for mid in group.get('adminIds', [])))
    colors = group.get('memberColors', {})
    if guest_id in colors:
        colors.setdefault(target_id, colors.pop(guest_id))
    for request in state.get('identityRequests', []):
        if request['monimonId'] == group_id and request['guestId'] == guest_id and request.get('status') == 'pending':
            request['status'] = 'approved' if request['memberId'] == target_id else 'rejected'
    log(state, group_id, actor, 'Vinculación de integrante', targetMemberId=guest_id, destinationMemberId=target_id)


def leave_group(state, actor, group_id):
    group = group_for(state, group_id)
    ids = active_ids(state, group_id)
    if actor not in ids:
        raise StateError('Ya no sos integrante del grupo.', 409)
    admins = group.get('adminIds') or ids[:1]
    registered = {m['id'] for m in state['members'] if m.get('profileId')}
    if actor in admins and not [mid for mid in admins if mid != actor and mid in ids and mid in registered]:
        raise StateError('Asigná otro administrador antes de salir del grupo.')
    freeze_splits(state, group_id)
    for row in memberships(state, group_id):
        if row['memberId'] == actor:
            row.update(status='removed', removedAt=datetime.now(timezone.utc).isoformat())
    group['members'] = [mid for mid in group.get('members', []) if mid != actor]
    group['adminIds'] = [mid for mid in admins if mid != actor]
    log(state, group_id, actor, 'Salió del grupo')
