const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const template = require('./template');
const sanitizeHtml = require('sanitize-html');
const mysql = require('mysql2');

const db = mysql.createConnection({
  host     : 'mysql-3a11cfa6-sunrint-4094.h.aivencloud.com',
  user     : 'avnadmin',
  password : 'AVNS_REnaUoRf1Fh_mgpU6KQ',
  database : 'defaultdb',
  port     : 18195,
  ssl      : { rejectUnauthorized: false }
});
db.connect();

// --------------------------------------------------------------------------
// 1. Aiven DB 테이블 자동 생성 및 기본 컬럼 맞춤 설정
// --------------------------------------------------------------------------

// (1) 서가(bookshelf) 테이블 생성
const createBookshelfTable = `
CREATE TABLE IF NOT EXISTS bookshelf (
  id INT NOT NULL AUTO_INCREMENT,
  zone VARCHAR(50) NOT NULL,
  floor INT NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);`;

// (2) 카테고리(category) 테이블 생성
const createCategoryTable = `
CREATE TABLE IF NOT EXISTS category (
  id INT NOT NULL AUTO_INCREMENT,
  category_name VARCHAR(100) NOT NULL,
  PRIMARY KEY (id)
);`;

// (3) 도서(book) 테이블 생성
const createBookTable = `
CREATE TABLE IF NOT EXISTS book (
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(100) NOT NULL,
  publisher VARCHAR(100) NULL,
  created DATETIME NOT NULL,
  bookshelf_id INT NULL,
  category_id INT NULL,
  PRIMARY KEY (id)
);`;

db.query(createBookshelfTable, (err) => {
  if (err) console.error('bookshelf 테이블 생성 에러:', err);
  else {
    console.log('bookshelf 테이블 준비 완료');
    // 기본 서가 샘플 데이터 자동 등록 (비어있을 경우)
    db.query('SELECT COUNT(*) AS cnt FROM bookshelf', (err, res) => {
      if (!err && res[0].cnt === 0) {
        db.query("INSERT INTO bookshelf (zone, floor) VALUES ('A구역 (문학)', 1), ('B구역 (과학)', 2), ('C구역 (IT/컴퓨터)', 2)");
      }
    });
  }
});

db.query(createCategoryTable, (err) => {
  if (err) console.error('category 테이블 생성 에러:', err);
  else {
    console.log('category 테이블 준비 완료');
    // 기본 카테고리 샘플 데이터 자동 등록 (비어있을 경우)
    db.query('SELECT COUNT(*) AS cnt FROM category', (err, res) => {
      if (!err && res[0].cnt === 0) {
        db.query("INSERT INTO category (category_name) VALUES ('소설'), ('인문학'), ('전공/기술'), ('기타')");
      }
    });
  }
});

db.query(createBookTable, (err) => {
  if (err) console.error('book 테이블 생성 에러:', err);
  else console.log('book 테이블 준비 완료');
});

// DB 예외 발생 시 서버 다운 방지
process.on('uncaughtException', (err) => {
  console.error('예외 발생 (서버 유지됨):', err);
});

app.use(express.urlencoded({ extended: true }));

// --------------------------------------------------------------------------
// 2. 공통 메뉴 생성 함수 (안전 예외 처리 추가)
// --------------------------------------------------------------------------
function menu(id, callback) {
  db.query('SELECT id, title FROM book', function (err, results) {
    if (err) {
      console.error('메뉴 조회 에러:', err);
      return callback(template.menu([], id));
    }
    callback(template.menu(results, id));
  });
}

// --------------------------------------------------------------------------
// 3. 라우터 핸들러
// --------------------------------------------------------------------------

// 메인 페이지 (Read)
app.get('/', (req, res) => {
  menu(null, function(menuHtml){
    res.send(template.html(menuHtml, `
      <h2>메인페이지</h2>
      <p>선린인터넷고등학교 통합 도서 및 서가 관리 시스템입니다.</p>
    `));    
  });    
});

// 도서 등록 화면 (Create)
app.get('/create', (req, res) => {
  db.query('SELECT * FROM bookshelf', function(err, bookshelves){
    if (err) {
      console.error('bookshelf 조회 에러:', err);
      bookshelves = [];
    }
    db.query('SELECT * FROM category', function(err, categories){
      if (err) {
        console.error('category 조회 에러:', err);
        categories = [];
      }
      menu(null, function(menuHtml){
        res.send(template.html(menuHtml, template.create(bookshelves, categories)));
      });    
    });
  });    
});

// 도서 신규 등록 처리 (POST /create)
app.post('/create', (req, res) => {
  const title = sanitizeHtml(req.body.title);
  const author = sanitizeHtml(req.body.author);
  const publisher = req.body.publisher === '' ? null : sanitizeHtml(req.body.publisher);
  const bookshelf_id = req.body.bookshelf_id === '' ? null : Number(req.body.bookshelf_id);
  const category_id = req.body.category_id === '' ? null : Number(req.body.category_id);

  db.query(
    'INSERT INTO book (title, author, publisher, created, bookshelf_id, category_id) VALUES (?, ?, ?, NOW(), ?, ?)',
    [title, author, publisher, bookshelf_id, category_id], function (err, results) {
      if (err) {
        console.error('도서 등록 에러:', err);
        return res.status(500).send('도서 등록 중 오류가 발생했습니다.');
      }
      res.redirect(`/${results.insertId}`);
    }
  );
});

