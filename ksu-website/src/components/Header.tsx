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
      <div className="bg-[#f7f7f7] border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between h-10">
          <div className="flex items-center gap-2.5">
            <img src="https://ksu.edu.sa/saudi-flag.svg" alt="علم المملكة" className="h-3.5 w-6 object-contain" />
            <span className="text-[11px] text-[#555] font-medium">موقع حكومي رسمي تابع لحكومة المملكة العربية السعودية</span>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <span className="border border-[#0a5c36] text-[#0a5c36] px-3 py-0.5 rounded-full text-[10px] font-bold">نسخة تجريبية</span>
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between h-[70px]">
          {/* Logo */}
          <Link to="/" className="shrink-0">
            <img
              src="https://ksu.edu.sa/_next/image?url=%2Fksu_logo.png&w=384&q=75"
              alt="جامعة الملك سعود"
              className="h-[54px] w-auto"
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = item.isInternal && location.pathname === item.href;
              if (item.isInternal) {
                return (
                  <Link
                    key={item.label}
                    to={item.href}
                    className={`relative flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold rounded-full transition-all ${
                      isActive
                        ? 'bg-[#0a5c36] text-white'
                        : 'text-[#444] hover:bg-[#0a5c36] hover:text-white'
                    }`}
                  >
                    {item.label}
                    {item.isNew && (
                      <span className="bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold leading-none">
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
                  className="flex items-center gap-1 px-4 py-2 text-[13px] font-semibold text-[#444] hover:bg-[#0a5c36] hover:text-white rounded-full transition-all"
                >
                  {item.label}
                  <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </a>
              );
            })}
          </div>

          {/* Search + Language */}
          <div className="hidden lg:flex items-center gap-3">
            <button className="flex items-center gap-1.5 text-[13px] text-[#444] hover:text-[#0a5c36] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              البحث
            </button>
            <span className="text-gray-300">|</span>
            <button className="text-[13px] text-[#444] hover:text-[#0a5c36] font-medium transition-colors">English</button>
          </div>

          {/* Mobile hamburger */}
          <button className="lg:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            <svg className="w-6 h-6 text-[#444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white px-6 py-4 space-y-2">
            {navItems.map((item) =>
              item.isInternal ? (
                <Link
                  key={item.label}
                  to={item.href}
                  className="block px-4 py-2.5 text-[14px] font-semibold text-[#444] hover:bg-[#0a5c36] hover:text-white rounded-lg transition-all"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                  {item.isNew && (
                    <span className="bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold mr-2">جديد</span>
                  )}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  className="block px-4 py-2.5 text-[14px] font-semibold text-[#444] hover:bg-[#0a5c36] hover:text-white rounded-lg transition-all"
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
