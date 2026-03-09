# دليل إنشاء حساب الإدمن الأول

## الطريقة الأولى: إنشاء حساب عادي ثم تحويله لإدمن

### الخطوة 1: إعداد Supabase
1. انتقل إلى [supabase.com](https://supabase.com)
2. أنشئ مشروع جديد
3. انسخ Project URL و API Key إلى `.env.local`

### الخطوة 2: تشغيل SQL Schema
1. في لوحة تحكم Supabase، انتقل إلى SQL Editor
2. انسخ محتوى `supabase-schema.sql` والصقه
3. اضغط "Run"

### الخطوة 3: إنشاء حساب الإدمن الأول
1. شغل التطبيق: `npm run dev`
2. في المتصفح، انتقل إلى `http://localhost:3002`
3. **لكن انتظر!** لا يمكنك التسجيل الآن لأننا أزلنا التسجيل الذاتي

### بدلاً من ذلك، استخدم هذه الطريقة:

## الطريقة الثانية: إنشاء الإدمن من خلال Supabase Dashboard (الأسهل)

### الخطوة 1: إعداد Supabase
1. أنشئ مشروع Supabase جديد
2. انسخ URL و API Key إلى `.env.local`

### الخطوة 2: إنشاء المستخدم من Dashboard
1. في Supabase Dashboard، انتقل إلى **Authentication → Users**
2. اضغط **"Add user"**
3. أدخل:
   - **Email**: `admin@maestro.com` (أو أي بريد إلكتروني تريده)
   - **Password**: `Admin123!` (أو أي كلمة مرور قوية)
   - **Auto confirm user**: ✅ فعل هذا
4. اضغط **"Create user"**

### الخطوة 3: تشغيل SQL Schema
1. انتقل إلى **SQL Editor**
2. انسخ محتوى `supabase-schema.sql` والصقه
3. اضغط **"Run"**

### الخطوة 4: تحويل المستخدم لإدمن
1. في **SQL Editor**، شغل هذا الكود:
```sql
UPDATE users
SET role = 'ADMIN'
WHERE email = 'admin@maestro.com';
```

### الخطوة 5: تسجيل الدخول
1. شغل التطبيق: `npm run dev`
2. في المتصفح: `http://localhost:3002`
3. سجل دخولاً باستخدام:
   - **البريد الإلكتروني**: `admin@maestro.com`
   - **كلمة المرور**: `Admin123!`

## الطريقة الثالثة: استخدام API لإنشاء الإدمن

إذا كنت تريد إنشاء الإدمن برمجياً:

```javascript
// في console المتصفح أو ملف منفصل
import { supabase } from './src/services/supabaseClient';

async function createAdmin() {
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@maestro.com',
    password: 'Admin123!'
  });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Admin created:', data);
    // ثم شغل SQL لتحديث الدور
  }
}
```

## بيانات تسجيل الدخول الافتراضية:

**البريد الإلكتروني**: `admin@maestro.com`
**كلمة المرور**: `Admin123!`

## ملاحظات مهمة:

1. **تأكد من إعداد متغيرات البيئة** في `.env.local`
2. **فعل التحقق التلقائي** في Supabase Auth settings
3. **شغل SQL schema** قبل محاولة تسجيل الدخول
4. **تحقق من وجود tab "Users"** في القائمة بعد تسجيل الدخول كإدمن

## استكشاف الأخطاء:

### إذا ظهر "Failed to fetch":
- تأكد من صحة متغيرات البيئة
- تأكد من تشغيل SQL schema

### إذا لم يظهر tab "Users":
- تأكد من أن الدور هو "ADMIN" في قاعدة البيانات
- أعد تحميل الصفحة

### إذا ظهرت أخطاء أخرى:
- تحقق من console المتصفح
- تأكد من تشغيل `npm install` و `npm run dev`