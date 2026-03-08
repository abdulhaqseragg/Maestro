# إعداد Supabase للتطبيق

## الخطوات المطلوبة لحل مشكلة "Failed to fetch":

### 1. إنشاء مشروع Supabase
1. انتقل إلى [supabase.com](https://supabase.com)
2. أنشئ حساب جديد أو سجل دخولك
3. اضغط "New Project"
4. املأ التفاصيل:
   - Name: Maestro SaaS
   - Database Password: (اختر كلمة مرور قوية)
   - Region: اختر المنطقة الأقرب لك

### 2. الحصول على مفاتيح API
بعد إنشاء المشروع:
1. انتقل إلى Settings → API
2. انسخ:
   - Project URL
   - anon/public key

### 3. تحديث متغيرات البيئة
في ملف `.env.local`:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. تشغيل SQL Schema
1. في لوحة تحكم Supabase، انتقل إلى SQL Editor
2. انسخ محتوى ملف `supabase-schema.sql` والصقه
3. اضغط "Run" لإنشاء الجداول والأمان

### 5. تكوين Authentication
1. انتقل إلى Authentication → Settings
2. تأكد من أن:
   - Enable email confirmations: ON
   - Site URL: أضف رابط موقعك (مثل: https://your-app.vercel.app)

### 6. اختبار التطبيق
```bash
npm run dev
```

الآن يجب أن يعمل تسجيل المستخدمين بدون مشاكل!