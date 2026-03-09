# استكشاف أخطاء شاشة فارغة بعد تسجيل الدخول

## المشكلة
بعد تسجيل الدخول بنجاح، يظهر التطبيق شاشة فارغة بدلاً من عرض المحتوى.

## الأسباب المحتملة والحلول

### 1. المستخدم غير موجود في جدول `users`
**الأعراض:** تسجيل الدخول ناجح لكن لا يتم تحميل البيانات
**الحل:**
```sql
-- شغل هذا في Supabase SQL Editor
INSERT INTO users (id, email, username, role, created_at, updated_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1), 'User'),
  'USER',
  au.created_at,
  NOW()
FROM auth.users au
WHERE au.email = 'your-email@example.com'
  AND NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = au.id
  );
```

### 2. متغيرات البيئة غير صحيحة
**الأعراض:** "Failed to fetch" في console
**الحل:**
- تأكد من أن `.env.local` يحتوي على:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. عدم وجود بيانات scopedState
**الأعراض:** `scopedState` يساوي null
**الحل:**
- افتح Developer Tools (F12)
- اذهب إلى Console
- ابحث عن رسائل `[App]` لترى ما يحدث

### 4. خطأ في تحميل البيانات من Supabase
**الأعراض:** أخطاء في console تتعلق بـ Supabase
**الحل:**
- تأكد من تشغيل SQL schema في Supabase
- تأكد من تفعيل Row Level Security

## خطوات استكشاف الأخطاء

### 1. فتح Developer Tools
- اضغط F12 أو Ctrl+Shift+I
- اذهب إلى تبويب Console

### 2. مراقبة الرسائل
يجب أن ترى رسائل مثل:
```
[LoginSaaS] Auth state change: SIGNED_IN user-id
[LoginSaaS] User signed in, data loaded: {...}
[App] handleLogin called with user: {...}
[App] Creating scopedState for user: {...}
[App] scopedState created: {...}
[App] renderContent called, scopedState: {...}
```

### 3. إذا لم تظهر الرسائل
- تأكد من أن متغيرات البيئة صحيحة
- تأكد من وجود المستخدم في جدول `users`

### 4. إذا ظهرت أخطاء
- انسخ الخطأ وشاركه للحصول على المساعدة

## إصلاح سريع للإدمن

إذا كنت تستخدم `admin@maestro.com`:

```sql
-- في Supabase SQL Editor
INSERT INTO users (id, email, username, role, created_at, updated_at)
SELECT
  au.id,
  au.email,
  'Admin',
  'ADMIN',
  au.created_at,
  NOW()
FROM auth.users au
WHERE au.email = 'admin@maestro.com'
  AND NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = au.id
  );
```

## إعادة تشغيل التطبيق

```bash
# أوقف الخادم (Ctrl+C)
npm run dev
```

ثم جرب تسجيل الدخول مرة أخرى.