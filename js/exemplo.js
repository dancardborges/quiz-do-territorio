// Quiz pronto: "Descobrindo Nossos Tesouros – Mapeio de Ativos"
const q = (text, options, correct, time = 20, extra = {}) => ({ type: 'quiz', text, options, correct: [correct], time, points: 'standard', ...extra });

export const EXEMPLO = {
  title: 'Descobrindo Nossos Tesouros – Mapeio de Ativos',
  description: 'Encontro de ACS e APA – Atenção Primária à Saúde',
  questions: [
    q('O que é um "ativo" para a saúde?', ['Pessoa, lugar ou atividade que ajuda a manter a saúde', 'Um remédio da farmácia da UBS', 'Um equipamento do consultório', 'Um paciente com doença crônica'], 0, 30),
    q('Em quais 3 grupos dividimos os nossos "tesouros"?', ['Pessoas, Espaços e Atividades', 'Médicos, Enfermeiros e ACS', 'Remédios, Exames e Consultas', 'Escolas, Igrejas e Hospitais'], 0),
    q('Na "Visão Antiga", o foco era na doença e no risco. E na "Nova Visão"?', ['Na força, na potência e no que gera vida', 'No número de consultas feitas', 'Em achar mais doenças no bairro', 'Só nos exames de rotina'], 0),
    q('A vizinha solidária, famosa por dar bons conselhos, é um ativo de qual grupo?', ['Pessoas', 'Espaços', 'Atividades', 'Não é um ativo'], 0, 10),
    q('A quadra esportiva da escola é um ativo de qual grupo?', ['Pessoas', 'Espaços', 'Atividades', 'Não é um ativo'], 1, 10),
    q('A roda de crochê na garagem de alguém é um ativo de qual grupo?', ['Pessoas', 'Espaços', 'Atividades', 'Não conta, porque é informal'], 2, 10),
    { type: 'tf', text: 'O mapa de ativos é só uma lista de endereços do bairro.', options: ['Verdadeiro', 'Falso'], correct: [1], time: 20, points: 'standard' },
    q('Quantas pessoas entrevistadas NÃO praticam nenhuma atividade física?', ['12%', '35%', '50%', '71,5%'], 3),
    q('Quase 12% dos usuários vivem em isolamento extremo. Isso quer dizer:', ['Conversar com no máximo 3 pessoas por dia', 'Morar sozinho em zona rural', 'Não ter celular', 'Não ir à UBS há um ano'], 0),
    q('Qual é o público-alvo prioritário do Mapeio de Ativos?', ['Pessoas com hipertensão', 'Gestantes', 'Crianças em idade escolar', 'Todos os moradores ao mesmo tempo'], 0),
    q('Quem aplica o formulário de escuta nas visitas do território?', ['ACS e APA, junto com a equipe de saúde', 'Só o médico', 'Só a gerência da UBS', 'A própria Secretaria de Saúde'], 0),
    q('Durante a Escuta Ativa, onde registramos os tesouros citados pelos moradores?', ['No formulário do FastMedic (prontuário eletrônico)', 'Num caderno pessoal', 'Em um grupo de WhatsApp', 'Não precisa registrar'], 0),
    q('A Prescrição Social (Referência Comunitária) é registrada em qual plano do paciente?', ['No Projeto Terapêutico Singular (PTS)', 'Na receita de medicamentos', 'Na ficha de vacinação', 'Em lugar nenhum, é só uma dica'], 0, 30),
    q('Se a praça está insegura por causa da violência, qual ativo priorizar?', ['Ativos protegidos: ONGs, igrejas, associações e a UBS', 'Continuar indicando a praça mesmo assim', 'Desistir da prescrição social', 'Só aumentar a medicação'], 0, 30),
    q('De quanto em quanto tempo a Carteira de Ativos deve ser atualizada?', ['Todo mês', 'A cada 6 meses', 'A cada 3 anos', 'Nunca, uma vez feita está pronta'], 1),
    q('Qual é a grande mensagem do Mapeio de Ativos?', ['A verdadeira saúde se constrói em comunidade', 'Saúde se resolve só com remédio', 'O ACS deve preencher mais formulários', 'O território só traz problemas'], 0, 30, { points: 'double' }),
  ],
};
