import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { regulations, sources } from '../data/regulations';

const ITEMS_PER_PAGE = 12;

export default function RegulationsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState('الكل');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    let result = [...regulations];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((r) => r.title.toLowerCase().includes(q));
    }

    if (selectedSource !== 'الكل') {
      result = result.filter((r) => r.source === selectedSource);
    }

    if (sortOrder === 'desc') {
      result.reverse();
    }

    return result;
  }, [searchQuery, selectedSource, sortOrder]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getFileExtension = (url: string): string => {
    const ext = url.split('.').pop()?.toLowerCase() || '';
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx'].includes(ext)) return ext.toUpperCase();
    return 'PDF';
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header banner */}
      <div className="bg-[#f9fafb] border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 pt-6 pb-8">
          <nav className="flex items-center gap-2 text-[13px] text-gray-500 mb-4">
            <Link to="/" className="hover:text-[#0a5c36] transition-colors">الرئيسية</Link>
            <svg className="w-3 h-3 rotate-180 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[#0a5c36] font-medium">اللوائح والأنظمة</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-bold text-[#0a5c36]">اللوائح والأنظمة</h1>
          <p className="text-gray-500 mt-1.5 text-sm">جميع اللوائح والأنظمة والوثائق الرسمية لجامعة الملك سعود</p>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6">
        {/* Filters bar */}
        <div className="border-b border-gray-200 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {/* Search */}
            <div>
              <label className="block text-[13px] font-semibold text-gray-600 mb-2">العنوان</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="ابحث عن كلمة..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full border border-gray-300 rounded-md px-4 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0a5c36]/30 focus:border-[#0a5c36] placeholder-gray-400 bg-white"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Source filter */}
            <div>
              <label className="block text-[13px] font-semibold text-gray-600 mb-2">المصدر</label>
              <div className="relative">
                <select
                  value={selectedSource}
                  onChange={(e) => { setSelectedSource(e.target.value); setCurrentPage(1); }}
                  className="w-full border border-gray-300 rounded-md px-4 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0a5c36]/30 focus:border-[#0a5c36] bg-white appearance-none cursor-pointer"
                >
                  <option value="الكل">- الكل -</option>
                  {sources.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-[13px] font-semibold text-gray-600 mb-2">الترتيب</label>
              <div className="relative">
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  className="w-full border border-gray-300 rounded-md px-4 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0a5c36]/30 focus:border-[#0a5c36] bg-white appearance-none cursor-pointer"
                >
                  <option value="asc">من الأول</option>
                  <option value="desc">من الأخير</option>
                </select>
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Result count */}
            <div className="flex items-end">
              <p className="text-[13px] text-gray-500 pb-2.5">
                عرض {paginated.length} من {filtered.length} نتيجة
              </p>
            </div>
          </div>
        </div>

        {/* Results grid */}
        <div className="py-8">
          {paginated.length === 0 ? (
            <div className="text-center py-20">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-400 text-sm">لا توجد نتائج مطابقة للبحث</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginated.map((reg) => (
                <div
                  key={reg.id}
                  className="border border-gray-200 rounded-lg p-5 hover:shadow-md hover:border-[#0a5c36]/20 transition-all group"
                >
                  <h3 className="text-[15px] font-bold text-[#1a1a1a] mb-3 leading-relaxed group-hover:text-[#0a5c36] transition-colors line-clamp-2">
                    {reg.title}
                  </h3>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <span className="inline-block border border-[#0a5c36] text-[#0a5c36] text-[11px] px-2.5 py-0.5 rounded-full font-medium">
                      {reg.sourceLabel}
                    </span>
                    <span className="inline-block bg-gray-100 text-gray-600 text-[11px] px-2.5 py-0.5 rounded-full font-medium">
                      {getFileExtension(reg.url)}
                    </span>
                  </div>

                  {/* Download button */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-[12px] text-gray-400">#{reg.id}</span>
                    <a
                      href={reg.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[12px] text-[#0a5c36] font-semibold hover:underline"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      تحميل
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pb-10">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="w-9 h-9 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`w-9 h-9 rounded-md text-[13px] font-semibold ${
                  page === currentPage
                    ? 'bg-[#0a5c36] text-white'
                    : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="w-9 h-9 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
