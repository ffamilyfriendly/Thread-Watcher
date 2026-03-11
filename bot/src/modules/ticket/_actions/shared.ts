import { APIGuildMember, GuildMember } from 'discord.js';

export function member_has_role_overlap(
  member: GuildMember | APIGuildMember,
  assigned_roles: string[],
): boolean {
  if (member instanceof GuildMember) {
    return assigned_roles.some((roleId) => member.roles.cache.has(roleId));
  }
  return member.roles.some((roleId) => assigned_roles.includes(roleId));
}
