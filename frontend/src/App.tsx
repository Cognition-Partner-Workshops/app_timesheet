import { useState, useMemo } from 'react'
import './App.css'
import { Search, ChevronDown, FileText, ExternalLink, Filter, X } from 'lucide-react'

interface RegulationDoc {
  id: number
  title: string
  url: string
  source: string
  source_page: string
  issuer: string
}

const SOURCE_LABELS: Record<string, string> = {
  dsrs: 'عمادة البحث العلمي',
  dfpa: 'عمادة الموارد البشرية',
  sa: 'عمادة شؤون الطلاب',
  dar: 'عمادة شؤون القبول والتسجيل',
  ps: 'الإدارة العامة للمشتريات',
  housing: 'إدارة الاسكان والمرافق الترويحية',
  chairs: 'وكالة الكراسي البحثية',
}

const ISSUER_LABELS: Record<string, string> = {
  ksu: 'جامعة الملك سعود',
  uni_system: 'نظام الجامعات',
  civil_service: 'نظام الخدمة المدنية',
  labor_law: 'نظام العمل',
  rdia: 'هيئة تنمية البحث والتطوير والابتكار',
  higher_edu: 'مجلس التعليم العالي',
  procurement: 'نظام المنافسات والمشتريات الحكومية',
  health_jobs: 'لائحة الوظائف الصحية',
  edu_jobs: 'لائحة الوظائف التعليمية',
  govt_general: 'أنظمة حكومية عامة',
}

