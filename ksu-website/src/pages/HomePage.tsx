import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-emerald-900">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 60%), radial-gradient(ellipse at 80% 30%, rgba(255,255,255,0.15) 0%, transparent 60%)',
        }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36 relative z-10 text-center text-white">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">جامعة الملك سعود</h1>
          <p className="text-lg md:text-xl text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed">الريادة العالمية والتميز في بناء مجتمع المعرفة</p>
          <a href="https://ksu.edu.sa/strategy-and-values" className="inline-block border-2 border-white/30 text-white px-10 py-3.5 rounded-full text-base font-semibold hover:bg-white hover:text-emerald-900 transition-all duration-300">المزيد</a>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 text-gray-900">الجامعة في أرقام</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { number: '17.4', label: 'أبرز تصنيفات الجامعة لهذا العام' },
              { number: '0.3', label: 'أبرز انجازات الجامعة لهذا العام' },
              { number: '1', label: 'المركز الأول في علم الأورام وطب القلب' },
              { number: '3%', label: 'من إجمالي أبحاث المملكة العربية السعودية' },
            ].map((stat, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-8 text-center border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-4xl md:text-5xl font-extrabold text-emerald-800 mb-2">{stat.number}</div>
                <p className="text-sm text-gray-500 leading-relaxed">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Regulations CTA */}
      <section className="py-16 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-5 text-gray-900">اللوائح والأنظمة</h2>
          <p className="text-gray-500 text-base mb-8 max-w-3xl mx-auto leading-relaxed">
            تصفح جميع اللوائح والأنظمة الرسمية لجامعة الملك سعود بما في ذلك لوائح البحث العلمي والموارد البشرية وشؤون الطلاب والقبول والتسجيل والمشتريات والإسكان والكراسي البحثية
          </p>
          <Link to="/regulations" className="inline-block bg-emerald-800 text-white px-10 py-3.5 rounded-full text-base font-semibold hover:bg-emerald-900 transition-colors duration-200">
            تصفح اللوائح والأنظمة
          </Link>
        </div>
      </section>

      {/* News */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">آخر الأخبار</h2>
            <a href="https://ksu.edu.sa/news" className="flex items-center gap-2 text-sm text-emerald-800 font-semibold hover:underline">
              المزيد
              <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { date: '19/04/2026', title: 'معرض اليوم العالمي للإبداع والابتكار', desc: 'تدعوكم جامعة الملك سعود ممثلةً في مركز الابتكار بمعهد ريادة الأعمال لحضور معرض اليوم العالمي للإبداع والابتكار.' },
              { date: '15/04/2026', title: 'كلية طب الاسنان تحقق العديد من الإنجازات', desc: 'حققت جامعة الملك سعود ممثلةً في كلية طب الأسنان، إنجازًا مميزًا بحصول فريق الكلية على المركز الثالث في هاكاثون ابتكار النظم الصحية.' },
              { date: '08/04/2026', title: 'المؤتمر الدولي العاشر للجمعية السعودية للإعلام', desc: 'أنطلقت أعمال المؤتمر الدولي العاشر للجمعية السعودية للإعلام والاتصال، تحت شعار "إعلام الذكاء الاصطناعي.. الفرص والتحديات".' },
            ].map((news, i) => (
              <div key={i} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow duration-200 group">
                <div className="bg-gray-100 h-48 flex items-center justify-center">
                  <svg className="w-14 h-14 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    تاريخ آخر تعديل: {news.date}
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-3 group-hover:text-emerald-800 transition-colors">{news.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">{news.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
