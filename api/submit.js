export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const {
    nome, email, idade, estado_civil, religiao,
    area_foco, comprometimento, motivacao, resultado_esperado,
    obstaculo, visao_futura, algo_importante, responsabilidade,
    orientacoes, relacao_deus, vida_oracao, pesos_espirituais,
    expectativa_deus, mentoria_anterior, mentoria_anterior_detalhe
  } = req.body || {};

  if (!nome || !email) {
    return res.status(422).json({ error: 'Campos obrigatórios ausentes.' });
  }

  const SUPABASE_URL    = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  const RESEND_API_KEY  = process.env.RESEND_API_KEY;

  // 1. Salvar no Supabase
  const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/mentoria_alinhamento`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      nome, email,
      idade: idade ? parseInt(idade) : null,
      estado_civil, religiao,
      area_foco: Array.isArray(area_foco) ? area_foco : (area_foco ? [area_foco] : []),
      comprometimento: comprometimento ? parseInt(comprometimento) : null,
      motivacao, resultado_esperado, obstaculo, visao_futura,
      algo_importante, responsabilidade, orientacoes,
      relacao_deus, vida_oracao,
      pesos_espirituais: Array.isArray(pesos_espirituais) ? pesos_espirituais : (pesos_espirituais ? [pesos_espirituais] : []),
      expectativa_deus, mentoria_anterior, mentoria_anterior_detalhe
    })
  });

  if (!dbRes.ok) {
    const err = await dbRes.text();
    console.error('Supabase error:', err);
    return res.status(500).json({ error: 'Erro ao salvar no banco.' });
  }

  // 2. Enviar email via Resend
  const areas = Array.isArray(area_foco) ? area_foco.join(', ') : (area_foco || '—');
  const pesos = Array.isArray(pesos_espirituais) ? pesos_espirituais.join(', ') : (pesos_espirituais || 'Nenhum selecionado');

  const row = (label, value) => value ? `
    <tr>
      <td style="padding:10px 16px;background:#f5f0e8;font-family:Georgia,serif;font-size:13px;color:#6b5c45;font-weight:bold;width:220px;vertical-align:top;border-bottom:1px solid #ede5d4;">${label}</td>
      <td style="padding:10px 16px;font-family:Georgia,serif;font-size:14px;color:#2e2416;vertical-align:top;border-bottom:1px solid #ede5d4;">${String(value).replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td>
    </tr>` : '';

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#ede5d4;font-family:Georgia,serif;">
      <div style="max-width:680px;margin:40px auto;background:#fdfaf5;border:1px solid rgba(184,151,90,0.2);">
        <div style="background:#3d3020;padding:36px;text-align:center;">
          <p style="font-family:Georgia,serif;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#b8975a;margin:0 0 8px;">Novo Formulário Recebido</p>
          <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:300;color:#f5f0e8;margin:0;">Alinhamento de Expectativa</h1>
          <p style="font-size:11px;letter-spacing:3px;color:#a3b496;margin:10px 0 0;font-family:Arial,sans-serif;">Mentoria · ${nome}</p>
        </div>
        <div style="padding:32px;">
          <p style="font-family:Georgia,serif;font-size:15px;color:#5c4a2a;font-style:italic;margin-bottom:24px;">Uma nova participante preencheu o formulário de alinhamento. Aqui estão as respostas:</p>
          <table style="width:100%;border-collapse:collapse;border:1px solid #ede5d4;">
            ${row('Nome', nome)}
            ${row('E-mail', email)}
            ${row('Idade', idade)}
            ${row('Estado civil', estado_civil)}
            ${row('Religião / Fé', religiao)}
            ${row('Áreas de foco', areas)}
            ${row('Comprometimento', comprometimento + ' / 10')}
            ${row('Motivação', motivacao)}
            ${row('Resultado esperado', resultado_esperado)}
            ${row('Maior obstáculo', obstaculo)}
            ${row('Visão de futuro', visao_futura)}
            ${row('Algo importante a saber', algo_importante)}
            ${row('Decisões ou fatores externos', responsabilidade)}
            ${row('Disposta a seguir orientações', orientacoes)}
            ${row('Relação com Deus', relacao_deus)}
            ${row('Vida de oração', vida_oracao)}
            ${row('Pesos espirituais', pesos)}
            ${row('Expectativa espiritual', expectativa_deus)}
            ${row('Mentoria anterior', mentoria_anterior)}
            ${mentoria_anterior_detalhe ? row('Detalhe mentoria anterior', mentoria_anterior_detalhe) : ''}
          </table>
        </div>
        <div style="background:#f5f0e8;padding:24px;text-align:center;border-top:1px solid #ede5d4;">
          <p style="font-family:Georgia,serif;font-size:13px;color:#7a8c6e;font-style:italic;margin:0;">Enviado automaticamente · Alinhamento de Expectativa</p>
        </div>
      </div>
    </body>
    </html>`;

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: 'Alinhamento de Expectativa <noreply@danielaalecrim.com.br>',
      to: ['danielaalecrimterapeuta@gmail.com'],
      subject: `Nova participante: ${nome}`,
      html: emailHtml
    })
  });

  if (!emailRes.ok) {
    const err = await emailRes.text();
    console.error('Resend error:', err);
    return res.status(200).json({ success: true, warning: 'Dados salvos, mas email falhou.' });
  }

  return res.status(200).json({ success: true });
}
