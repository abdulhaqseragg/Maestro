# Maestro - Smart Financial Orchestration PWA

<div align="center">
<img width="1200" height="475" alt="Maestro Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

## 🎯 نظرة عامة

تطبيق Maestro هو تطبيق ويب تقدمي (PWA) لإدارة الشؤون المالية بذكاء، يدعم العمل في وضع عدم الاتصال بالإنترنت مع مزامنة البيانات تلقائياً.

## ✨ الميزات

- **إدارة مالية شاملة**: حسابات، معاملات، التزامات، ميزانيات، أهداف
- **دعم PWA**: تثبيت على الهواتف والأجهزة
- **عمل offline**: يعمل بدون اتصال بالإنترنت
- **مزامنة تلقائية**: مزامنة البيانات عند عودة الاتصال
- **دعم متعدد اللغات**: العربية والإنجليزية
- **ذكاء اصطناعي**: تحليلات مالية ذكية

## 🚀 التشغيل المحلي

**المتطلبات:** Node.js

1. تثبيت التبعيات:
   ```bash
   npm install
   ```

2. إعداد مفتاح Gemini API في [.env.local](.env.local)

3. تشغيل التطبيق:
   ```bash
   npm run dev
   ```

## 🌐 النشر كـ PWA

### إعداد الأيقونات
قم بإنشاء أيقونات بأحجام مختلفة في `public/icons/`:
- 72x72.png, 96x96.png, 128x128.png, 144x144.png
- 152x152.png, 192x192.png, 384x384.png, 512x512.png

### خيارات النشر

#### 1. Vercel (موصى به)
```bash
npm install -g vercel
vercel --prod
```

#### 2. Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod
```

#### 3. Firebase Hosting
```bash
npm install -g firebase-tools
firebase init hosting
firebase deploy
```

#### 4. GitHub Pages
```bash
npm install -g gh-pages
npm run build
npm run deploy
```

## 🔧 إعداد المتغيرات البيئية

انسخ `.env.example` إلى `.env.local`:

```bash
cp .env.example .env.local
```

### المتغيرات المتاحة:
- `VITE_API_BASE_URL`: رابط API الخادم (اختياري)
- `VITE_ENABLE_SYNC`: تفعيل المزامنة مع الخادم
- `VITE_ENABLE_OFFLINE_MODE`: تفعيل وضع offline
- `VITE_APP_VERSION`: إصدار التطبيق

## 📱 كيفية استخدام PWA

### التثبيت
1. افتح الموقع في متصفح Chrome/Edge
2. انقر على "تثبيت التطبيق" أو أيقونة التثبيت
3. سيتم تثبيت التطبيق على جهازك

### العمل Offline
- التطبيق يعمل بالكامل بدون اتصال
- التغييرات محفوظة محلياً
- المزامنة تحدث تلقائياً عند عودة الاتصال

## 🛠️ التطوير

### البناء للإنتاج
```bash
npm run build
```

### اختبار PWA
```bash
npm run preview
```

### تنظيف البيانات المحلية
```javascript
// في Console المتصفح
localStorage.clear();
indexedDB.deleteDatabase('MaestroDB');
```

## 📋 دليل النشر التفصيلي

راجع [دليل النشر](PWA_DEPLOYMENT_GUIDE.md) للحصول على تعليمات مفصلة.

## 🔒 الأمان

- تشفير البيانات المحلية
- حماية الجلسات
- عدم إرسال بيانات حساسة بدون تشفير

## 🤝 المساهمة

نرحب بالمساهمات! يرجى قراءة دليل المساهمة قبل البدء.

## 📄 الترخيص

هذا المشروع مرخص تحت رخصة MIT.
