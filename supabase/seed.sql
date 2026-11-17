-- =====================================================================
-- GO Bunker! · Dados iniciais
-- Modelos de mensagem do GO CL e modelo padrão de contrato.
-- Rodado automaticamente pelo `supabase db reset` no ambiente local.
-- Em produção, rode uma vez pelo SQL Editor (ou ajuste pelo sistema).
-- =====================================================================

insert into public.message_templates (name, stage, channel, subject, body) values
(
  'Primeiro contato · WhatsApp', 'abordado', 'whatsapp', null,
  'Oi, {{contato}}! Tudo certo? Aqui é da {{agencia}}. Acompanhei o trabalho da {{empresa}} e vi bastante espaço pra fortalecer a presença de vocês no digital. Posso te mostrar em 10 minutos algumas ideias que pensei pra vocês?'
),
(
  'Primeiro contato · Instagram', 'abordado', 'instagram', null,
  'Oi, {{contato}}! Curti muito o perfil da {{empresa}}. Sou da {{agencia}}, a gente trabalha com conteúdo, campanhas e identidade visual pra empresas de {{segmento}}. Topa uma conversa rápida?'
),
(
  'Primeiro contato · E-mail', 'abordado', 'email', 'Ideias para a {{empresa}}',
  E'Olá, {{contato}}, tudo bem?\n\nSou da {{agencia}}. Analisei a comunicação da {{empresa}} e separei algumas oportunidades para gerar mais alcance e vendas.\n\nPodemos marcar 15 minutos esta semana para eu apresentar?\n\nAbraço!'
),
(
  'Follow-up · sem resposta', 'cativando', 'whatsapp', null,
  'Oi, {{contato}}! Passando pra saber se conseguiu ver minha mensagem. Separei um exemplo de campanha que funcionaria bem pra {{empresa}}, posso te mandar?'
),
(
  'Convite para briefing', 'briefing', 'whatsapp', null,
  '{{contato}}, pra montar uma proposta certeira pra {{empresa}}, quero entender melhor os objetivos de vocês. Bora marcar uma reunião de briefing de 30 minutos? Me diz o melhor dia e horário.'
),
(
  'Envio de proposta', 'proposta', 'email', 'Proposta {{agencia}} para a {{empresa}}',
  E'Olá, {{contato}}!\n\nConforme conversamos no briefing, segue a proposta com escopo, cronograma e investimento.\n\nFico à disposição para ajustar o que for preciso.\n\nAbraço!'
);

insert into public.contract_templates (name, is_default, body) values (
  'Prestação de serviços de marketing e comunicação', true,
$md$
# CONTRATO DE PRESTAÇÃO DE SERVIÇOS Nº {{numero}}

**CONTRATADA:** GO Bunker! Mídia e Tecnologia, inscrita sob o documento {{agencia_documento}}, com endereço em {{agencia_endereco}}, doravante denominada CONTRATADA.

**CONTRATANTE:** {{contratante_nome}}, inscrita sob o documento {{contratante_documento}}, com endereço em {{contratante_endereco}}, doravante denominada CONTRATANTE.

As partes acima identificadas firmam o presente contrato, que se regerá pelas cláusulas a seguir.

## CLÁUSULA 1 · OBJETO

A CONTRATADA prestará à CONTRATANTE os serviços descritos abaixo:

{{escopo}}

## CLÁUSULA 2 · VALORES E PAGAMENTO

{{valores}}

O pagamento será realizado até o dia {{dia_pagamento}} de cada mês. Atrasos estarão sujeitos a multa de 2% e juros de 1% ao mês, calculados *pro rata die*.

## CLÁUSULA 3 · VIGÊNCIA

Este contrato entra em vigor em {{data_inicio}}, com duração de {{duracao_meses}} meses, renovando-se automaticamente por igual período caso nenhuma das partes se manifeste em contrário com 30 dias de antecedência.

## CLÁUSULA 4 · OBRIGAÇÕES DA CONTRATADA

a) Executar os serviços com qualidade técnica e dentro dos prazos acordados;
b) Manter a CONTRATANTE informada sobre o andamento dos trabalhos pelo portal GO THERE;
c) Guardar sigilo sobre informações estratégicas da CONTRATANTE.

## CLÁUSULA 5 · OBRIGAÇÕES DA CONTRATANTE

a) Fornecer informações, materiais e aprovações necessárias dentro dos prazos;
b) Efetuar os pagamentos nas datas acordadas;
c) Indicar um responsável para aprovações.

## CLÁUSULA 6 · APROVAÇÕES E ALTERAÇÕES

Cada peça terá até 2 (duas) rodadas de ajuste incluídas. Alterações adicionais ou fora do escopo serão orçadas à parte.

## CLÁUSULA 7 · PROPRIEDADE INTELECTUAL

Após a quitação integral, os direitos de uso das peças aprovadas passam à CONTRATANTE. Arquivos abertos e materiais não aprovados permanecem com a CONTRATADA, salvo acordo por escrito.

## CLÁUSULA 8 · PROTEÇÃO DE DADOS (LGPD)

As partes se comprometem a tratar dados pessoais de acordo com a Lei nº 13.709/2018 (LGPD), utilizando-os apenas para a execução deste contrato e adotando medidas de segurança adequadas.

## CLÁUSULA 9 · RESCISÃO

Qualquer das partes poderá rescindir este contrato mediante aviso prévio de 30 dias. Serviços já executados e não pagos serão devidos integralmente.

{{clausulas_extras}}

## CLÁUSULA 10 · FORO

Fica eleito o foro da comarca de {{cidade_foro}} para dirimir quaisquer questões oriundas deste contrato.

{{cidade_foro}}, {{data_hoje}}.

&nbsp;

______________________________________
**GO Bunker! Mídia e Tecnologia** · CONTRATADA

&nbsp;

______________________________________
**{{contratante_nome}}** · CONTRATANTE
$md$
);
