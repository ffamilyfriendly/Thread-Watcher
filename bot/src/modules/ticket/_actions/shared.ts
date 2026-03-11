import { Ticket } from '@watcher/shared';
import { APIGuildMember, GuildMember, RepliableInteraction } from 'discord.js';
import { err, ok, Result } from 'neverthrow';
import { RequiresAssignedRole, RequiresAssignedRoleOrOwnership } from 'utilities/error/def';

export function member_has_role_overlap(
  member: GuildMember | APIGuildMember,
  assigned_roles: string[],
): boolean {
  if (member instanceof GuildMember) {
    return assigned_roles.some((roleId) => member.roles.cache.has(roleId));
  }
  return member.roles.some((roleId) => assigned_roles.includes(roleId));
}

export function member_has_role_overlap_or_fail(
  member: GuildMember | APIGuildMember,
  assigned_roles: string[],
): Result<void, Error> {
  return member_has_role_overlap(member, assigned_roles)
    ? ok()
    : err(new RequiresAssignedRole(assigned_roles, member.user.id));
}

export function member_assigned_or_owner(
  member: GuildMember | APIGuildMember,
  ticket_owner_id: string,
  assigned_roles: string[],
): Result<void, Error> {
  if (member.user.id === ticket_owner_id) return ok();
  return member_has_role_overlap_or_fail(member, assigned_roles).mapErr((e) => {
    return new RequiresAssignedRoleOrOwnership(assigned_roles, member.user.id);
  });
}

export function can_close_ticket(int: RepliableInteraction, ticket: Ticket): boolean {
  const has_assigned_role = int.member
    ? member_has_role_overlap(int.member, ticket.assigned_to_roles)
    : false;
  const user_is_opener = int.user.id === ticket.owner;
  return has_assigned_role || user_is_opener;
}

export function can_close_ticket_or_fail(
  int: RepliableInteraction,
  ticket: Ticket,
): Result<void, Error> {
  return can_close_ticket(int, ticket)
    ? ok()
    : err(new RequiresAssignedRoleOrOwnership(ticket.assigned_to_roles, int.user.id));
}
