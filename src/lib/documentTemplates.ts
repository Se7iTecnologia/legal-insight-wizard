// Built-in legal document templates with dynamic variables
// Variables use {{scope.field}} syntax

export interface DocVariable {
  key: string;
  label: string;
  category: string;
}

export const AVAILABLE_VARIABLES: DocVariable[] = [
  // Cliente
  { key: "{{cliente.nome}}", label: "Nome do Cliente", category: "Cliente" },
  { key: "{{cliente.cpf_cnpj}}", label: "CPF/CNPJ", category: "Cliente" },
  { key: "{{cliente.rg}}", label: "RG", category: "Cliente" },
  { key: "{{cliente.nacionalidade}}", label: "Nacionalidade", category: "Cliente" },
  { key: "{{cliente.estado_civil}}", label: "Estado Civil", category: "Cliente" },
  { key: "{{cliente.profissao}}", label: "Profissão", category: "Cliente" },
  { key: "{{cliente.email}}", label: "E-mail", category: "Cliente" },
  { key: "{{cliente.telefone}}", label: "Telefone", category: "Cliente" },
  { key: "{{cliente.endereco}}", label: "Endereço", category: "Cliente" },
  { key: "{{cliente.cidade}}", label: "Cidade", category: "Cliente" },
  { key: "{{cliente.uf}}", label: "UF", category: "Cliente" },
  { key: "{{cliente.cep}}", label: "CEP", category: "Cliente" },
  { key: "{{cliente.data_nascimento}}", label: "Data de Nascimento", category: "Cliente" },
  // Contrato
  { key: "{{contrato.valorFinanciado}}", label: "Valor Financiado", category: "Contrato" },
  { key: "{{contrato.parcela}}", label: "Parcela Contratada", category: "Contrato" },
  { key: "{{contrato.taxaMensal}}", label: "Taxa Mensal (%)", category: "Contrato" },
  { key: "{{contrato.taxaAnual}}", label: "Taxa Anual (%)", category: "Contrato" },
  { key: "{{contrato.prazoMeses}}", label: "Prazo (meses)", category: "Contrato" },
  { key: "{{contrato.banco}}", label: "Banco/Instituição", category: "Contrato" },
  { key: "{{contrato.numeroContrato}}", label: "Nº do Contrato", category: "Contrato" },
  { key: "{{contrato.dataContrato}}", label: "Data do Contrato", category: "Contrato" },
  // Caso
  { key: "{{caso.codigo}}", label: "Código do Caso", category: "Caso" },
  { key: "{{caso.status}}", label: "Status do Caso", category: "Caso" },
  // Cálculos
  { key: "{{calculo.novaPrestacao}}", label: "Nova Prestação", category: "Cálculos" },
  { key: "{{calculo.diferencaParcela}}", label: "Diferença por Parcela", category: "Cálculos" },
  { key: "{{calculo.totalPago}}", label: "Total Pago ao Banco", category: "Cálculos" },
  { key: "{{calculo.totalRevisado}}", label: "Total Revisado", category: "Cálculos" },
  { key: "{{calculo.valoresReceber}}", label: "Valores a Receber", category: "Cálculos" },
  { key: "{{calculo.economiaTotal}}", label: "Economia Total", category: "Cálculos" },
  { key: "{{calculo.taxaMediaBacen}}", label: "Taxa Média BACEN", category: "Cálculos" },
  // Tarifas
  { key: "{{tarifas.lista}}", label: "Lista de Tarifas Abusivas", category: "Tarifas" },
  { key: "{{tarifas.total}}", label: "Total Tarifas Abusivas", category: "Tarifas" },
  // Data
  { key: "{{data.hoje}}", label: "Data de Hoje", category: "Sistema" },
  { key: "{{data.hojeExtenso}}", label: "Data por Extenso", category: "Sistema" },
];

