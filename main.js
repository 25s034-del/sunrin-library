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
// 1. Aiven DB 테이블 및 기본 데이터 자동 생성
// --------------------------------------------------------------------------

// (1) 서가(bookshelf) 테이블 생성 및 기본 데이터 삽입
const createBookshelfTable = `
CREATE TABLE IF NOT EXISTS bookshelf (
  id INT NOT NULL AUTO_INCREMENT,
  zone VARCHAR(50) NOT NULL,
  floor INT NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);`;

// (2) 카테고리(category) 테이블 생성 및 기본 데이터 삽입
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
    db.query("INSERT IGNORE INTO bookshelf (id, zone, floor) VALUES (1, 'A구역 (문학)', 1), (2, 'B구역 (과학)', 2), (3, 'C구역 (IT/컴퓨터)', 2)");
  }
});

db.query(createCategoryTable, (err) => {
  if (err) console.error('category 테이블 생성 에러:', err);
  else {
    console.log('category 테이블 준비 완료');
    db.query("INSERT IGNORE INTO category (id, category_name) VALUES (1, '소설'), (2, '인문학'), (3, '전공/기술'), (4, '기타')");
  }
});

db.query(createBookTable, (err) => {
  if