const ALL_DOCS: RegulationDoc[] = [
  { id: 1, title: 'ضوابط الأمانة العلمية', url: 'http://grant.ksu.edu.sa/sites/npst.ksu.edu.sa/files/imce_images/integrity_a.pdf', source: 'dsrs', source_page: 'dsrs.ksu.edu.sa/ar/node/1248', issuer: 'ksu' },
  { id: 2, title: 'ضوابط الملكية الفكرية', url: 'http://grant.ksu.edu.sa/sites/npst.ksu.edu.sa/files/imce_images/property_a.pdf', source: 'dsrs', source_page: 'dsrs.ksu.edu.sa/ar/node/1248', issuer: 'ksu' },
  { id: 3, title: 'ضوابط إرسال العينات الحيوية لخارج المملكة', url: 'http://grant.ksu.edu.sa/sites/npst.ksu.edu.sa/files/imce_images/genetic_a.pdf', source: 'dsrs', source_page: 'dsrs.ksu.edu.sa/ar/node/1248', issuer: 'ksu' },
  { id: 4, title: 'متطلبات الموافقة بعد التبصير', url: 'http://grant.ksu.edu.sa/sites/npst.ksu.edu.sa/files/imce_images/informed_consent_a.pdf', source: 'dsrs', source_page: 'dsrs.ksu.edu.sa/ar/node/1248', issuer: 'ksu' },
  { id: 5, title: 'نظام أخلاقيات البحث على المخلوقات الحية', url: 'http://grant.ksu.edu.sa/sites/npst.ksu.edu.sa/files/imce_images/research_ethics_a.pdf', source: 'dsrs', source_page: 'dsrs.ksu.edu.sa/ar/node/1248', issuer: 'govt_general' },
  { id: 6, title: 'لائحة دعم البحوث', url: 'http://grant.ksu.edu.sa/sites/npst.ksu.edu.sa/files/imce_images/regulations_of_research_funding_a.pdf', source: 'dsrs', source_page: 'dsrs.ksu.edu.sa/ar/node/1248', issuer: 'ksu' },
  { id: 7, title: 'لائحة هيئة تنمية البحث والتطوير والابتكار', url: 'https://dsrs.ksu.edu.sa/sites/dsrs.ksu.edu.sa/files/users/user1009/%D9%84%D8%A7%D8%A6%D8%AD%D9%80%D8%A9-%D9%85%D9%86%D8%AD-%D8%A7%D9%84%D8%A8%D8%AD%D9%88%D8%AB-%D8%A7%D9%84%D9%85%D9%85%D9%88%D9%84%D8%A9-%D9%85%D9%86-%D9%87%D9%8A%D8%A6%D8%A9-%D8%AA%D9%86%D9%85%D9%8A%D8%A9-%D8%A7%D9%84%D8%A8%D8%AD%D8%AB-%D9%88%D8%A7%D9%84%D8%AA%D8%B7%D9%88%D9%8A%D8%B1-%D9%88%D8%A7%D9%84%D8%A7%D8%A8%D8%AA%D9%83%D8%A7%D8%B1-10.pdf', source: 'dsrs', source_page: 'dsrs.ksu.edu.sa/ar/node/4239', issuer: 'rdia' },
  { id: 8, title: 'Research Grants Regulation Funded by the RDIA (English)', url: 'https://dsrs.ksu.edu.sa/sites/dsrs.ksu.edu.sa/files/users/user1009/Research%20Grants%20Regulation%20Funded%20by%20the%20RDIA.pdf', source: 'dsrs', source_page: 'dsrs.ksu.edu.sa/ar/node/4239', issuer: 'rdia' },
  { id: 9, title: 'اتفاقية حوكمة الدعم المالي للأبحاث العلمية في الجهات البحثية', url: 'https://dsrs.ksu.edu.sa/sites/dsrs.ksu.edu.sa/files/users/user1009/%D8%AD%D9%88%D9%83%D9%85%D8%A9%20%D8%A7%D9%84%D8%AF%D8%B9%D9%85%20%D8%A7%D9%84%D9%85%D8%A7%D9%84%D9%8A.pdf', source: 'dsrs', source_page: 'dsrs.ksu.edu.sa/ar/node/4239', issuer: 'rdia' },
  { id: 10, title: 'أطر العمل التنظيمية للائحة التنفيذية للموارد البشرية', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/2025-07/The%20Regulatory%20Frameworks%20for%20the%20Implementing%20Regulations%20for%20Human%20Resources_arabic_0.pdf', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/regulationsandrulesinksu', issuer: 'civil_service' },
  { id: 11, title: 'الاجازات الاستثنائية', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/2025-07/Exceptional%20leave%20Rules.pdf', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/regulationsandrulesinksu', issuer: 'civil_service' },
  { id: 12, title: 'بدل راحات', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/2025-07/compensation%20time_arabic.pdf', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/regulationsandrulesinksu', issuer: 'civil_service' },
  { id: 13, title: 'لائحة المعينين على بند الأجور في الجهات الإدارية', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/2025-07/Regulations%20for%20those%20Appointed%20under%20Wages%20System%20in%20Government%20Entities_arabic.pdf', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/regulationsandrulesinksu', issuer: 'civil_service' },
  { id: 14, title: 'لائحة استقطاب الباحثين غير السعوديين بجامعة الملك سعود', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/2025-07/Attracting%20outstanding%20non-saudi%20researchers%20regulation%20in%20KSU.pdf', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/regulationsandrulesinksu', issuer: 'ksu' },
  { id: 15, title: 'لائحة الحقوق والمزايا المالية', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/2025-07/Financial_rights_and_Benefits_arabic.pdf', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/regulationsandrulesinksu', issuer: 'civil_service' },
  { id: 16, title: 'لائحة المستخدمين', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/2025-07/Servants_Regulations_arabic.pdf', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/regulationsandrulesinksu', issuer: 'civil_service' },
  { id: 17, title: 'لائحة الوظائف التعليمية', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/2025-07/Educational%20Jobs%20Regulations_arabic.pdf', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/regulationsandrulesinksu', issuer: 'edu_jobs' },
  { id: 18, title: 'لائحة الوظائف الصحية', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/2025-07/Health%20Jobs%20Regulation_arabic.pdf', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/regulationsandrulesinksu', issuer: 'health_jobs' },
  { id: 19, title: 'اللائحة المنظمة لشؤون منسوبي الجامعات السعوديين من أعضاء هيئة التدريس ومن في حكمهم', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/2025-07/Saudi%20Faculties%20members%20Regulations%20and%20rules.pdf', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/regulationsandrulesinksu', issuer: 'uni_system' },
  { id: 20, title: 'لائحة توظيف غير السعوديين في الجامعات', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/2025-07/University%20Employment%20Regulations%20for%20Non-Saudi.pdf', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/regulationsandrulesinksu', issuer: 'uni_system' },
  { id: 21, title: 'ضوابط ولوائح التدريب', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/2025-07/training%20Regulations%20and%20rules.pdf', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/regulationsandrulesinksu', issuer: 'ksu' },
  { id: 22, title: 'نظام الجامعات', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/2025-07/Universties%20Rules.pdf', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/regulationsandrulesinksu', issuer: 'uni_system' },
  { id: 23, title: 'القواعد المنظمة لبرنامج الإشراف الخارجي', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/2025-07/External%20Joint%20Supervision%20Program%20regulations.pdf', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/regulationsandrulesinksu', issuer: 'ksu' },
  { id: 24, title: 'لائحة الابتعاث والتدريب لمنسوبي الجامعات', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/2025-07/Scholarship%20and%20training%20regulations%20for%20University%20members.pdf', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/regulationsandrulesinksu', issuer: 'uni_system' },
  { id: 25, title: 'نظام الجامعات الطبعة الاولى', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/2025-07/Universities%20Rules%20First%20Version.pdf', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/regulationsandrulesinksu', issuer: 'uni_system' },
  { id: 26, title: 'اللائحة التنفيذية للموارد البشرية', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/2025-07/implementing%20regulation%20for%20human%20resources%20in%20civil%20service.pdf', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/regulationsandrulesinksu', issuer: 'civil_service' },
  { id: 27, title: 'لائحة تفويض الصلاحيات', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/imce_images/1.docx', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/lists-staff', issuer: 'ksu' },
  { id: 28, title: 'لائحة توظيف غير السعوديين', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/imce_images/2.doc', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/lists-staff', issuer: 'civil_service' },
  { id: 29, title: 'لائحة انتهاء الخدمة', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/imce_images/3.doc', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/lists-staff', issuer: 'civil_service' },
  { id: 30, title: 'لائحة الوظائف الصحية', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/imce_images/4.doc', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/lists-staff', issuer: 'health_jobs' },
  { id: 31, title: 'لائحة الوظائف التعليمية', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/imce_images/5.doc', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/lists-staff', issuer: 'edu_jobs' },
  { id: 32, title: 'لائحة الواجبات الوظيفية', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/imce_images/6.doc', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/lists-staff', issuer: 'civil_service' },
  { id: 33, title: 'لائحة المعينين على بند الاجور', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/imce_images/7.doc', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/lists-staff', issuer: 'civil_service' },
  { id: 34, title: 'قواعد اثبات العجز الصحي عن العمل', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/imce_images/8.docx', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/lists-staff', issuer: 'civil_service' },
  { id: 35, title: 'لائحة النقل', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/imce_images/9.docx', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/lists-staff', issuer: 'civil_service' },
  { id: 36, title: 'لائحة تقارير منح الاجازات المرضية', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/imce_images/10.docx', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/lists-staff', issuer: 'civil_service' },
  { id: 37, title: 'لائحة المستخدمين', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/imce_images/11.doc', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/lists-staff', issuer: 'civil_service' },
  { id: 38, title: 'لائحة التكليف', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/imce_images/12.doc', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/lists-staff', issuer: 'civil_service' },
  { id: 39, title: 'لائحة التعيين في الوظائف العامة', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/imce_images/13.doc', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/lists-staff', issuer: 'civil_service' },
  { id: 40, title: 'لائحة الترقيات', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/imce_images/14.doc', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/lists-staff', issuer: 'civil_service' },
  { id: 41, title: 'لائحة الإعارة', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/imce_images/15.doc', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/lists-staff', issuer: 'civil_service' },
  { id: 42, title: 'لائحة تقويم الأداء الوظيفي', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/imce_images/16.doc', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/lists-staff', issuer: 'civil_service' },
  { id: 43, title: 'نظام الخدمة المدنية وسلم الرواتب', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/imce_images/17.doc', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/lists-staff', issuer: 'civil_service' },
  { id: 44, title: 'تنظيم علاج موظفي الدولة المنتدبين إلى الخارج', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/imce_images/18.pdf', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/lists-staff', issuer: 'govt_general' },
  { id: 45, title: 'قواعد تعيين الموظفين الذين يفصلون بطريقة غير نظامية', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/imce_images/19.pdf', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/lists-staff', issuer: 'civil_service' },
  { id: 46, title: 'لائحة اللياقة الصحية لشغل الوظيفة العامة', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/imce_images/20.pdf', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/lists-staff', issuer: 'civil_service' },
  { id: 47, title: 'نظام العمل بالمملكة العربية السعودية', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/imce_images/21.pdf', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/lists-staff', issuer: 'labor_law' },
  { id: 48, title: 'مرشد الموظف الجديد', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/imce_images/22.pdf', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/lists-staff', issuer: 'ksu' },
  { id: 49, title: 'لائحة الاجازات', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/imce_images/23.pdf', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/lists-staff', issuer: 'civil_service' },
  { id: 50, title: 'لائحة ادارة الممتلكات الجامعية', url: 'https://dfpa.ksu.edu.sa/sites/dfpa.ksu.edu.sa/files/imce_images/24.pdf', source: 'dfpa', source_page: 'dfpa.ksu.edu.sa/ar/lists-staff', issuer: 'ksu' },
  { id: 51, title: 'لائحة الايفاد والابتعاث', url: 'https://sa.ksu.edu.sa/sites/sa.ksu.edu.sa/files/imce_images/%D9%84%D8%A7%D8%A6%D8%AD%D8%A9%20%D8%A7%D9%84%D8%A7%D9%8A%D9%81%D8%A7%D8%AF%20%D9%88%D8%A7%D9%84%D8%A7%D8%A8%D8%AA%D8%B9%D8%A7%D8%AB.pdf', source: 'sa', source_page: 'sa.ksu.edu.sa/ar/node/3127', issuer: 'higher_edu' },
  { id: 52, title: 'اللائحة التنظيمية لبعثات التعليم العالي', url: 'https://sa.ksu.edu.sa/sites/sa.ksu.edu.sa/files/imce_images/%D8%A7%D9%84%D9%84%D8%A7%D8%A6%D8%AD%D8%A9%20%D8%A7%D9%84%D8%AA%D9%86%D8%B8%D9%8A%D9%85%D9%8A%D8%A9%20%D9%84%D8%A8%D8%B9%D8%AB%D8%A7%D8%AA%20%D8%A7%D9%84%D8%AA%D8%B9%D9%84%D9%8A%D9%85%20%D8%A7%D9%84%D8%B9%D8%A7%D9%84%D9%8A.pdf', source: 'sa', source_page: 'sa.ksu.edu.sa/ar/node/3127', issuer: 'higher_edu' },
  { id: 53, title: 'لائحة التأديب بالميثاق', url: 'https://sa.ksu.edu.sa/sites/sa.ksu.edu.sa/files/imce_images/%D9%84%D8%A7%D8%A6%D8%AD%D8%A9%20%D8%A7%D9%84%D8%AA%D8%A7%D8%AF%D9%8A%D8%A8%20%D8%A8%D8%A7%D9%84%D9%85%D9%8A%D8%AB%D8%A7%D9%82.pdf', source: 'sa', source_page: 'sa.ksu.edu.sa/ar/node/3127', issuer: 'higher_edu' },
  { id: 54, title: 'نظام مجلس التعليم العالي والجامعات', url: 'https://sa.ksu.edu.sa/sites/sa.ksu.edu.sa/files/imce_images/%D9%86%D8%B8%D8%A7%D9%85%20%D9%85%D8%AC%D9%84%D8%B3%20%D8%A7%D9%84%D8%AA%D8%B9%D9%84%D9%8A%D9%85%20%D8%A7%D9%84%D8%B9%D8%A7%D9%84%D9%8A%20%D9%88%D8%A7%D9%84%D8%AC%D8%A7%D9%85%D8%B9%D8%A7%D8%AA.pdf', source: 'sa', source_page: 'sa.ksu.edu.sa/ar/node/3127', issuer: 'higher_edu' },
  { id: 55, title: 'القواعد التنفيذية لنظام الجامعات- الطبعة الأولى', url: 'https://dar.ksu.edu.sa/sites/dar.ksu.edu.sa/files/2024-10/%D8%A7%D9%84%D9%82%D9%88%D8%A7%D8%B9%D8%AF%20%D8%A7%D9%84%D8%AA%D9%86%D9%81%D9%8A%D8%B0%D9%8A%D8%A9%20%D9%84%D9%86%D8%B8%D8%A7%D9%85%20%D8%A7%D9%84%D8%AC%D8%A7%D9%85%D8%B9%D8%A7%D8%AA-%20%D8%A7%D9%84%D8%B7%D8%A8%D8%B9%D8%A9%20%D8%A7%D9%84%D8%A3%D9%88%D9%84%D9%89.pdf', source: 'dar', source_page: 'dar.ksu.edu.sa/ar/node/4260', issuer: 'uni_system' },
  { id: 56, title: 'اللائحة التنظيمية للتعليم الالكتروني والتعليم عن بُعد في الجامعات', url: 'https://dar.ksu.edu.sa/sites/dar.ksu.edu.sa/files/2024-10/%D8%A7%D9%84%D9%84%D8%A7%D8%A6%D8%AD%D8%A9%20%D8%A7%D9%84%D8%AA%D9%86%D8%B8%D9%8A%D9%85%D9%8A%D8%A9%20%D9%84%D9%84%D8%AA%D8%B9%D9%84%D9%8A%D9%85%20%D8%A7%D9%84%D8%A7%D9%84%D9%83%D8%AA%D8%B1%D9%88%D9%86%D9%8A.pdf', source: 'dar', source_page: 'dar.ksu.edu.sa/ar/node/4260', issuer: 'higher_edu' },
  { id: 57, title: 'اللائحة الموحدة للدراسات العليا في الجامعات', url: 'https://dar.ksu.edu.sa/sites/dar.ksu.edu.sa/files/2024-10/%D8%A7%D9%84%D9%84%D8%A7%D8%A6%D8%AD%D8%A9%20%D8%A7%D9%84%D9%85%D9%88%D8%AD%D8%AF%D8%A9%20%D9%84%D9%84%D8%AF%D8%B1%D8%A7%D8%B3%D8%A7%D8%AA%20%D8%A7%D9%84%D8%B9%D9%84%D9%8A%D8%A7%20%D9%81%D9%8A%20%D8%A7%D9%84%D8%AC%D8%A7%D9%85%D8%B9%D8%A7%D8%AA.pdf', source: 'dar', source_page: 'dar.ksu.edu.sa/ar/node/4260', issuer: 'higher_edu' },
  { id: 58, title: 'اللائحة الموحدة للدراسة والاختبارات للمرحلة الجامعية في الجامعات', url: 'https://dar.ksu.edu.sa/sites/dar.ksu.edu.sa/files/2024-10/%D8%A7%D9%84%D9%84%D8%A7%D8%A6%D8%AD%D8%A9%20%D8%A7%D9%84%D9%85%D9%88%D8%AD%D8%AF%D8%A9%20%D9%84%D9%84%D8%AF%D8%B1%D8%A7%D8%B3%D8%A9%20%D9%88%D8%A7%D9%84%D8%A7%D8%AE%D8%AA%D8%A8%D8%A7%D8%B1%D8%A7%D8%AA%20%D9%84%D9%84%D9%85%D8%B1%D8%AD%D9%84%D8%A9%20%D8%A7%D9%84%D8%AC%D8%A7%D9%85%D8%B9%D9%8A%D8%A9.pdf', source: 'dar', source_page: 'dar.ksu.edu.sa/ar/node/4260', issuer: 'higher_edu' },
  { id: 59, title: 'لائحة المستودعات و المشتريات الحكومية', url: 'https://ps.ksu.edu.sa/sites/ps.ksu.edu.sa/files/imce_images/%D9%84%D8%A7%D8%A6%D8%AD%D8%A9%20%D8%A7%D9%84%D9%85%D8%B3%D8%AA%D9%88%D8%AF%D8%B9%D8%A7%D8%AA%20%D9%88%20%D8%A7%D9%84%D9%85%D8%B4%D8%AA%D8%B1%D9%8A%D8%A7%D8%AA%20%D8%A7%D9%84%D8%AD%D9%83%D9%88%D9%85%D9%8A%D8%A9.pdf', source: 'ps', source_page: 'ps.ksu.edu.sa/ar/node/921', issuer: 'procurement' },
  { id: 60, title: 'نظام المنافسات والمشتريات الحكومية', url: 'https://ps.ksu.edu.sa/sites/ps.ksu.edu.sa/files/imce_images/%D9%86%D8%B8%D8%A7%D9%85%20%D8%A7%D9%84%D9%85%D9%86%D8%A7%D9%81%D8%B3%D8%A7%D8%AA%20%D9%88%D8%A7%D9%84%D9%85%D8%B4%D8%AA%D8%B1%D9%8A%D8%A7%D8%AA%20%D8%A7%D9%84%D8%AD%D9%83%D9%88%D9%85%D9%8A%D8%A9.pdf', source: 'ps', source_page: 'ps.ksu.edu.sa/ar/node/921', issuer: 'procurement' },
  { id: 61, title: 'سياسة الشراء', url: 'https://ps.ksu.edu.sa/sites/ps.ksu.edu.sa/files/2024-10/%D8%B3%D9%8A%D8%A7%D8%B3%D8%A9%20%D8%A7%D9%84%D8%B4%D8%B1%D8%A7%D8%A1.pdf', source: 'ps', source_page: 'ps.ksu.edu.sa/ar/node/921', issuer: 'ksu' },
  { id: 62, title: 'اجراءات العمل بادارة المشتريات', url: 'https://ps.ksu.edu.sa/sites/ps.ksu.edu.sa/files/2024-10/%D8%A7%D8%AC%D8%B1%D8%A7%D8%A1%D8%A7%D8%AA%20%D8%A7%D9%84%D8%B9%D9%85%D9%84%20%D8%A8%D8%A7%D8%AF%D8%A7%D8%B1%D8%A9%20%D8%A7%D9%84%D9%85%D8%B4%D8%AA%D8%B1%D9%8A%D8%A7%D8%AA.pdf', source: 'ps', source_page: 'ps.ksu.edu.sa/ar/node/921', issuer: 'ksu' },
  { id: 63, title: 'اللائحة التنفيذية لنظام المنافسات والمشتريات الحكومية', url: 'https://ps.ksu.edu.sa/sites/ps.ksu.edu.sa/files/2024-10/%D8%A7%D9%84%D9%84%D8%A7%D8%A6%D8%AD%D8%A9%20%D8%A7%D9%84%D8%AA%D9%86%D9%81%D9%8A%D8%B0%D9%8A%D8%A9%20%D9%84%D9%86%D8%B8%D8%A7%D9%85%20%D8%A7%D9%84%D9%85%D9%86%D8%A7%D9%81%D8%B3%D8%A7%D8%AA%20%D9%88%D8%A7%D9%84%D9%85%D8%B4%D8%AA%D8%B1%D9%8A%D8%A7%D8%AA%20%D8%A7%D9%84%D8%AD%D9%83%D9%88%D9%85%D9%8A%D8%A9.pdf', source: 'ps', source_page: 'ps.ksu.edu.sa/ar/node/921', issuer: 'procurement' },
  { id: 64, title: 'دليل اجراءات نظام المنافسات والمشتريات الحكومية', url: 'https://ps.ksu.edu.sa/sites/ps.ksu.edu.sa/files/2024-10/%D8%AF%D9%84%D9%8A%D9%84%20%D8%A7%D8%AC%D8%B1%D8%A7%D8%A1%D8%A7%D8%AA%20%D9%86%D8%B8%D8%A7%D9%85%20%D8%A7%D9%84%D9%85%D9%86%D8%A7%D9%81%D8%B3%D8%A7%D8%AA%20%D9%88%D8%A7%D9%84%D9%85%D8%B4%D8%AA%D8%B1%D9%8A%D8%A7%D8%AA%20%D8%A7%D9%84%D8%AD%D9%83%D9%88%D9%85%D9%8A%D8%A9.pdf', source: 'ps', source_page: 'ps.ksu.edu.sa/ar/node/921', issuer: 'procurement' },
  { id: 65, title: 'لائحة الإسكان', url: 'https://housing.ksu.edu.sa/sites/housing.ksu.edu.sa/files/2024-04/6-%D9%84%D8%A7%D8%A6%D8%AD%D8%A9%20%D8%A7%D9%84%D8%A5%D8%B3%D9%83%D8%A7%D9%86.pdf', source: 'housing', source_page: 'housing.ksu.edu.sa/ar/node/916', issuer: 'ksu' },
  { id: 66, title: 'لائحة الكراسي البحثية بجامعة الملك سعود', url: 'https://chairs.ksu.edu.sa/sites/chairs.ksu.edu.sa/files/2023-10/%D9%84%D8%A7%D8%A6%D8%AD%D8%A9%20%D8%A7%D9%84%D9%83%D8%B1%D8%A7%D8%B3%D9%8A%20%D8%A7%D9%84%D8%A8%D8%AD%D8%AB%D9%8A%D8%A9%20%D8%A8%D8%AC%D8%A7%D9%85%D8%B9%D8%A9%20%D8%A7%D9%84%D9%85%D9%84%D9%83%20%D8%B3%D8%B9%D9%88%D8%AF.pdf', source: 'chairs', source_page: 'chairs.ksu.edu.sa/ar/node/893', issuer: 'ksu' },
  { id: 67, title: 'نموذج طلب إنشاء كرسي بحثي', url: 'https://chairs.ksu.edu.sa/sites/chairs.ksu.edu.sa/files/2023-10/%D9%86%D9%85%D9%88%D8%B0%D8%AC%20%D8%B7%D9%84%D8%A8%20%D8%A5%D9%86%D8%B4%D8%A7%D8%A1%20%D9%83%D8%B1%D8%B3%D9%8A%20%D8%A8%D8%AD%D8%AB%D9%8A.pdf', source: 'chairs', source_page: 'chairs.ksu.edu.sa/ar/node/893', issuer: 'ksu' },
  { id: 68, title: 'الدليل الإرشادي للكراسي البحثية في جامعة الملك سعود', url: 'https://chairs.ksu.edu.sa/sites/chairs.ksu.edu.sa/files/2023-10/%D8%A7%D9%84%D8%AF%D9%84%D9%8A%D9%84%20%D8%A7%D9%84%D8%A5%D8%B1%D8%B4%D8%A7%D8%AF%D9%8A%20%D9%84%D9%84%D9%83%D8%B1%D8%A7%D8%B3%D9%8A%20%D8%A7%D9%84%D8%A8%D8%AD%D8%AB%D9%8A%D8%A9.pdf', source: 'chairs', source_page: 'chairs.ksu.edu.sa/ar/node/893', issuer: 'ksu' },
]

