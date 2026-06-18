const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// public 폴더 안의 정적 파일 제공
app.use(express.static('public'));

let boardMessages = [];
const MAX_BOARD_MESSAGE = 30; // 🌟 영수증 최대 저장 개수 (30개)

let currentNotice = "Welcome to Online Soju-JJAN ! 🥛🥛 \nGrab a soju glass and let's JJAN! 🍻";
const ADMIN_PASSWORD = "admin"; // 공지사항 수정 비밀번호

io.on('connection', (socket) => {
    console.log('새로운 사용자가 고깃집에 입장했습니다!');

    // 기존 데이터 전송
    socket.emit('load board', boardMessages);
    socket.emit('load notice', currentNotice);

    // 채팅 메시지 릴레이
    socket.on('chat message', (data) => {
        io.emit('chat message', data); 
    });

    // 🌟 영수증(게시판) 저장 및 오래된 내역 삭제 로직
    socket.on('save board message', (boardData) => {
        boardMessages.unshift(boardData); // 최신 글을 맨 위에 추가
        
        // 30개가 넘어가면 가장 마지막(오래된) 글 삭제
        if (boardMessages.length > MAX_BOARD_MESSAGE) {
            boardMessages.pop();
        }
        
        io.emit('load board', boardMessages);
    });

    // 공지사항 업데이트
    socket.on('update notice', (data) => {
        if (data.password === ADMIN_PASSWORD) {
            currentNotice = data.notice;
            io.emit('load notice', currentNotice);
        } else {
            socket.emit('notice error');
        }
    });

    socket.on('disconnect', () => {
        console.log('사용자가 퇴장했습니다.');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Soju JJAN 서버가 포트 ${PORT}에서 실행 중입니다!`);
});