// 도서 정보 수정 화면 (Update)
app.get('/update/:id', (req, res) => {
  const id = Number(req.params.id);
  db.query('SELECT * FROM book WHERE id=?', [id], function (err, results) {
    if (err || results.length === 0) { return res.status(404).send('404 Not Found'); }
    const book = results[0];

    db.query('SELECT * FROM bookshelf', function(err, bookshelves){
      if (err) bookshelves = [];
      db.query('SELECT * FROM category', function(err, categories){
        if (err) categories = [];
        menu(null, function(menuHtml){
          res.send(template.html(menuHtml, template.update(book, bookshelves, categories)));
        });    
      });
    });        
  });
});

// 도서 정보 수정 처리 (POST /update)
app.post('/update', (req, res) => {
  const id = Number(req.body.id);
  const title = sanitizeHtml(req.body.title);
  const author = sanitizeHtml(req.body.author);
  const publisher = req.body.publisher === '' ? null : sanitizeHtml(req.body.publisher);
  const bookshelf_id = req.body.bookshelf_id === '' ? null : Number(req.body.bookshelf_id);
  const category_id = req.body.category_id === '' ? null : Number(req.body.category_id);

  db.query(
    'UPDATE book SET title=?, author=?, publisher=?, bookshelf_id=?, category_id=? WHERE id=?',
    [title, author, publisher, bookshelf_id, category_id, id], function (err, results) {
      if (err) {
        console.error('수정 에러:', err);
        return res.status(500).send('수정 처리 중 오류가 발생했습니다.');
      }
      res.redirect(`/${id}`);
    }
  );
});

// 도서 삭제 확인 화면 (Delete)
app.get('/delete/:id', (req, res) => {
  const id = Number(req.params.id);
  db.query('SELECT * FROM book WHERE id=?', [id], function (err, results) {
    if (err || results.length === 0) { return res.status(404).send('404 Not Found'); }
    const book = results[0];        
    menu(id, function(menuHtml){
      res.send(template.html(menuHtml, template.delete(book)));
    });
  });
});

// 도서 삭제 처리 (POST /delete)
app.post('/delete', (req, res) => {
  const id = Number(req.body.id);
  db.query('DELETE FROM book WHERE id=?', [id], function (err, results) {
    if (err) {
      console.error('삭제 에러:', err);
      return res.status(500).send('삭제 처리 중 오류가 발생했습니다.');
    }
    res.redirect(`/`);
  });
});

// 서가 목록 및 통계 (Read)
app.get('/bookshelf', (req, res) => {    
  db.query(`
    SELECT bs.id, bs.zone, bs.floor, COUNT(b.id) AS book_count
    FROM bookshelf bs 
    LEFT JOIN book b ON bs.id = b.bookshelf_id
    GROUP BY bs.id, bs.zone, bs.floor
  `, function(err, bookshelves){
    if (err) {
      console.error('서가 통계 조회 에러:', err);
      bookshelves = [];
    }        
    menu(null, function(menuHtml){
      let list = `<h2>서가 목록 및 보유 수량 (통계)</h2><ul>`;
      for (let i = 0; i < bookshelves.length; i++){
        list += `<li>
          <a href='/bookshelf/${bookshelves[i].id}'>
            ${bookshelves[i].zone} (${bookshelves[i].floor}층) - 보관 도서 수: ${bookshelves[i].book_count}권
          </a>                
        </li>`;
      }
      list += '</ul>';
      res.send(template.html(menuHtml, list));
    });
  });
});

// 특정 서가 도서 목록 조회
app.get('/bookshelf/:id', (req, res) => {
  const id = Number(req.params.id);    
  db.query(`
    SELECT b.id, b.title, b.author, bs.zone, bs.floor 
    FROM book b
    RIGHT JOIN bookshelf bs ON b.bookshelf_id = bs.id 
    WHERE bs.id = ?
  `, [id], function(err, results){
    if (err || results.length === 0){
      return res.status(404).send('404 Not Found');
    }
    menu(null, function(menuHtml){
      let list = `<h2>${results[0].zone} (${results[0].floor}층) 서가 도서 목록</h2><ul>`;
      if (results[0].title === null){
        list += '<li>배치된 도서가 없습니다.</li>';
      } else {
        for (let i = 0; i < results.length; i++){
          list += `<li><a href='/${results[i].id}'>${results[i].title}</a> - 저자: ${results[i].author}</li>`;
        }
      }
      list += '</ul>';
      res.send(template.html(menuHtml, list));
    });
  });
});

// 3개 테이블 JOIN - 도서 상세 정보 조회
app.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { return res.status(404).send('404 Not Found'); } 

  db.query(`
    SELECT b.*, bs.zone, bs.floor, c.category_name 
    FROM book b
    LEFT JOIN bookshelf bs ON b.bookshelf_id = bs.id 
    LEFT JOIN category c ON b.category_id = c.id
    WHERE b.id = ?
  `, [id], function (err, results) {
    if (err || results.length === 0) { return res.status(404).send('404 Not Found'); }
    const book = results[0];
    menu(id, function(menuHtml){
      res.send(template.html(menuHtml, template.read(book)));
    });        
  });    
});

app.listen(port, () => {
  console.log(`도서관 관리 서버가 포트 ${port}에서 실행 중입니다.`);
});
