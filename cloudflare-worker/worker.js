// worker.js — يُرفع على Cloudflare Workers
export default {
  async fetch(request, env) {
    // ── CORS ──────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    if (request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    // ── استلام الـ context من الفرونت إند ─────────────
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { context, requestType, userMessage } = body;

    // ── التحقق من وجود context ────────────────────────
    if (!context?.balances) {
      return Response.json({ error: 'Context مطلوب ومجهول المصدر' }, { status: 400 });
    }

    // ── بناء الـ prompt حسب نوع الطلب ────────────────
    const prompt = buildPrompt(context, requestType, userMessage);

    // ── استدعاء Gemini (المفتاح من Cloudflare Secrets) ─
    if (!env.GEMINI_API_KEY) {
      return Response.json({ error: 'GEMINI_API_KEY is not configured in worker environment' }, { status: 500 });
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    // ── تحليل الرد وإرجاعه منظماً ────────────────────
    try {
      if (!rawText) throw new Error("Empty response from Gemini");
      
      const parsed = JSON.parse(rawText);
      return Response.json(
        { message: parsed.message, action: parsed.action, data: parsed.data ?? null },
        { headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    } catch {
      return Response.json({ error: 'فشل تحليل رد Gemini', raw: rawText }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
  }
};

// ── بناء الـ Prompt حسب نوع الطلب ──────────────────────
function buildPrompt(context, type, userMessage) {
  const ctx = JSON.stringify(context, null, 2);
  const prompts = {
    forecast: `أنت محلل مالي. بناءً على السياق التالي توقع مصروفات الشهر القادم.`,
    advice: `أنت مستشار مالي. قدم 3 نصائح عملية وقابلة للتطبيق فوراً.`,
    alert: `أنت نظام تنبيه مالي. هل هناك شيء غير عادي يستحق تنبيه المستخدم؟`,
    chat: `أنت المستشار المالي لتطبيق Maestro. أجب على سؤال المستخدم التالي بناءً على السياق المالي الخاص به بإيجاز واحترافية.\nسؤال المستخدم: ${userMessage || ''}`
  };
  
  const base = prompts[type] ?? prompts.advice;
  
  return `${base}

السياق المالي:
${ctx}

رد بـ JSON فقط بهذا الشكل:
{
  "message": "رسالة واضحة للمستخدم بالعربية",
  "action": "اسم الإجراء المقترح (forecast|save|alert|none)",
  "data": { /* أي بيانات إضافية مفيدة */ }
}`;
}
