export function mapDatabaseError(error: any): string {
  const message = (error?.message || '').toLowerCase();

  if (message.includes('foreign key') || message.includes('violates')) {
    return 'Não é possível excluir este registro pois está sendo usado.';
  }
  if (message.includes('unique') || message.includes('duplicate')) {
    return 'Este registro já existe.';
  }
  if (message.includes('not found') || message.includes('no rows')) {
    return 'Registro não encontrado.';
  }
  if (message.includes('unauthorized') || message.includes('permission') || message.includes('jwt')) {
    return 'Você não tem permissão para esta operação.';
  }
  if (message.includes('row-level security') || message.includes('rls')) {
    return 'Você não tem permissão para esta operação.';
  }

  console.error('Database error:', error);
  return 'Erro ao processar operação. Tente novamente.';
}
