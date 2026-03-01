/** Catálogo das 48 séries de taxas de juros do SGS/BACEN */
export interface BacenSerie {
  codigo: number;
  nome: string;
  grupo: string;
}

export const BACEN_SERIES: BacenSerie[] = [
  // Recursos Livres — Total
  { codigo: 25436, nome: "Taxa média mensal de juros - Total", grupo: "Recursos Livres — Total" },
  { codigo: 27641, nome: "Taxa média mensal de juros não rotativo - Total", grupo: "Recursos Livres — Total" },
  // Pessoa Jurídica
  { codigo: 25437, nome: "PJ - Total", grupo: "Pessoa Jurídica" },
  { codigo: 27642, nome: "PJ - Não rotativo - Total", grupo: "Pessoa Jurídica" },
  { codigo: 25438, nome: "PJ - Desconto de duplicatas e recebíveis", grupo: "Pessoa Jurídica" },
  { codigo: 25439, nome: "PJ - Desconto de cheques", grupo: "Pessoa Jurídica" },
  { codigo: 25440, nome: "PJ - Antecipação de faturas de cartão de crédito", grupo: "Pessoa Jurídica" },
  { codigo: 25441, nome: "PJ - Capital de giro com prazo de até 365 dias", grupo: "Pessoa Jurídica" },
  { codigo: 25442, nome: "PJ - Capital de giro com prazo superior a 365 dias", grupo: "Pessoa Jurídica" },
  { codigo: 25443, nome: "PJ - Capital de giro rotativo", grupo: "Pessoa Jurídica" },
  { codigo: 25444, nome: "PJ - Capital de giro total", grupo: "Pessoa Jurídica" },
  { codigo: 25445, nome: "PJ - Conta garantida", grupo: "Pessoa Jurídica" },
  { codigo: 25446, nome: "PJ - Cheque especial", grupo: "Pessoa Jurídica" },
  { codigo: 25447, nome: "PJ - Aquisição de veículos", grupo: "Pessoa Jurídica" },
  { codigo: 25448, nome: "PJ - Aquisição de outros bens", grupo: "Pessoa Jurídica" },
  { codigo: 25449, nome: "PJ - Vendor", grupo: "Pessoa Jurídica" },
  { codigo: 25450, nome: "PJ - Cartão de crédito rotativo", grupo: "Pessoa Jurídica" },
  { codigo: 25451, nome: "PJ - Cartão de crédito parcelado", grupo: "Pessoa Jurídica" },
  { codigo: 25452, nome: "PJ - Cartão de crédito total", grupo: "Pessoa Jurídica" },
  { codigo: 25453, nome: "PJ - Financiamento imobiliário c/ taxas reguladas", grupo: "Pessoa Jurídica" },
  { codigo: 25454, nome: "PJ - Financiamento imobiliário c/ taxas de mercado", grupo: "Pessoa Jurídica" },
  { codigo: 25455, nome: "PJ - ACC", grupo: "Pessoa Jurídica" },
  { codigo: 25456, nome: "PJ - Repasses BNDES", grupo: "Pessoa Jurídica" },
  { codigo: 25457, nome: "PJ - Outros créditos livres", grupo: "Pessoa Jurídica" },
  { codigo: 27643, nome: "PJ - Outros créditos não rotativo", grupo: "Pessoa Jurídica" },
  { codigo: 27644, nome: "PJ - Outros créditos rotativo", grupo: "Pessoa Jurídica" },
  // Pessoa Física
  { codigo: 25458, nome: "PF - Total", grupo: "Pessoa Física" },
  { codigo: 27645, nome: "PF - Não rotativo - Total", grupo: "Pessoa Física" },
  { codigo: 25459, nome: "PF - Cheque especial", grupo: "Pessoa Física" },
  { codigo: 25460, nome: "PF - Crédito pessoal não consignado", grupo: "Pessoa Física" },
  { codigo: 25461, nome: "PF - Crédito pessoal consignado público", grupo: "Pessoa Física" },
  { codigo: 25462, nome: "PF - Crédito pessoal consignado privado", grupo: "Pessoa Física" },
  { codigo: 25463, nome: "PF - Crédito pessoal consignado INSS", grupo: "Pessoa Física" },
  { codigo: 25464, nome: "PF - Crédito pessoal consignado total", grupo: "Pessoa Física" },
  { codigo: 25465, nome: "PF - Crédito pessoal total", grupo: "Pessoa Física" },
  { codigo: 25466, nome: "PF - Cartão de crédito rotativo", grupo: "Pessoa Física" },
  { codigo: 25467, nome: "PF - Cartão de crédito parcelado", grupo: "Pessoa Física" },
  { codigo: 25468, nome: "PF - Cartão de crédito total", grupo: "Pessoa Física" },
  { codigo: 25469, nome: "PF - Financiamento imobiliário c/ taxas reguladas", grupo: "Pessoa Física" },
  { codigo: 25470, nome: "PF - Financiamento imobiliário c/ taxas de mercado", grupo: "Pessoa Física" },
  { codigo: 25471, nome: "PF - Aquisição de veículos", grupo: "Pessoa Física" },
  { codigo: 25472, nome: "PF - Aquisição de outros bens", grupo: "Pessoa Física" },
  { codigo: 25473, nome: "PF - Desconto de cheques", grupo: "Pessoa Física" },
  { codigo: 25474, nome: "PF - Outros créditos livres", grupo: "Pessoa Física" },
  { codigo: 27646, nome: "PF - Outros créditos não rotativo", grupo: "Pessoa Física" },
  { codigo: 27647, nome: "PF - Outros créditos rotativo", grupo: "Pessoa Física" },
  { codigo: 27648, nome: "PF - Crédito pessoal não consignado vinculado", grupo: "Pessoa Física" },
  { codigo: 27649, nome: "PF - Crédito pessoal não consignado não vinculado", grupo: "Pessoa Física" },
];

export function getSeriesByGroup(): Record<string, BacenSerie[]> {
  const groups: Record<string, BacenSerie[]> = {};
  for (const s of BACEN_SERIES) {
    if (!groups[s.grupo]) groups[s.grupo] = [];
    groups[s.grupo].push(s);
  }
  return groups;
}
