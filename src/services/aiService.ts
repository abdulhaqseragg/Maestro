import FinancialDataExtractor, { FinancialContext } from './dataExtractor';

// Should ideally use an environment variable for the worker URL. 
const WORKER_URL = String((import.meta as any).env?.VITE_AI_WORKER_URL || '').trim();
const USE_MOCK = String((import.meta as any).env?.VITE_USE_MOCK_AI || '').trim() === 'true';

export interface AIResponse {
  message: string;
  action: 'forecast' | 'save' | 'alert' | 'none' | string;
  data: any;
}

class AIService {
  /**
   * الدالة الموحدة — كل طلبات AI تمر من هنا
   */
  static async analyze(rawData: any, requestType: string = 'advice', userMessage?: string): Promise<AIResponse> {
    if (USE_MOCK) {
      return this._getMockResponse(requestType);
    }

    if (!WORKER_URL) {
      console.warn("VITE_AI_WORKER_URL is missing. AI features will not work.");
      return { message: "وضع الذكاء الاصطناعي غير متصل حالياً.", action: "none", data: null };
    }

    // 1. استخلاص وتجهيز الـ context
    const context = FinancialDataExtractor.extract(rawData);
    
    const payload: any = { context, requestType };
    if (userMessage) payload.userMessage = userMessage;

    // 2. إرسال للـ Worker فقط (لا اتصال مباشر بـ Google)
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error ?? 'خطأ في الاتصال بالـ Worker');
    }
    
    return await response.json() as AIResponse;
  }

  // ── Shortcuts ──────────────────────────────────────
  static forecast(rawData: any) {
    return this.analyze(rawData, 'forecast');
  }

  static getAdvice(rawData: any) {
    return this.analyze(rawData, 'advice');
  }

  static checkAlerts(rawData: any) {
    return this.analyze(rawData, 'alert');
  }

  static askAdvisor(rawData: any, userMessage: string) {
    return this.analyze(rawData, 'chat', userMessage);
  }

  // ── دالة المحاكاة (Mock Response) ────────────────────
  private static async _getMockResponse(type: string): Promise<AIResponse> {
    // محاكاة تأخير الشبكة لمدة 1.5 ثانية (Network Latency)
    await new Promise(resolve => setTimeout(resolve, 1500));

    switch (type) {
      case 'advice':
        return {
          message: "هذه نصيحة وضع المحاكاة: معدل إنفاقك هذا الأسبوع ممتاز مقارنة بالشهر الماضي. استمر في هذا الأداء الرائع!",
          action: "save",
          data: null
        };
      case 'chat':
        return {
          message: "أهلاً بك! أنا المستشار المالي أعمل الآن في وضع المحاكاة (Mock Mode) للحفاظ على باقتك المجانية. واجهة المحادثة تعمل بامتياز!",
          action: "none",
          data: null
        };
      case 'forecast':
        return {
          message: "في وضع المحاكاة: نتوقع زيادة المصروفات الأسبوع القادم بنسبة 5%، يرجى الاستعداد.",
          action: "forecast",
          data: null
        };
      case 'alert':
        return {
          message: "تنبيه وهمي: هناك معاملة غير اعتيادية بقيمة أعلى من المعتاد. يرجى المراجعة.",
          action: "alert",
          data: null
        };
      default:
        return {
          message: "هذا رد افتراضي من وضع المحاكاة.",
          action: "none",
          data: null
        };
    }
  }
}

export default AIService;
