import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Social */}
          <div>
            <h3 className="text-sm font-bold mb-5 text-white">تابعنا على</h3>
            <div className="flex gap-3">
              {[
                { label: 'Facebook', href: 'https://www.facebook.com/King.Saud.University', icon: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z' },
                { label: 'Twitter', href: 'https://x.com/_KSU', icon: 'M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z' },
                { label: 'YouTube', href: 'https://www.youtube.com/user/pdksuchannel', icon: 'M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88.46-8.6.92a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19.1c1.72.46 8.6.9 8.6.9s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.87z M9.75 15.02V8.48l5.75 3.27-5.75 3.27z' },
                { label: 'LinkedIn', href: 'https://www.linkedin.com/school/king-saud-university', icon: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 2a2 2 0 110 4 2 2 0 010-4z' },
              ].map((s) => (
                <a key={s.label} href={s.href} aria-label={s.label} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-emerald-800 transition-colors">
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path d={s.icon} /></svg>
                </a>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-bold mb-5 text-white">تواصل معنا</h3>
            <ul className="space-y-3">
              {[
                { label: 'اتصل بنا', href: 'https://ksu.edu.sa/contact-us' },
                { label: 'موقع الجامعة', href: 'https://ksu.edu.sa/campus-location' },
                { label: 'التوظيف', href: 'https://dfpa.ksu.edu.sa/ar/jobs' },
                { label: 'البلاغات', href: 'https://ksu.edu.sa/reporting' },
              ].map((l) => (
                <li key={l.label}><a href={l.href} className="text-sm text-gray-400 hover:text-white transition-colors">{l.label}</a></li>
              ))}
            </ul>
          </div>

          {/* Apps */}
          <div>
            <h3 className="text-sm font-bold mb-5 text-white">تطبيقات الجامعة</h3>
            <ul className="space-y-3">
              {[
                { label: 'الخدمات الإلكترونية للمنسوبين', href: 'https://ksu.edu.sa/staff-e-services' },
                { label: 'الخدمات الإلكترونية للطلاب', href: 'https://ksu.edu.sa/students-e-services' },
                { label: 'تطبيق آيات', href: 'https://ksu.edu.sa/ayat-app' },
              ].map((l) => (
                <li key={l.label}><a href={l.href} className="text-sm text-gray-400 hover:text-white transition-colors">{l.label}</a></li>
              ))}
            </ul>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-bold mb-5 text-white">روابط مهمة</h3>
            <ul className="space-y-3">
              <li><Link to="/regulations" className="text-sm text-gray-400 hover:text-white transition-colors">اللوائح والأنظمة</Link></li>
              {[
                { label: 'السياسات والأنظمة', href: 'https://ksu.edu.sa/policies' },
                { label: 'الاستدامة', href: 'https://sustainability.ksu.edu.sa/' },
                { label: 'البيانات المفتوحة', href: 'https://data.ksu.edu.sa/ar' },
                { label: 'التقارير السنوية', href: 'https://ksu.edu.sa/annual-reports' },
              ].map((l) => (
                <li key={l.label}><a href={l.href} className="text-sm text-gray-400 hover:text-white transition-colors">{l.label}</a></li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <img src="https://ksu.edu.sa/_next/image?url=%2Fksu_logo.png&w=384&q=75" alt="جامعة الملك سعود" className="h-10 brightness-0 invert" />
            <a href="https://www.vision2030.gov.sa/ar"><img src="https://ksu.edu.sa/vision2030.svg" alt="رؤية 2030" className="h-8 brightness-0 invert" /></a>
          </div>
          <p className="text-xs text-gray-500">جميع الحقوق محفوظة لجامعة الملك سعود © {new Date().getFullYear()}</p>
          <div className="flex gap-5">
            {[
              { label: 'سياسة الخصوصية', href: 'https://ksu.edu.sa/privacy' },
              { label: 'شروط الاستخدام', href: 'https://ksu.edu.sa/terms' },
              { label: 'خريطة الموقع', href: 'https://ksu.edu.sa/sitemap' },
            ].map((l) => (
              <a key={l.label} href={l.href} className="text-xs text-gray-500 hover:text-white transition-colors">{l.label}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