const KSU_LOGO = 'https://ksu.edu.sa/ksu_logo.png'

function GovBanner() {
  return (
    <div className="bg-gray-100 border-b border-gray-200 py-1.5 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">نسخة تجريبية</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <span>موقع حكومي رسمي تابع لحكومة المملكة العربية السعودية</span>
          <img src="https://ksu.edu.sa/saudi-flag.svg" alt="علم المملكة" className="h-4" />
        </div>
      </div>
    </div>
  )
}

function Header({ currentPage, setCurrentPage }: { currentPage: string; setCurrentPage: (p: string) => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { id: 'home', label: 'الرئيسية', href: '#' },
    { id: 'about', label: 'عن الجامعة', href: 'https://ksu.edu.sa/ar' },
    { id: 'research', label: 'البحث العلمي', href: 'https://ksu.edu.sa/ar' },
    { id: 'study', label: 'الدراسة بالجامعة', href: 'https://ksu.edu.sa/ar' },
    { id: 'life', label: 'الحياة بالجامعة', href: 'https://ksu.edu.sa/ar' },
    { id: 'services', label: 'الخدمات الإلكترونية', href: 'https://ksu.edu.sa/ar' },
    { id: 'media', label: 'المركز الإعلامي', href: 'https://ksu.edu.sa/ar' },
    { id: 'regulations', label: 'اللوائح والأنظمة', href: '#' },
  ]

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'home' || item.id === 'regulations') {
                    setCurrentPage(item.id)
                    setMobileMenuOpen(false)
                  } else {
                    window.open(item.href, '_blank')
                  }
                }}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  currentPage === item.id
                    ? 'bg-emerald-800 text-white'
                    : item.id === 'regulations'
                    ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.label}
                {(item.id !== 'home' && item.id !== 'regulations') && <ChevronDown className="inline-block mr-1 h-3 w-3" />}
              </button>
            ))}
          </nav>

          <a
            href="#"
            onClick={(e) => { e.preventDefault(); setCurrentPage('home') }}
            className="flex items-center"
          >
            <img src={KSU_LOGO} alt="جامعة الملك سعود" className="h-14" />
          </a>

          <button
            className="lg:hidden p-2 text-gray-700"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 py-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'home' || item.id === 'regulations') {
                    setCurrentPage(item.id)
                  } else {
                    window.open(item.href, '_blank')
                  }
                  setMobileMenuOpen(false)
                }}
                className={`block w-full text-right px-4 py-3 text-sm font-medium ${
                  currentPage === item.id ? 'bg-emerald-50 text-emerald-800' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}

function Breadcrumb() {
  return (
    <nav className="bg-gray-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li><a href="#" className="hover:text-emerald-700">الرئيسية</a></li>
          <li className="text-gray-400">&gt;</li>
          <li className="text-emerald-800 font-medium">اللوائح والأنظمة</li>
        </ol>
      </div>
    </nav>
  )
}

function FilterDropdown({
  selected,
  setSelected,
  isOpen,
  setIsOpen,
  labels,
  allLabel,
}: {
  selected: string
  setSelected: (s: string) => void
  isOpen: boolean
  setIsOpen: (b: boolean) => void
  labels: Record<string, string>
  allLabel: string
}) {
  const entries = Object.entries(labels)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-700 hover:border-emerald-400 transition-colors"
      >
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        <span>{selected ? labels[selected] : allLabel}</span>
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-auto">
          <button
            onClick={() => { setSelected(''); setIsOpen(false) }}
            className={`block w-full text-right px-4 py-2.5 text-sm hover:bg-emerald-50 ${!selected ? 'bg-emerald-50 text-emerald-800 font-medium' : 'text-gray-700'}`}
          >
            {allLabel}
          </button>
          {entries.map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setSelected(key); setIsOpen(false) }}
              className={`block w-full text-right px-4 py-2.5 text-sm hover:bg-emerald-50 ${selected === key ? 'bg-emerald-50 text-emerald-800 font-medium' : 'text-gray-700'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function RegulationCard({ doc }: { doc: RegulationDoc }) {
  const fileExt = doc.url.split('.').pop()?.toLowerCase() || ''
  const fileType = ['pdf'].includes(fileExt) ? 'PDF' : ['doc', 'docx'].includes(fileExt) ? 'DOC' : fileExt.toUpperCase()

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-emerald-200 transition-all duration-200 group">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h3 className="text-base font-bold text-gray-900 group-hover:text-emerald-800 transition-colors leading-7 mb-3">
            {doc.title}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
              {ISSUER_LABELS[doc.issuer]}
            </span>
            <span className="inline-flex items-center bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-medium">
              {SOURCE_LABELS[doc.source]}
            </span>
            <span className="inline-flex items-center bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-xs font-medium">
              {fileType}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0 mr-2">
          <div className="bg-emerald-50 rounded-lg p-3 group-hover:bg-emerald-100 transition-colors">
            <FileText className="h-6 w-6 text-emerald-700" />
          </div>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
        <a
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-900 text-sm font-medium transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          <span>تحميل الوثيقة</span>
        </a>
        <a
          href={`https://${doc.source_page}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          المصدر الأصلي
        </a>
      </div>
    </div>
  )
}

function RegulationsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSource, setSelectedSource] = useState('')
  const [selectedIssuer, setSelectedIssuer] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [issuerDropdownOpen, setIssuerDropdownOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 12

  const filteredDocs = useMemo(() => {
    return ALL_DOCS.filter((doc) => {
      const matchesSearch = !searchQuery || doc.title.includes(searchQuery)
      const matchesSource = !selectedSource || doc.source === selectedSource
      const matchesIssuer = !selectedIssuer || doc.issuer === selectedIssuer
      return matchesSearch && matchesSource && matchesIssuer
    })
  }, [searchQuery, selectedSource, selectedIssuer])

  const totalPages = Math.ceil(filteredDocs.length / ITEMS_PER_PAGE)
  const paginatedDocs = filteredDocs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedSource('')
    setSelectedIssuer('')
    setCurrentPage(1)
  }

  const hasActiveFilters = searchQuery || selectedSource || selectedIssuer

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb />

      {/* Page Title */}
      <div className="bg-emerald-800 text-white py-10">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">اللوائح والأنظمة</h1>
          <p className="text-emerald-100 text-base">
            كافة الوثائق واللوائح والأنظمة الرسمية لجامعة الملك سعود، إضافةً إلى المواد ذات الصلة أو الأهمية لمنسوبي الجامعة.
          </p>
          <div className="mt-4 flex items-center gap-4 text-emerald-200 text-sm">
            <span className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {ALL_DOCS.length} وثيقة
            </span>
            <span>|</span>
            <span>{Object.keys(SOURCE_LABELS).length} جهات</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">العنوان</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                  placeholder="ابحث عن لائحة أو نظام..."
                  className="w-full border border-gray-300 rounded-lg pr-10 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">الجهة المصدرة</label>
              <FilterDropdown
                selected={selectedIssuer}
                setSelected={(s) => { setSelectedIssuer(s); setCurrentPage(1) }}
                isOpen={issuerDropdownOpen}
                setIsOpen={(b) => { setIssuerDropdownOpen(b); if (b) setDropdownOpen(false) }}
                labels={ISSUER_LABELS}
                allLabel="جميع الجهات المصدرة"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">القسم بالجامعة</label>
              <FilterDropdown
                selected={selectedSource}
                setSelected={(s) => { setSelectedSource(s); setCurrentPage(1) }}
                isOpen={dropdownOpen}
                setIsOpen={(b) => { setDropdownOpen(b); if (b) setIssuerDropdownOpen(false) }}
                labels={SOURCE_LABELS}
                allLabel="جميع الأقسام"
              />
            </div>
            <div className="md:col-span-2">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="w-full flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-4 py-3 text-sm font-medium transition-colors"
                >
                  <X className="h-4 w-4" />
                  مسح الفلتر
                </button>
              )}
            </div>
          </div>
          {hasActiveFilters && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
              <Filter className="h-3.5 w-3.5" />
              <span>عرض {filteredDocs.length} من {ALL_DOCS.length} وثيقة</span>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {paginatedDocs.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-1">لا توجد نتائج</h3>
            <p className="text-sm text-gray-400">حاول تغيير معايير البحث أو الفلتر</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {paginatedDocs.map((doc) => (
                <RegulationCard key={doc.id} doc={doc} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  السابق
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium ${
                      currentPage === page
                        ? 'bg-emerald-800 text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  التالي
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function HomePage({ setCurrentPage }: { setCurrentPage: (p: string) => void }) {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-emerald-800 text-white py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-l from-emerald-600 to-emerald-900" />
        </div>
        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">جامعة الملك سعود</h1>
          <p className="text-xl text-emerald-100 mb-8">الريادة العالمية والتميز في بناء مجتمع المعرفة</p>
          <a
            href="https://ksu.edu.sa/strategy-and-values"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block border-2 border-white text-white px-8 py-3 rounded-lg hover:bg-white hover:text-emerald-800 transition-colors font-medium"
          >
            المزيد
          </a>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">الجامعة في أرقام</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { number: '15.5', label: 'أبرز تصنيفات الجامعة لهذا العام' },
              { number: '0.3', label: 'أبرز انجازات الجامعة لهذا العام' },
              { number: '1', label: 'المركز الأول في علم الأورام وطب القلب' },
              { number: '3%', label: 'تشكل أبحاث الجامعة من إجمالي أبحاث المملكة' },
            ].map((stat, idx) => (
              <div key={idx} className="text-center border border-gray-200 rounded-xl p-6">
                <div className="text-3xl font-bold text-emerald-800 mb-2">{stat.number}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Regulations Highlight */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-gradient-to-l from-emerald-700 to-emerald-800 rounded-2xl p-8 md:p-12 text-white">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold mb-3">اللوائح والأنظمة</h2>
                <p className="text-emerald-100 text-base leading-7">
                  تصفح كافة الوثائق واللوائح والأنظمة الرسمية لجامعة الملك سعود، إضافةً إلى المواد ذات الصلة أو الأهمية لمنسوبي الجامعة.
                  تضم المكتبة {ALL_DOCS.length} وثيقة من {Object.keys(SOURCE_LABELS).length} جهات مختلفة.
                </p>
              </div>
              <button
                onClick={() => setCurrentPage('regulations')}
                className="flex-shrink-0 bg-white text-emerald-800 px-8 py-3 rounded-lg font-bold hover:bg-emerald-50 transition-colors"
              >
                تصفح الوثائق
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function Footer() {
  return (
    <footer className="bg-emerald-900 text-white pt-12 pb-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div>
            <h3 className="font-bold text-lg mb-4">تابعنا على</h3>
            <div className="flex gap-3">
              {[
                { label: 'X', href: 'https://x.com/_KSU' },
                { label: 'YouTube', href: 'https://www.youtube.com/user/pdksuchannel' },
                { label: 'LinkedIn', href: 'https://www.linkedin.com/school/king-saud-university' },
                { label: 'Instagram', href: 'https://www.instagram.com/king_saud_university' },
              ].map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="bg-emerald-800 hover:bg-emerald-700 rounded-lg w-10 h-10 flex items-center justify-center text-xs font-bold transition-colors">
                  {s.label[0]}
                </a>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4">تواصل معنا</h3>
            <ul className="space-y-2 text-sm text-emerald-200">
              <li><a href="https://ksu.edu.sa/contact-us" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">اتصل بنا</a></li>
              <li><a href="https://ksu.edu.sa/campus-location" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">موقع الجامعة</a></li>
              <li><a href="https://dfpa.ksu.edu.sa/ar/jobs" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">التوظيف</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4">روابط مهمة</h3>
            <ul className="space-y-2 text-sm text-emerald-200">
              <li><a href="https://ksu.edu.sa/policies" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">السياسات والأنظمة</a></li>
              <li><a href="https://sustainability.ksu.edu.sa/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">الاستدامة</a></li>
              <li><a href="https://data.ksu.edu.sa/ar" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">البيانات المفتوحة</a></li>
              <li><a href="https://ksu.edu.sa/annual-reports" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">التقارير السنوية</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4">تصفح</h3>
            <ul className="space-y-2 text-sm text-emerald-200">
              <li><a href="https://ksu.edu.sa/frequently-asked-questions" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">الأسئلة الشائعة</a></li>
              <li><a href="https://ksu.edu.sa/university-gallery" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">مكتبة المرئيات والصور</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-emerald-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src={KSU_LOGO} alt="جامعة الملك سعود" className="h-10 brightness-0 invert" />
            <a href="https://www.vision2030.gov.sa/ar" target="_blank" rel="noopener noreferrer">
              <img src="https://ksu.edu.sa/vision2030.svg" alt="رؤية 2030" className="h-8 brightness-0 invert" />
            </a>
          </div>
          <p className="text-sm text-emerald-300">جميع الحقوق محفوظة لجامعة الملك سعود &copy; 2026</p>
          <div className="flex items-center gap-4 text-xs text-emerald-400">
            <a href="https://ksu.edu.sa/copyright" target="_blank" rel="noopener noreferrer" className="hover:text-white">حقوق النشر</a>
            <a href="https://ksu.edu.sa/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-white">سياسة الخصوصية</a>
            <a href="https://ksu.edu.sa/terms" target="_blank" rel="noopener noreferrer" className="hover:text-white">شروط الاستخدام</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

function App() {
  const [currentPage, setCurrentPage] = useState('home')

  return (
    <div className="min-h-screen flex flex-col">
      <GovBanner />
      <Header currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <main className="flex-1">
        {currentPage === 'home' ? (
          <HomePage setCurrentPage={setCurrentPage} />
        ) : (
          <RegulationsPage />
        )}
      </main>
      <Footer />
    </div>
  )
}

export default App
