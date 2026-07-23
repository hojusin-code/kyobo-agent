// 사내 서버용 — 외부 라이브러리 설치 없이 Node.js만 있으면 바로 실행됩니다.
// 실행 방법: node server.js  (기본 포트 3000, 접속: http://서버주소:3000)
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const TTB_KEY      = 'ttbhojusin1324001';
const NAVER_ID     = 'LQiBBpg9tPtr0CU8q6EK';
const NAVER_SECRET = 'aEVIAXnb7M';
const PORT = process.env.PORT || 3000;

function fetchJSON(targetUrl, headers) {
  return new Promise((resolve, reject) => {
    https.get(targetUrl, { headers: headers || {} }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('외부 API 응답 파싱 실패: ' + e.message)); }
      });
    }).on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
};

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);

  // ── 알라딘 API 프록시 ──
  if (parsed.pathname === '/api/aladin') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const isbn = parsed.query.isbn;
    if (!isbn) { res.writeHead(400, {'Content-Type':'application/json'}); return res.end(JSON.stringify({error:'isbn required'})); }
    try {
      const apiUrl = `https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?ttbkey=${TTB_KEY}&itemIdType=ISBN13&ItemId=${isbn}&output=js&Version=20131101&OptResult=bestSellerRank,reviewList&Cover=Big`;
      const data = await fetchJSON(apiUrl);
      const item = (data.item && data.item[0]) || null;
      if (!item) { res.writeHead(200, {'Content-Type':'application/json'}); return res.end(JSON.stringify({item:null})); }
      res.writeHead(200, {'Content-Type':'application/json'});
      res.end(JSON.stringify({ item: {
        title: item.title, author: item.author, publisher: item.publisher, pubDate: item.pubDate,
        cover: item.cover, salesPoint: item.salesPoint, bestSellerRank: item.bestSellerRank || null,
        customerReviewRank: item.customerReviewRank || null, categoryName: item.categoryName || '', link: item.link,
      }}));
    } catch (e) {
      res.writeHead(500, {'Content-Type':'application/json'});
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // ── 네이버 검색 API 프록시 ──
  if (parsed.pathname === '/api/search') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const isbn = parsed.query.isbn;
    if (!isbn) { res.writeHead(400, {'Content-Type':'application/json'}); return res.end(JSON.stringify({error:'isbn required'})); }
    try {
      const bookUrl = `https://openapi.naver.com/v1/search/book_adv.json?d_isbn=${isbn}&display=1`;
      const bookData = await fetchJSON(bookUrl, { 'X-Naver-Client-Id': NAVER_ID, 'X-Naver-Client-Secret': NAVER_SECRET });
      const item = (bookData.items && bookData.items[0]) || null;

      let searchCount = 0;
      if (item && item.title) {
        const cleanTitle = item.title.replace(/<[^>]+>/g, '').split('(')[0].trim();
        const searchUrl = `https://openapi.naver.com/v1/search/book.json?query=${encodeURIComponent(cleanTitle)}&display=5`;
        const searchData = await fetchJSON(searchUrl, { 'X-Naver-Client-Id': NAVER_ID, 'X-Naver-Client-Secret': NAVER_SECRET });
        searchCount = searchData.total || 0;
      }
      res.writeHead(200, {'Content-Type':'application/json'});
      res.end(JSON.stringify({ item, searchCount }));
    } catch (e) {
      res.writeHead(500, {'Content-Type':'application/json'});
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // ── 정적 파일 서빙 (index.html 등) ──
  let filePath = parsed.pathname === '/' ? '/index.html' : parsed.pathname;
  filePath = path.join(__dirname, decodeURIComponent(filePath));
  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(404); return res.end('페이지를 찾을 수 없습니다.'); }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`서버 실행 중 — http://localhost:${PORT} 에서 접속하세요.`);
});
