

## Situação Atual

O projeto foi **recriado com sucesso** com todas as funcionalidades principais restauradas.

## Funcionalidades Implementadas

### ✅ Autenticação
- Login/Signup com Supabase Auth
- Rotas protegidas com ProtectedRoute
- Logout funcional

### ✅ CRUD Completo
- **Clientes**: Cadastro, edição, exclusão com formulário completo (nome, CPF, RG, email, telefone, endereço, estado civil, profissão, etc.)
- **Casos**: Criação vinculada a cliente, código automático (REV-YYYY-NNNN), exclusão com cascade em documentos
- **Templates**: CRUD com tipos (Proposta, Honorários, Procuração, etc.), variáveis dinâmicas

### ✅ Wizard de Análise (5 Etapas)
1. **Calculadora Price**: Cálculo de PMT, detecção de diferença entre parcela contratada e calculada
2. **BACEN (SGS)**: Registro de taxas SELIC, CDI, taxa média da modalidade
3. **Planilha Revisional**: Tabela de amortização, registro de tarifas abusivas com cálculo automático
4. **Valores a Receber**: Resumo de valores (diferença de juros + tarifas irregulares)
5. **Documentos/Petições**: Listagem de documentos vinculados ao caso

### ✅ Responsividade Mobile
- Sidebar com menu hambúrguer colapsável
- Cards responsivos para listagens em telas pequenas
- Layout adaptativo com breakpoints MD

### ✅ Edge Function
- `manage-users`: Admin SDK para listar, criar, excluir usuários e atribuir roles

## Estrutura de Dados (Supabase)
- `clientes`, `casos`, `documentos_caso`, `templates`, `user_roles`
- Bucket de storage: `contratos`
- Roles: admin, advogado, operador