export function buildVariableMap(caso: any): Record<string, string> {
  const c = (caso.contrato as any) || {};
  const sim = (caso.simulacao as any) || {};
  const bacen = (caso.bacen as any) || {};
  const tarifas = Array.isArray(caso.tarifas) ? caso.tarifas : [];
  const cliente = caso.clientes || {};

  const fmt = (v: any) => {
    if (v === null || v === undefined || v === "") return "[não informado]";
    return String(v);
  };

  const fmtBRL = (v: any) => {
    const n = parseFloat(v);
    if (isNaN(n)) return "[não informado]";
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const hoje = new Date();
  const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

  const novaPrestacao = sim.resultado?.pmt || sim.novaPrestacao || 0;
  const parcelaContratada = parseFloat(c.parcela) || 0;
  const diferenca = parcelaContratada - (parseFloat(String(novaPrestacao)) || 0);
  const prazo = parseInt(c.prazoMeses) || 0;
  const parcelasPagas = parseInt(c.parcelasPagas || sim.parcelasPagas) || 0;
  const totalPago = parcelaContratada * parcelasPagas;
  const totalRevisado = (parseFloat(String(novaPrestacao)) || 0) * parcelasPagas;
  const valoresReceber = parcelasPagas * diferenca;
  const economiaTotal = totalPago - totalRevisado;

  const totalTarifas = tarifas.reduce((s: number, t: any) => s + (parseFloat(t.valor) || 0), 0);
  const listaTarifas = tarifas.length > 0
    ? tarifas.map((t: any) => `• ${t.descricao || t.nome}: ${fmtBRL(t.valor)}`).join("\n")
    : "Nenhuma tarifa abusiva identificada";

  return {
    "{{cliente.nome}}": fmt(cliente.nome),
    "{{cliente.cpf_cnpj}}": fmt(cliente.cpf_cnpj),
    "{{cliente.rg}}": fmt(cliente.rg),
    "{{cliente.nacionalidade}}": fmt(cliente.nacionalidade),
    "{{cliente.estado_civil}}": fmt(cliente.estado_civil),
    "{{cliente.profissao}}": fmt(cliente.profissao),
    "{{cliente.email}}": fmt(cliente.email),
    "{{cliente.telefone}}": fmt(cliente.telefone),
    "{{cliente.endereco}}": fmt(cliente.endereco),
    "{{cliente.cidade}}": fmt(cliente.cidade),
    "{{cliente.uf}}": fmt(cliente.uf),
    "{{cliente.cep}}": fmt(cliente.cep),
    "{{cliente.data_nascimento}}": cliente.data_nascimento ? new Date(cliente.data_nascimento).toLocaleDateString("pt-BR") : "[não informado]",
    "{{contrato.valorFinanciado}}": fmtBRL(c.valorFinanciado),
    "{{contrato.parcela}}": fmtBRL(c.parcela),
    "{{contrato.taxaMensal}}": c.taxaMensal ? `${c.taxaMensal}%` : "[não informado]",
    "{{contrato.taxaAnual}}": c.taxaAnual ? `${c.taxaAnual}%` : "[não informado]",
    "{{contrato.prazoMeses}}": fmt(c.prazoMeses),
    "{{contrato.banco}}": fmt(c.banco || c.instituicao),
    "{{contrato.numeroContrato}}": fmt(c.numeroContrato),
    "{{contrato.dataContrato}}": c.dataContrato ? new Date(c.dataContrato).toLocaleDateString("pt-BR") : "[não informado]",
    "{{caso.codigo}}": fmt(caso.codigo),
    "{{caso.status}}": fmt(caso.status),
    "{{calculo.novaPrestacao}}": fmtBRL(novaPrestacao),
    "{{calculo.diferencaParcela}}": fmtBRL(diferenca),
    "{{calculo.totalPago}}": fmtBRL(totalPago),
    "{{calculo.totalRevisado}}": fmtBRL(totalRevisado),
    "{{calculo.valoresReceber}}": fmtBRL(valoresReceber),
    "{{calculo.economiaTotal}}": fmtBRL(economiaTotal),
    "{{calculo.taxaMediaBacen}}": bacen.taxaMedia ? `${bacen.taxaMedia}%` : "[não informado]",
    "{{tarifas.lista}}": listaTarifas,
    "{{tarifas.total}}": fmtBRL(totalTarifas),
    "{{data.hoje}}": hoje.toLocaleDateString("pt-BR"),
    "{{data.hojeExtenso}}": `${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`,
  };
}

export function replaceVariables(content: string, vars: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    result = result.split(key).join(value);
  }
  return result;
}

