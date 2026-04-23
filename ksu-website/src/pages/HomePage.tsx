import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #064225 0%, #0a5c36 40%, #0d7a48 100%)' }}>
        <div className="absolute inset-0">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 30%, rgba(255,255,255,0.05) 0%, transparent 60%)',
          }} />
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }} />
        </div>
        <div className="max-w-[1200px] mx-auto px-6 py-20 md:py-32 relative z-10 text-center text-white">
          <h1 className="text-4xl md:text-[52px] font-extrabold mb-5 leading-tight tracking-tight">جامعة الملك سعود</h1>
          <p className="text-base md:text-lg text-white/75 mb-8 max-w-xl mx-auto leading-relaxed">الريادة العالمية والتميز في بناء مجتمع المعرفة</p>
          <a href="https://ksu.edu.sa/strategy-and-values" className="inline-block border-2 border-white/40 text-white px-8 py-3 rounded-full text-sm font-semibold hover:bg-white hover:text-[#0a5c36] transition-all">المزيد</a>
        </div>
      </section>

      {/* Stats */}
      <section className="py-14 bg-white">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-10 text-[#1a1a1a]">الجامعة في أرقام</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { number: '17.4', label: 'أبرز تصنيفات الجامعة لهذا العام' },
              { number: '0.3', label: 'أبرز انجازات الجامعة لهذا العام' },
              { number: '1', label: 'المركز الأول في علم الأورام وطب القلب' },
              { number: '3%', label: 'من إجمالي أبحاث المملكة العربية السعودية' },
            ].map((stat, i) => (
              <div key={i} className="bg-[#f9fafb] rounded-lg p-6 text-center border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-3xl md:text-4xl font-extrabold text-[#0a5c36] mb-1.5">{stat.number}</div>
                <p className="text-[13px] text-gray-500 leading-relaxed">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Regulations CTA */}
      <section className="py-14 bg-[#f9fafb] border-y border-gray-100">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold mb-4 text-[#1a1a1a]">اللوائح والأنظمة</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-2xl mx-auto leading-relaxed">
            تصفح جميع اللوائح والأنظمة الرسمية لجامعة الملك سعود بما في ذلك لوائح البحث العلمي والموارد البشرية وشؤون الطلاب والقبول والتسجيل والمشتريات والإسكان والكراسي البحثية
          </p>
          <Link to="/regulations" className="inline-block bg-[#0a5c36] text-white px-8 py-3 rounded-full text-sm font-semibold hover:bg-[#064225] transition-colors">
            تصفح اللوائح والأنظمة
          </Link>
        </div>
      </section>

      {/* News */}
      <section className="py-14 bg-white">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-[#1a1a1a]">آخر الأخبار</h2>
            <a href="https://ksu.edu.sa/news" className="flex items-center gap-1.5 text-[13px] text-[#0a5c36] font-semibold hover:underline">
              المزيد
              <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { date: '19/04/2026', title: 'معرض اليوم العالمي للإبداع والابتكار', desc: 'تدعوكم جامعة الملك سعود ممثلةً في مركز الابتكار بمعهد ريادة الأعمال لحضور معرض اليوم العالمي للإبداع والابتكار.' },
              { date: '15/04/2026', title: 'كلية طب الاسنان تحقق العديد من الإنجازات', desc: 'حققت جامعة الملك سعود ممثلةً في كلية طب الأسنان، إنجازًا مميزًا بحصول فريق الكلية على المركز الثالث في هاكاثون ابتكار النظم الصحية.' },
              { date: '08/04/2026', title: 'المؤتمر الدولي العاشر للجمعية السعودية للإعلام', desc: 'أنطلقت أعمال المؤتمر الدولي العاشر للجمعية السعودية للإعلام والاتصال، تحت شعار "إعلام الذكاء الاصطناعي.. الفرص والتحديات".' },
            ].map((news, i) => (
              <div key={i} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow group">
                <div className="bg-gray-100 h-44 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 text-[12px] text-gray-400 mb-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    تاريخ آخر تعديل: {news.date}
                  </div>
                  <h3 className="text-[15px] font-bold text-[#1a1a1a] mb-2 group-hover:text-[#0a5c36] transition-colors">{news.title}</h3>
                  <p className="text-[13px] text-gray-500 leading-relaxed line-clamp-3">{news.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
