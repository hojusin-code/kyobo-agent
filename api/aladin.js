const TTB_KEY = 'ttbhojusin1324001';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { isbn } = req.query;
  if (!isbn) return res.status(400).json({ error: 'isbn required' });

  try {
    const url = `http://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?ttbkey=${TTB_KEY}&itemIdType=ISBN13&ItemId=${isbn}&output=js&Version=20131101&OptResult=bestSellerRank,reviewList&Cover=Big`;
    const aladinRes = await fetch(url);
    const text = await aladinRes.text();

    // 알라딘 API는 JS 콜백 형태 or JSON 반환 — output=js 시 순수 JSON
    const data = JSON.parse(text);
    const item = data.item?.[0] || null;

    if (!item) return res.status(200).json({ item: null });

    res.status(200).json({
      item: {
        title:          item.title,
        author:         item.author,
        publisher:      item.publisher,
        pubDate:        item.pubDate,
        cover:          item.cover,
        salesPoint:     item.salesPoint,
        bestSellerRank: item.bestSellerRank || null,
        customerReviewRank: item.customerReviewRank || null,
        categoryName:   item.categoryName || '',
        link:           item.link,
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