// Built-in templates
export const BUILTIN_TEMPLATES: { id: string; nome: string; tipo: string; descricao: string; conteudo: string }[] = [
  {
    id: "peticao-revisional",
    nome: "Petição Inicial – Revisão de Contrato Bancário",
    tipo: "peticao",
    descricao: "Petição inicial completa para ação revisional de contrato bancário com pedido de tutela de urgência",
    conteudo: `<h1 style="text-align:center;font-size:14pt;"><strong>EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA VARA CÍVEL DA COMARCA DE {{cliente.cidade}} – ESTADO DE {{cliente.uf}}</strong></h1>
<p>&nbsp;</p>
<p style="text-align:center;"><strong>Petição Inicial. Revisão de Contratos Bancários. Abusividades. Oneração excessiva. Dificuldades para manutenção das despesas de subsistência. TUTELA DE URGÊNCIA.</strong></p>
<p>&nbsp;</p>
<p><strong>{{cliente.nome}}</strong>, {{cliente.nacionalidade}}, com CPF sob nº {{cliente.cpf_cnpj}}, RG sob nº {{cliente.rg}}, {{cliente.estado_civil}}, {{cliente.profissao}}, endereço eletrônico {{cliente.email}}, contato {{cliente.telefone}} e com endereço em {{cliente.endereco}}, {{cliente.cidade}}/{{cliente.uf}}, CEP {{cliente.cep}}.</p>
<p>&nbsp;</p>
<p style="text-align:center;"><strong>AÇÃO REVISIONAL DE CONTRATO BANCÁRIO – COM PEDIDO DE TUTELA DE URGÊNCIA EM FACE DE</strong></p>
<p>&nbsp;</p>
<p><strong>{{contrato.banco}}</strong>, instituição financeira, pessoa jurídica de direito privado, pelas razões de fato e de direito a seguir expostas:</p>
<p>&nbsp;</p>
<h2><strong>I. DA JUSTIÇA GRATUITA</strong></h2>
<p>O Autor não possui condições financeiras de arcar com custas processuais e honorários advocatícios sem prejuízo de sua própria subsistência e de sua família.</p>
<p>Nos termos do artigo 98 do Código de Processo Civil, a pessoa natural que comprovar insuficiência de recursos tem direito à concessão dos benefícios da gratuidade da justiça.</p>
<p>Dessa forma, requer-se a concessão dos benefícios da justiça gratuita.</p>
<p>&nbsp;</p>
<h2><strong>II. DOS FATOS</strong></h2>
<p>O Autor firmou junto à instituição financeira Ré o contrato nº {{contrato.numeroContrato}}, em {{contrato.dataContrato}}, no valor de {{contrato.valorFinanciado}}, para pagamento em {{contrato.prazoMeses}} parcelas mensais de {{contrato.parcela}}.</p>
<p>Ao analisar minuciosamente o contrato firmado, o Autor constatou a existência de cláusulas potencialmente abusivas, que tornaram a obrigação excessivamente onerosa.</p>
<p>Dentre as irregularidades identificadas, destacam-se:</p>
<ul>
<li>Cobrança de taxas de juros superiores à média de mercado divulgada pelo Banco Central (taxa contratada: {{contrato.taxaMensal}} a.m. / taxa média BACEN: {{calculo.taxaMediaBacen}} a.m.);</li>
<li>Inclusão de seguros e serviços acessórios sem solicitação do consumidor;</li>
<li>Previsão de capitalização irregular de juros;</li>
<li>Incidência de encargos contratuais desproporcionais.</li>
</ul>
<p>&nbsp;</p>
<h2><strong>III. DAS TARIFAS E ENCARGOS ABUSIVOS</strong></h2>
<p>Foram identificados os seguintes encargos abusivos no contrato:</p>
<p>{{tarifas.lista}}</p>
<p>Totalizando {{tarifas.total}} em cobranças indevidas.</p>
<p>&nbsp;</p>
<h2><strong>IV. DA RELAÇÃO DE CONSUMO</strong></h2>
<p>A relação jurídica entre as partes caracteriza-se como típica relação de consumo, nos termos dos artigos 2º e 3º do CDC. Aplica-se a Súmula 297 do STJ.</p>
<p>&nbsp;</p>
<h2><strong>V. DOS CÁLCULOS REVISIONAIS</strong></h2>
<p>A análise técnica demonstrou que:</p>
<ul>
<li>Prestação contratada: {{contrato.parcela}}</li>
<li>Prestação revisada: {{calculo.novaPrestacao}}</li>
<li>Diferença por parcela: {{calculo.diferencaParcela}}</li>
<li>Total pago indevidamente: {{calculo.valoresReceber}}</li>
<li>Economia total projetada: {{calculo.economiaTotal}}</li>
</ul>
<p>&nbsp;</p>
<h2><strong>VI. DOS PEDIDOS</strong></h2>
<p>Diante do exposto, requer:</p>
<ol>
<li>A concessão da gratuidade de justiça;</li>
<li>A citação da parte ré para contestar;</li>
<li>A concessão de tutela de urgência para autorizar depósito judicial do valor incontroverso;</li>
<li>A inversão do ônus da prova (art. 6º, VIII, CDC);</li>
<li>A revisão das taxas de juros e encargos contratuais;</li>
<li>O recálculo do saldo devedor;</li>
<li>A restituição em dobro dos valores pagos indevidamente (art. 42, parágrafo único, CDC);</li>
<li>A condenação da ré em custas e honorários.</li>
</ol>
<p>&nbsp;</p>
<p>Dá-se à causa o valor de {{calculo.valoresReceber}}.</p>
<p>&nbsp;</p>
<p>Termos em que,</p>
<p>Pede deferimento.</p>
<p>&nbsp;</p>
<p>{{cliente.cidade}}/{{cliente.uf}}, {{data.hojeExtenso}}.</p>
<p>&nbsp;</p>
<p>_____________________________________________</p>
<p>Advogado(a) – OAB</p>`,
  },
  {
    id: "contrato-honorarios",
    nome: "Contrato de Prestação de Serviços e Honorários",
    tipo: "honorarios",
    descricao: "Contrato de honorários advocatícios para ação revisional",
    conteudo: `<h1 style="text-align:center;"><strong>CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS E HONORÁRIOS</strong></h1>
<p>&nbsp;</p>
<p>Pelo presente instrumento particular de contrato de prestação de serviços advocatícios, as partes abaixo qualificadas:</p>
<p>&nbsp;</p>
<p><strong>CONTRATANTE:</strong> {{cliente.nome}}, {{cliente.nacionalidade}}, {{cliente.estado_civil}}, {{cliente.profissao}}, portador(a) do RG nº {{cliente.rg}}, inscrito(a) no CPF sob nº {{cliente.cpf_cnpj}}, residente e domiciliado(a) em {{cliente.endereco}}, {{cliente.cidade}}/{{cliente.uf}}, CEP {{cliente.cep}}, e-mail: {{cliente.email}}, telefone: {{cliente.telefone}}.</p>
<p>&nbsp;</p>
<p><strong>CONTRATADO(A):</strong> [Nome do Advogado/Escritório], inscrito(a) na OAB/{{cliente.uf}} sob nº [número], com escritório em [endereço do escritório].</p>
<p>&nbsp;</p>
<p>Têm entre si justo e contratado o seguinte:</p>
<p>&nbsp;</p>
<h2><strong>CLÁUSULA 1ª – DO OBJETO</strong></h2>
<p>O(A) CONTRATADO(A) se obriga a prestar serviços advocatícios ao(à) CONTRATANTE, consistentes no ajuizamento e acompanhamento de AÇÃO REVISIONAL DE CONTRATO BANCÁRIO em face de {{contrato.banco}}, referente ao contrato nº {{contrato.numeroContrato}}, no valor financiado de {{contrato.valorFinanciado}}.</p>
<p>&nbsp;</p>
<h2><strong>CLÁUSULA 2ª – DOS HONORÁRIOS</strong></h2>
<p>Pelos serviços prestados, o(a) CONTRATANTE pagará ao(à) CONTRATADO(A) honorários advocatícios no valor de [valor ou percentual], conforme segue:</p>
<ul>
<li>Entrada: R$ [valor] no ato da assinatura;</li>
<li>Êxito: [percentual]% sobre o proveito econômico obtido.</li>
</ul>
<p>&nbsp;</p>
<h2><strong>CLÁUSULA 3ª – DAS OBRIGAÇÕES DO CONTRATANTE</strong></h2>
<p>O(A) CONTRATANTE se obriga a fornecer todos os documentos necessários, comparecer quando solicitado(a) e manter seus dados atualizados.</p>
<p>&nbsp;</p>
<h2><strong>CLÁUSULA 4ª – DO PRAZO</strong></h2>
<p>O presente contrato vigora até o trânsito em julgado da ação judicial referida na Cláusula 1ª.</p>
<p>&nbsp;</p>
<h2><strong>CLÁUSULA 5ª – DO FORO</strong></h2>
<p>Fica eleito o foro da Comarca de {{cliente.cidade}}/{{cliente.uf}} para dirimir quaisquer questões decorrentes deste contrato.</p>
<p>&nbsp;</p>
<p>E por estarem justos e contratados, firmam o presente em 2 (duas) vias de igual teor.</p>
<p>&nbsp;</p>
<p>{{cliente.cidade}}/{{cliente.uf}}, {{data.hojeExtenso}}.</p>
<p>&nbsp;</p>
<p>_____________________________________________</p>
<p>{{cliente.nome}} – CONTRATANTE</p>
<p>&nbsp;</p>
<p>_____________________________________________</p>
<p>Advogado(a) – OAB – CONTRATADO(A)</p>`,
  },
  {
    id: "declaracao-hipossuficiencia",
    nome: "Declaração de Hipossuficiência",
    tipo: "hipossuficiencia",
    descricao: "Declaração de hipossuficiência econômica para justiça gratuita",
    conteudo: `<h1 style="text-align:center;"><strong>DECLARAÇÃO DE HIPOSSUFICIÊNCIA ECONÔMICA</strong></h1>
<p>&nbsp;</p>
<p>Eu, <strong>{{cliente.nome}}</strong>, {{cliente.nacionalidade}}, {{cliente.estado_civil}}, {{cliente.profissao}}, portador(a) do RG nº {{cliente.rg}}, inscrito(a) no CPF sob nº {{cliente.cpf_cnpj}}, residente e domiciliado(a) em {{cliente.endereco}}, {{cliente.cidade}}/{{cliente.uf}}, CEP {{cliente.cep}},</p>
<p>&nbsp;</p>
<p><strong>DECLARO</strong>, para os devidos fins de direito, sob as penas da lei, que não disponho de condições financeiras para arcar com as custas processuais e honorários advocatícios sem prejuízo do sustento próprio e de minha família, nos termos do art. 98 e seguintes do Código de Processo Civil e do art. 5º, inciso LXXIV, da Constituição Federal.</p>
<p>&nbsp;</p>
<p>Declaro ainda que esta declaração é verdadeira e que estou ciente das sanções legais previstas em caso de falsidade ideológica.</p>
<p>&nbsp;</p>
<p>{{cliente.cidade}}/{{cliente.uf}}, {{data.hojeExtenso}}.</p>
<p>&nbsp;</p>
<p>&nbsp;</p>
<p>_____________________________________________</p>
<p>{{cliente.nome}}</p>
<p>CPF: {{cliente.cpf_cnpj}}</p>`,
  },
  {
    id: "procuracao",
    nome: "Procuração Ad Judicia",
    tipo: "procuracao",
    descricao: "Procuração para representação judicial",
    conteudo: `<h1 style="text-align:center;"><strong>PROCURAÇÃO AD JUDICIA</strong></h1>
<p>&nbsp;</p>
<p>Por este instrumento particular de mandato, eu, <strong>{{cliente.nome}}</strong>, {{cliente.nacionalidade}}, {{cliente.estado_civil}}, {{cliente.profissao}}, portador(a) do RG nº {{cliente.rg}}, inscrito(a) no CPF sob nº {{cliente.cpf_cnpj}}, residente e domiciliado(a) em {{cliente.endereco}}, {{cliente.cidade}}/{{cliente.uf}}, CEP {{cliente.cep}}, e-mail: {{cliente.email}}, telefone: {{cliente.telefone}},</p>
<p>&nbsp;</p>
<p>NOMEIO E CONSTITUO meu(minha) bastante procurador(a) o(a) Dr(a). [Nome do Advogado], inscrito(a) na OAB/{{cliente.uf}} sob nº [número], com escritório em [endereço], a quem confiro amplos e gerais poderes para o foro em geral, com a cláusula "ad judicia", podendo propor contra quem de direito as ações competentes e defendê-me(nos) nas contrárias, seguindo umas e outras até final decisão, usando os recursos legais e acompanhando-os, conferindo-lhe(s) ainda poderes especiais para confessar, reconhecer a procedência do pedido, transigir, desistir, renunciar ao direito sobre que se funda a ação, receber, dar quitação e firmar compromisso (art. 105 do CPC), especialmente para representar-me(nos) em <strong>AÇÃO REVISIONAL DE CONTRATO BANCÁRIO</strong> em face de <strong>{{contrato.banco}}</strong>, referente ao contrato nº {{contrato.numeroContrato}}.</p>
<p>&nbsp;</p>
<p>{{cliente.cidade}}/{{cliente.uf}}, {{data.hojeExtenso}}.</p>
<p>&nbsp;</p>
<p>&nbsp;</p>
<p>_____________________________________________</p>
<p>{{cliente.nome}}</p>
<p>CPF: {{cliente.cpf_cnpj}}</p>`,
  },
  {
    id: "proposta-honorarios",
    nome: "Proposta de Honorários",
    tipo: "proposta",
    descricao: "Proposta comercial de serviços advocatícios para revisão de contrato",
    conteudo: `<h1 style="text-align:center;"><strong>PROPOSTA DE HONORÁRIOS ADVOCATÍCIOS</strong></h1>
<p>&nbsp;</p>
<p><strong>Prezado(a) {{cliente.nome}},</strong></p>
<p>&nbsp;</p>
<p>Apresentamos a seguinte proposta para prestação de serviços advocatícios referentes à revisão do contrato bancário firmado junto a <strong>{{contrato.banco}}</strong>.</p>
<p>&nbsp;</p>
<h2><strong>1. DADOS DO CONTRATO</strong></h2>
<table>
<tr><td><strong>Contrato nº</strong></td><td>{{contrato.numeroContrato}}</td></tr>
<tr><td><strong>Valor Financiado</strong></td><td>{{contrato.valorFinanciado}}</td></tr>
<tr><td><strong>Parcela Atual</strong></td><td>{{contrato.parcela}}</td></tr>
<tr><td><strong>Taxa Mensal Contratada</strong></td><td>{{contrato.taxaMensal}}</td></tr>
<tr><td><strong>Prazo</strong></td><td>{{contrato.prazoMeses}} meses</td></tr>
</table>
<p>&nbsp;</p>
<h2><strong>2. ANÁLISE PRELIMINAR</strong></h2>
<p>Após análise técnica do contrato, identificamos as seguintes irregularidades:</p>
<p>{{tarifas.lista}}</p>
<p>Total em cobranças indevidas: <strong>{{tarifas.total}}</strong></p>
<p>&nbsp;</p>
<h2><strong>3. PROJEÇÃO DE RESULTADOS</strong></h2>
<table>
<tr><td><strong>Prestação Contratada</strong></td><td>{{contrato.parcela}}</td></tr>
<tr><td><strong>Prestação Revisada</strong></td><td>{{calculo.novaPrestacao}}</td></tr>
<tr><td><strong>Redução por Parcela</strong></td><td>{{calculo.diferencaParcela}}</td></tr>
<tr><td><strong>Valores a Receber (pago a mais)</strong></td><td>{{calculo.valoresReceber}}</td></tr>
<tr><td><strong>Economia Total Projetada</strong></td><td>{{calculo.economiaTotal}}</td></tr>
</table>
<p>&nbsp;</p>
<h2><strong>4. HONORÁRIOS</strong></h2>
<p>Para a execução dos serviços propostos, os honorários serão:</p>
<ul>
<li>Entrada: R$ [valor]</li>
<li>Êxito: [percentual]% sobre o proveito econômico obtido</li>
</ul>
<p>&nbsp;</p>
<p>Esta proposta tem validade de 30 dias.</p>
<p>&nbsp;</p>
<p>{{cliente.cidade}}/{{cliente.uf}}, {{data.hojeExtenso}}.</p>
<p>&nbsp;</p>
<p>_____________________________________________</p>
<p>Advogado(a) – OAB</p>`,
  },
  {
    id: "termo-autorizacao",
    nome: "Termo de Autorização",
    tipo: "custom",
    descricao: "Termo de autorização para representação e acesso a dados bancários",
    conteudo: `<h1 style="text-align:center;"><strong>TERMO DE AUTORIZAÇÃO</strong></h1>
<p>&nbsp;</p>
<p>Eu, <strong>{{cliente.nome}}</strong>, {{cliente.nacionalidade}}, {{cliente.estado_civil}}, {{cliente.profissao}}, portador(a) do RG nº {{cliente.rg}}, inscrito(a) no CPF sob nº {{cliente.cpf_cnpj}}, residente e domiciliado(a) em {{cliente.endereco}}, {{cliente.cidade}}/{{cliente.uf}}, CEP {{cliente.cep}},</p>
<p>&nbsp;</p>
<p><strong>AUTORIZO</strong> o(a) Dr(a). [Nome do Advogado], inscrito(a) na OAB/{{cliente.uf}} sob nº [número], a:</p>
<p>&nbsp;</p>
<ol>
<li>Representar-me judicialmente e extrajudicialmente em todos os atos relacionados à revisão do contrato bancário nº {{contrato.numeroContrato}}, firmado com {{contrato.banco}}, no valor financiado de {{contrato.valorFinanciado}};</li>
<li>Solicitar e obter junto a instituições financeiras, órgãos de proteção ao crédito e órgãos públicos quaisquer informações e documentos relacionados ao referido contrato;</li>
<li>Consultar o sistema BACEN – CCS (Cadastro de Clientes do Sistema Financeiro Nacional) e demais bases de dados para fins de instrução processual;</li>
<li>Negociar, transigir e celebrar acordos, sempre mediante minha prévia e expressa anuência;</li>
<li>Praticar todos os atos necessários à defesa de meus interesses no âmbito da presente demanda.</li>
</ol>
<p>&nbsp;</p>
<p>O presente termo tem validade até o trânsito em julgado da ação revisional a ser proposta ou até revogação expressa por minha parte.</p>
<p>&nbsp;</p>
<p>{{cliente.cidade}}/{{cliente.uf}}, {{data.hojeExtenso}}.</p>
<p>&nbsp;</p>
<p>&nbsp;</p>
<p>_____________________________________________</p>
<p>{{cliente.nome}}</p>
<p>CPF: {{cliente.cpf_cnpj}}</p>`,
  },
];
