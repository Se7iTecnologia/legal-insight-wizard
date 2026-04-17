# Módulo Financeiro — Plano de Execução

Entrega faseada para não quebrar o app atual. Cada fase é independente e testável.

## 🎯 Decisões alinhadas
- Nova tabela `contratos_financeiros` com FK opcional para `casos`
- Sidebar agrupado em seção "Financeiro"
- Mantém Navy & Gold atual
- RLS por `user_id` (padrão atual)

## 📦 FASE 1 — Estrutura, Menu e Schema
- Sidebar com seção "Financeiro" expansível: Dashboard Fin., Fluxo de Caixa, Contratos Fin., Relatórios
- Migration: `contratos_financeiros`, `parcelas`, `lancamentos` (todas com RLS owner-scoped)
- Trigger de geração automática de parcelas + marcação de vencidas
- Páginas placeholder

## 💸 FASE 2 — Fluxo de Caixa
- Lançamentos receita/despesa, filtros, saldo realtime
- Receita vinculada a contrato → abate parcela mais próxima

## 📄 FASE 3 — Contratos + Parcelas
- CRUD contrato (reusa popup de cliente, caso opcional)
- Geração automática de parcelas, timeline, histórico
- Botão "marcar como pago" gera receita

## 📊 FASE 4 — Dashboard Financeiro + Relatórios
- Cards: saldo, a receber, despesas, lucro, vencidas, hoje
- Gráficos fluxo mensal, receitas x despesas, ranking
- Export PDF/Excel com filtros

## 🔔 FASE 5 — Notificações e Cobranças
- Badge sidebar, botão "Cobrar Cliente" via wa.me
- Edge Function `notify-overdue` + cron diário

## ✅ Validação por fase
CRUD, RLS por usuário, mobile, sem regressão.

## 🚀 Próximo passo
Confirme para iniciar a **Fase 1**.
