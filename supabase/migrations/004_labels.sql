-- =============================================================================
-- 004 — rótulos legíveis para os textos restantes
-- Sem eles o painel exibe a chave crua (form.eShort), que não diz nada a quem
-- está editando.
-- =============================================================================
update public.site_text set label = v.label
from (values
  ('about.panel.position','Quadro lateral: rótulo "Cargo"'),
  ('about.panel.positionV','Quadro lateral: seu cargo'),
  ('about.panel.unit','Quadro lateral: rótulo "Lotação"'),
  ('about.panel.unitV','Quadro lateral: sua lotação'),
  ('about.panel.program','Quadro lateral: rótulo "Curso"'),
  ('about.panel.programV','Quadro lateral: seu curso'),
  ('about.panel.degree','Quadro lateral: rótulo "Titulação"'),
  ('about.panel.degreeV','Quadro lateral: sua titulação'),
  ('about.panel.areas','Quadro lateral: rótulo "Áreas de atuação"'),
  ('about.panel.ids','Quadro lateral: rótulo "Identificadores"'),
  ('about.p1','Biografia — parágrafo 1'),
  ('about.p2','Biografia — parágrafo 2'),
  ('about.p3','Biografia — parágrafo 3'),
  ('hero.eyebrow','Linha acima do nome'),
  ('hero.caption','Legenda sob a foto'),
  ('meta.title','Título da aba do navegador'),
  ('meta.description','Descrição para buscadores'),
  ('pubs.note','Nota ao pé das publicações'),
  ('contact.lede','Texto de abertura do contato'),
  ('footer.tagline','Resumo no rodapé'),

  ('form.name','Campo: rótulo do nome'),
  ('form.namePh','Campo: dica dentro do nome'),
  ('form.email','Campo: rótulo do e-mail'),
  ('form.emailPh','Campo: dica dentro do e-mail'),
  ('form.org','Campo: rótulo da instituição'),
  ('form.orgPh','Campo: dica dentro da instituição'),
  ('form.reason','Campo: rótulo do motivo'),
  ('form.reasonPh','Campo: opção vazia do motivo'),
  ('form.r1','Motivo 1'),
  ('form.r2','Motivo 2'),
  ('form.r3','Motivo 3'),
  ('form.r4','Motivo 4'),
  ('form.r5','Motivo 5'),
  ('form.message','Campo: rótulo da mensagem'),
  ('form.messagePh','Campo: dica dentro da mensagem'),
  ('form.submit','Texto do botão de envio'),
  ('form.sending','Botão enquanto envia'),
  ('form.hint','Aviso ao lado do botão'),
  ('form.ok','Aviso de envio bem-sucedido'),
  ('form.err','Aviso de falha no envio'),
  ('form.mailto','Aviso quando abre o programa de e-mail'),
  ('form.eRequired','Erro: campo obrigatório'),
  ('form.eEmail','Erro: e-mail inválido'),
  ('form.eShort','Erro: mensagem curta demais')
) as v(key, label)
where site_text.key = v.key;
