module.exports = {
    // 기본 HTML 뼈대 생성
    html(menu, body) {
        return `
            <!DOCTYPE html>
            <html lang="ko">
            <head>
                <meta charset="UTF-8">
                <title>선린인터넷고등학교 도서관 관리</title>
                <style>
                    * { box-sizing: border-box; }
                    body { margin: 0; font-family: Arial, sans-serif; background: #f4f6f8; color: #222; }
                    .wrap { width: 900px; margin: 40px auto; }
                    .header { background: white; padding: 20px 28px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); margin-bottom: 20px; }
                    .header h1 { margin: 0; font-size: 26px; }
                    .header a { color: #222; text-decoration: none; }
                    .content { display: grid; grid-template-columns: 220px 1fr; gap: 20px; }
                    .menu { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
                    .body { background: white; padding: 28px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
                    a { color: #2563eb; text-decoration: none; }
                    a:hover { text-decoration: underline; }
                </style>
            </head>
            <body>
                <div class="wrap">
                    <div class="header">
                        <h1><a href="/">선린인터넷고 도서관</a></h1>
                    </div>
                    <div class="content">
                        <div class="menu">
                            ${menu}
                        </div>
                        <div class="body">
                            ${body}
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
    },
    
    // [추가 학습/수정] 도서 목록 및 서가 메뉴 조작 링크
    menu(books, id) {
        let result = '<ol>';
        for (let i = 0; i < books.length; i++) {
            result += `<li><a href="/${books[i].id}">${books[i].title}</a></li>`;
        }
        result += '</ol>';
        result += '<hr>';
        result += '<a href="/create">도서 등록 (Create)</a>';
        if (id) {
            result += `<br><a href="/update/${id}">도서 수정 (Update)</a>`;
            result += `<br><a href="/delete/${id}">도서 삭제 (Delete)</a>`;
        }
        result += '<hr>';
        result += '<a href="/bookshelf">서가 목록 및 통계</a>';
        return result;
    },

    // [생성형 AI 활용] 도서 등록 입력 폼 (서가 + 카테고리 옵션 선택창 포함)
    create(bookshelves, categories) {
        let bookshelfList = '<option value="">서가 선택 안 함</option>';
        for (let i = 0; i < bookshelves.length; i++){
            bookshelfList += `<option value="${bookshelves[i].id}">${bookshelves[i].zone} (${bookshelves[i].floor}층)</option>`;
        }

        let categoryList = '<option value="">카테고리 선택 안 함</option>';
        for (let i = 0; i < categories.length; i++){
            categoryList += `<option value="${categories[i].id}">${categories[i].category_name}</option>`;
        }

        return `
            <h2>도서 등록</h2>
            <form action="/create" method="post">
                <p><input type="text" name="title" placeholder="도서 제목" required></p>
                <p><input type="text" name="author" placeholder="저자 이름" required></p>
                <p><input type="text" name="publisher" placeholder="출판사"></p>
                <p>서가 위치: <select name="bookshelf_id">${bookshelfList}</select></p>
                <p>카테고리: <select name="category_id">${categoryList}</select></p>
                <p><button type="submit">등록하기</button></p>
            </form>
        `;
    },

    // [생성형 AI 활용] 도서 수정 폼 (기존 등록 서가/카테고리 자동 selected 처리)
    update(book, bookshelves, categories) {
        let bookshelfList = '<option value="">서가 선택 안 함</option>';
        for (let i = 0; i < bookshelves.length; i++){
            bookshelfList += `
                <option value="${bookshelves[i].id}" ${book.bookshelf_id == bookshelves[i].id ? 'selected' : ''}>
                    ${bookshelves[i].zone} (${bookshelves[i].floor}층)
                </option>
            `;
        }

        let categoryList = '<option value="">카테고리 선택 안 함</option>';
        for (let i = 0; i < categories.length; i++){
            categoryList += `
                <option value="${categories[i].id}" ${book.category_id == categories[i].id ? 'selected' : ''}>
                    ${categories[i].category_name}
                </option>
            `;
        }

        return `
            <h2>도서 정보 수정</h2>            
            <form action="/update" method="post">
                <input type="hidden" name="id" value="${book.id}">
                <p>제목: <input type="text" name="title" value="${book.title}"></p>
                <p>저자: <input type="text" name="author" value="${book.author}"></p>
                <p>출판사: <input type="text" name="publisher" value="${book.publisher ?? ''}"></p>
                <p>서가 위치: <select name="bookshelf_id">${bookshelfList}</select></p>
                <p>카테고리: <select name="category_id">${categoryList}</select></p>
                <p><button type="submit">수정 완료</button></p>
            </form>
        `;
    },

    // [추가 학습/수정] 도서 삭제 안내
    delete(book){
        return `
            <h2>도서 삭제</h2>
            <p><strong>${book.title}</strong> 도서를 정말로 삭제하시겠습니까?</p>
            <form action="/delete" method="post">
                <input type="hidden" name="id" value="${book.id}">
                <button type="submit">삭제하기</button>
            </form>
        `;
    },

    // [추가 학습/수정] 3개 테이블 JOIN 연생 데이터 상세 출력
    read(book){
        return `
            <h2>${book.title}</h2>
            <p><strong>저자 :</strong> ${book.author}</p>
            <p><strong>출판사 :</strong> ${book.publisher ?? '정보 없음'}</p>
            <p><strong>카테고리 :</strong> ${book.category_name ?? '미지정'}</p>
            <p><strong>서가 위치 :</strong> ${book.zone ? `${book.zone} (${book.floor}층)` : '미배치'}</p>
            <p><strong>등록일 :</strong> ${book.created}</p>
        `;
    }
};