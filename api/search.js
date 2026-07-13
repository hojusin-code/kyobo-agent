const clientId     = 'LQiBBpg9tPtr0CU8q6EK';
const clientSecret = 'aEVIAXnb7M';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { isbn } = req.query;
  if (!isbn) return res.status(400).json({ error: 'isbn required' });

  try {
    const bookRes = await fetch(
      `https://openapi.naver.com/v1/search/book_adv.json?d_isbn=${isbn}&display=1`,
      {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
      }
    );
    const bookData = await bookRes.json();
    const item = bookData.items?.[0] || null;

    // 네이버 데이터랩 검색어트렌드: 최근 30일 실제 검색량 추이(자체 최고치=100 기준 상대지수)
    let interestScore = 0;
    let trend = 'flat';
    if (item?.title) {
      const fullTitle = item.title.replace(/<[^>]+>/g, '').split('(')[0].trim();
      // 권수까지 포함하면 검색량이 희소해 데이터랩이 빈 결과를 주는 경우가 많음 → 시리즈명으로 폴백
      const seriesTitle = fullTitle.replace(/\s*\d+\s*$/, '').trim();
      const candidates = seriesTitle && seriesTitle !== fullTitle ? [fullTitle, seriesTitle] : [fullTitle];

      const fmt = (d) => d.toISOString().slice(0, 10);
      const today = new Date();
      const start = new Date(today.getTime() - 29 * 86400000);

      for (const keyword of candidates) {
        const trendRes = await fetch('https://openapi.naver.com/v1/datalab/search', {
          method: 'POST',
          headers: {
            'X-Naver-Client-Id': clientId,
            'X-Naver-Client-Secret': clientSecret,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate: fmt(start),
            endDate: fmt(today),
            timeUnit: 'date',
            keywordGroups: [{ groupName: 'book', keywords: [keyword] }],
          }),
        });
        const trendData = await trendRes.json();
        const points = trendData.results?.[0]?.data || [];

        if (points.length) {
          interestScore = Math.round(points[points.length - 1].ratio);
          const last7 = points.slice(-7);
          const prev7 = points.slice(-14, -7);
          const avg = (arr) => arr.reduce((s, p) => s + p.ratio, 0) / (arr.length || 1);
          if (prev7.length) {
            const diff = avg(last7) - avg(prev7);
            trend = diff > 5 ? 'up' : diff < -5 ? 'down' : 'flat';
          }
          break;
        }
      }
    }

    res.status(200).json({ item, interestScore, trend });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
