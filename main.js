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

db.connect((err) => {
  if (err) {
    console.error('DB 연결 실패:', err);
    return;
  }
  console.log('Aiven MySQL 연결 성공!');
  initDatabase(); // 연결 직후 순서대로 테이블 및 데이터 생성
});

// 1. 순차적 DB 테이블 및 초기 데이터 생성 함수
function initDatabase() {
  const createBookshelf = `
  CREATE TABLE IF NOT EXISTS bookshelf (
    id INT NOT NULL AUTO_INCREMENT,
    zone VARCHAR(50) NOT NULL,
    floor INT NOT NULL DEFAULT 1,
    PRIMARY KEY (id)
  );`;

  const createCategory = `
  CREATE TABLE IF NOT EXISTS category (
    id INT NOT NULL AUTO_INCREMENT,
    category_name VARCHAR(100) NOT NULL,
    PRIMARY KEY (id)
  );`;

  const createBook = `
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

  // (1) 서가 테이블 생성 -> 기본 데이터 삽입
  db.query(createBookshelf, () => {
    console.log('bookshelf 테이블 확인 완료');
    db.query("INSERT IGNORE INTO bookshelf (id, zone, floor) VALUES (1, 'A구역 (문학)', 1), (2, 'B구역 (과학)', 2), (3, 'C구역 (IT/컴퓨터)', 2)");
  });

  // (2) 카테고리 테이블 생성 -> 기본 데이터 삽입
  db.query(createCategory, () => {
    console.log('category 테이블 확인 완료');
    db.query("INSERT IGNORE INTO category (id, category_name) VALUES (1, '소설'), (2, '인문학'), (3, '전공/기술'), (4, '기타')");
  });

  // (3) 도서 테이블 생성 -> 부족한 컬럼 확실히 추가 (에러 무시 처리)
  db.query(createBook, () => {
    console.log('book 테이블 확인 완료');
    const alterQueries = [
      "ALTER TABLE book ADD COLUMN publisher VARCHAR(100) NULL",
      "ALTER TABLE book ADD COLUMN bookshelf_id INT NULL",
      "ALTER TABLE book ADD COLUMN category_id INT NULL"
    ];
    alterQueries.forEach(q => {
      db.query(q, () => {}); // 이미 존재하더라도 에러로 무너지지 않게 빈 콜백 처리
    });
  });
}

process.on('uncaughtException', (err) => {
  console.error('예외 발생 (서버 유지됨):', err);
});

app.use(express.urlencoded({ extended: true }));

function menu(id, callback) {
  db.query('SELECT id, title FROM book', function (err, results) {
    if (err) {
      console.error('메뉴 조회 에러:', err);
      return callback(template.menu([], id));
    }
    callback(template.menu(results, id));
  });
}

// 2. 라우터 핸들러 (CRUD & JOIN)
app.get('/', (req, res) => {
  menu(null, function(menuHtml){
    res.send(template.html(menuHtml, `
      <h2>메인페이지</h2>
      <p>선린인터넷고등학교 통합 도서 및 서가 관리 시스템입니다.</p>
    `));    
  });    
});

app.get('/create', (req, res) => {
  db.query('SELECT * FROM bookshelf', function(err, bookshelves){
    if (err || !bookshelves) bookshelves = [];
    db.query('SELECT * FROM category', function(err, categories){
      if (err || !categories) categories = [];
      menu(null, function(menuHtml){
        res.send(template.html(menuHtml, template.create(bookshelves, categories)));
      });    
    });
  });    
});

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
        console.error('도서 등록 에러 상세:', err);
        return res.status(500).send(`도서 등록 중 오류가 발생했습니다: ${err.message}`);
      }
      res.redirect(`/${results.insertId}`);
    }
  );
});

app.get('/update/:id', (req, res) => {
  const id = Number(req.params.id);
  db.query('SELECT * FROM book WHERE id=?', [id], function (err, results) {
    if (err || !results || results.length === 0) { return res.status(404).send('404 Not Found'); }
    const book = results[0];

    db.query('SELECT * FROM bookshelf', function(err, bookshelves){
      if (err || !bookshelves) bookshelves = [];
      db.query('SELECT * FROM category', function(err, categories){
        if (err || !categories) categories = [];
        menu(null, function(menuHtml){
          res.send(template.html(menuHtml, template.update(book, bookshelves, categories)));
        });    
      });
    });        
  });
});

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
