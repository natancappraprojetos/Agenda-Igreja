import type { ChurchEvent, User, AppRoleName } from '@/lib/types';

export interface EventPermissionResult {
  canEdit: boolean;
  canDelete: boolean;
  isCreator: boolean;
  isCulto: boolean;
  isAdmin: boolean;
  isAnciao: boolean;
}

/**
 * Determina as permissões que um usuário logado possui sobre um determinado evento na agenda.
 * 
 * Regras de Negócio:
 * 1. Admin: pode editar e excluir qualquer evento.
 * 2. Criador do evento (created_by): a pessoa que criou o evento (Denis da sonoplastia, William da música, etc.)
 *    pode editar livremente seus dados (título, dia/data, horário, local) e excluir o evento que criou.
 *    Possui fallback histórico para responsible_person_id == user.person_id.
 * 3. Culto: se for um culto (tipo ou título contendo 'culto'), TODOS os anciãos (roles.includes('anciao'))
 *    podem editar e gerenciar, mesmo que outro usuário o tenha criado.
 * 4. Fallback Liderança: isLeadership (nível >= 3) para supervisão pastoral/administrativa.
 */
export function canManageEvent(
  event: Partial<ChurchEvent> | null | undefined,
  user: User | null,
  roles: AppRoleName[] = [],
  isLeadership: boolean = false
): EventPermissionResult {
  if (!user || !event) {
    return {
      canEdit: false,
      canDelete: false,
      isCreator: false,
      isCulto: false,
      isAdmin: false,
      isAnciao: false,
    };
  }

  const isAdmin = roles.includes('admin');
  const isAnciao = roles.includes('anciao');

  const typeName = event.event_type?.name?.toLowerCase() || '';
  const title = event.title?.toLowerCase() || '';
  const isCulto = typeName.includes('culto') || title.includes('culto');

  // Identificação do criador do evento
  const isCreator = !!(
    (event.created_by && event.created_by === user.id) ||
    (user.person_id && event.responsible_person_id && event.responsible_person_id === user.person_id)
  );

  // Permissões
  const canEdit = isAdmin || isCreator || (isCulto && isAnciao) || isLeadership;
  const canDelete = isAdmin || isCreator || (isCulto && isAnciao) || isLeadership;

  return {
    canEdit,
    canDelete,
    isCreator,
    isCulto,
    isAdmin,
    isAnciao,
  };
}
