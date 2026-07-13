const TTB_KEY = 'ttbhojusin1324001';

// 앱 내부 분야명 → 알라딘 국내도서 카테고리ID(CID) 매핑 (Bestseller API로 실측 검증됨)
const CATEGORY_CID = {
  '소설': 1,
  '한국소설': 1,
  '경제경영': 170,
  '인문': 656,
  '자기계발': 336,
  '아동': 1108,
  '아동 학습만화': 1108,
  '만화': 2551,
  '판타지': 2551,
};

const PAGE_SIZE = 50;
const MAX_PAGES = 4; // 카테고리 베스트셀러 최대 200위까지 스캔

// 알라딘은 "신간 중 베스트"를 별도로 제공하지 않는다.
// 카테고리 베스트셀러(실판매 순위) 목록을 스캔하며 최근 출간작만 걸러내는 방식으로 만든다.
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { category } = req.query;
  const days = Math.min(60, Math.max(1, parseInt(req.query.days, 10) || 5));
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 5));
  const cid = CATEGORY_CID[category] || null;

  try {
    const found = [];
    const now = Date.now();

    for (let page = 1; page <= MAX_PAGES; page++) {
      const catParam = cid ? `&CategoryId=${cid}` : '';
      const url = `http://www.aladin.co.kr/ttb/api/ItemList.aspx?ttbkey=${TTB_KEY}&QueryType=Bestseller${catParam}&MaxResults=${PAGE_SIZE}&start=${page}&SearchTarget=Book&output=js&Version=20131101`;
      const r = await fetch(url);
      const data = JSON.parse(await r.text());
      const items = data.item || [];

      for (const it of items) {
        if (!it.pubDate) continue;
        const daysSince = Math.floor((now - new Date(it.pubDate).getTime()) / 86400000);
        if (daysSince >= 0 && daysSince <= days) {
          found.push({
            rank: it.bestRank,
            title: it.title,
            author: it.author,
            pubDate: it.pubDate,
            daysSince,
            salesPoint: it.salesPoint,
            link: it.link,
          });
        }
      }
      if (items.length < PAGE_SIZE) break;
    }

    found.sort((a, b) => a.rank - b.rank);
    res.status(200).json({ items: found.slice(0, limit) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
