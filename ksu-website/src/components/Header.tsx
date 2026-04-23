import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { label: 'عن الجامعة', href: 'https://ksu.edu.sa/ar' },
  { label: 'البحث العلمي', href: 'https://ksu.edu.sa/ar' },
  { label: 'الدراسة بالجامعة', href: 'https://ksu.edu.sa/ar' },
  { label: 'الحياة بالجامعة', href: 'https://ksu.edu.sa/ar' },
  { label: 'الخدمات الإلكترونية', href: 'https://ksu.edu.sa/ar' },
  { label: 'المركز الإعلامي', href: 'https://ksu.edu.sa/ar' },
  { label: 'اللوائح والأنظمة', href: '/regulations', isNew: true, isInternal: true },
];

export default function Header() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50">
      {/* Government bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-11">
          <div className="flex items-center gap-3">
            <img src="https://ksu.edu.sa/saudi-flag.svg" alt="علم المملكة" className="h-4 w-7 object-contain" />
            <span className="text-xs text-gray-500 hidden sm:inline">موقع حكومي رسمي تابع لحكومة المملكة العربية السعودية</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="border border-emerald-700 text-emerald-700 px-3 py-0.5 rounded-full text-xs font-bold">نسخة تجريبية</span>
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
          <Link to="/" className="shrink-0">
            <img
              src="https://ksu.edu.sa/_next/image?url=%2Fksu_logo.png&w=384&q=75"
              alt="جامعة الملك سعود"
              className="h-14 w-auto"
            />
          </Link>

          <div className="hidden lg:flex items-center gap-0.5">
            {navItems.map((item) => {
              const isActive = item.isInternal && location.pathname === item.href;
              if (item.isInternal) {
                return (
                  <Link
                    key={item.label}
                    to={item.href}
                    className={`relative flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-full transition-all duration-200 ${
                      isActive
                        ? 'bg-emerald-800 text-white'
                        : 'text-gray-600 hover:bg-emerald-800 hover:text-white'
                    }`}
                  >
                    {item.label}
                    {item.isNew && (
                      <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold leading-none">
                        جديد
                      </span>
                    )}
                  </Link>
                );
              }
              return (
                <a
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-1 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-emerald-800 hover:text-white rounded-full transition-all duration-200"
                >
                  {item.label}
                  <svg className="w-3.5 h-3.5 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </a>
              );
            })}
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-emerald-800 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              البحث
            </button>
            <span className="text-gray-200">|</span>
            <button className="text-sm text-gray-500 hover:text-emerald-800 font-medium transition-colors">English</button>
          </div>

          <button className="lg:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            {navItems.map((item) =>
              item.isInternal ? (
                <Link
                  key={item.label}
                  to={item.href}
                  className="block px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-emerald-800 hover:text-white rounded-lg transition-all"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                  {item.isNew && (
                    <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold mr-2">جديد</span>
                  )}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  className="block px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-emerald-800 hover:text-white rounded-lg transition-all"
                >
                  {item.label}
                </a>
              )
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
