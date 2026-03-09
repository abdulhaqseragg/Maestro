# Maestro SaaS - Admin-Only User Registration Setup

## Overview
تم تعديل التطبيق ليصبح نظام SaaS حيث يمكن للإدمن فقط إنشاء حسابات المستخدمين. تم إلغاء ميزة التسجيل الذاتي للمستخدمين.

## Changes Made

### 1. Login System Changes
- ✅ إزالة زر "Create Account" من صفحة تسجيل الدخول
- ✅ تبسيط واجهة تسجيل الدخول للمستخدمين الموجودين فقط
- ✅ إضافة رسالة توضيحية للاتصال بالإدمن لإنشاء حساب

### 2. Admin User Management
- ✅ إنشاء مكون `AdminUserManagement.tsx` لإدارة المستخدمين
- ✅ إضافة صفحة إدارة مستخدمين تظهر فقط للإدمن
- ✅ إمكانية إنشاء مستخدمين جدد من قبل الإدمن
- ✅ إمكانية تغيير أدوار المستخدمين (USER ↔ ADMIN)
- ✅ إمكانية حذف المستخدمين

### 3. Database Schema
- ✅ حقل `role` موجود في جدول `users` (USER/ADMIN)
- ✅ Row Level Security (RLS) مفعل لعزل البيانات

## Setup Instructions

### 1. Supabase Setup
اتبع التعليمات في `SUPABASE_SETUP.md` لإعداد مشروع Supabase.

### 2. Create Admin User
بعد إنشاء المشروع وتشغيل SQL schema:

1. سجل حساباً جديداً من خلال التطبيق (سيكون أول مستخدم)
2. أو أنشئ مستخدماً من خلال Supabase Auth Dashboard
3. شغل SQL التالي في SQL Editor:

```sql
UPDATE users
SET role = 'ADMIN'
WHERE id = (
  SELECT id FROM users
  ORDER BY created_at ASC
  LIMIT 1
);
```

### 3. Admin Features
بعد تسجيل الدخول كإدمن:
- ستظهر لك تبويب "Users" في القائمة الجانبية
- يمكنك إنشاء مستخدمين جدد
- يمكنك إدارة أدوار المستخدمين
- يمكنك حذف المستخدمين

## User Roles

### ADMIN
- إمكانية الوصول إلى جميع الميزات
- إمكانية إدارة المستخدمين
- إمكانية إنشاء وحذف وتعديل المستخدمين

### USER
- إمكانية الوصول إلى الميزات المالية الأساسية
- لا يمكنه إدارة المستخدمين
- بياناته معزولة عن المستخدمين الآخرين

## Security Features

### Data Isolation
- كل مستخدم يرى بياناته فقط
- Row Level Security مفعل في Supabase
- البيانات محمية على مستوى قاعدة البيانات

### Access Control
- الإدمن فقط يمكنه إنشاء حسابات جديدة
- المستخدمون العاديون لا يرون صفحة إدارة المستخدمين
- الأدوار تتحكم في الصلاحيات

## Deployment
اتبع نفس خطوات النشر المذكورة في `PWA_DEPLOYMENT_GUIDE.md`.

## Files Modified
- `components/LoginSaaS.tsx` - إزالة التسجيل الذاتي
- `components/AdminUserManagement.tsx` - جديد
- `App.tsx` - إضافة صفحة إدارة المستخدمين
- `supabase-schema.sql` - موجود مسبقاً
- `setup-admin.sql` - جديد

## Testing
1. سجل دخولاً كإدمن
2. أنشئ مستخدماً جديداً من صفحة Users
3. سجل خروجاً
4. سجل دخولاً بالمستخدم الجديد
5. تأكد من أن البيانات معزولة