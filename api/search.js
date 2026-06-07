export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { isbn } = req.query;
  if (!isbn) return res.status(400).json({ error: 'isbn required' });

  const clientId     = 'LQiBBpg9tPtr0CU8q6EK';
  const clientSecret = 'aEVIAXnb7M';

  try {
    // ISBN으로 도서 정보 조회
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

    // 도서 제목으로 검색량(관심도) 조회
    let searchCount = 0;
    if (item?.title) {
      const cleanTitle = item.title.replace(/<[^>]+>/g, '').split('(')[0].trim();
      const searchRes = await fetch(
        `https://openapi.naver.com/v1/search/book.json?query=${encodeURIComponent(cleanTitle)}&display=5`,
        {
          headers: {
            'X-Naver-Client-Id': clientId,
            'X-Naver-Client-Secret': clientSecret,
          },
        }
      );
      const searchData = await searchRes.json();
      searchCount = searchData.total || 0;
    }

    res.status(200).json({ item, searchCount });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
