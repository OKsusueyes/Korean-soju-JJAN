const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// public 폴더 안의 정적 파일(index.html, 이미지 등) 제공
app.use(express.static('public'));

// 데이터 저장용 변수들
let boardMessages = [];
const MAX_BOARD_MESSAGE = 30; // 문의사항 최대 저장 개수 (30개 초과 시 오래된 것부터 삭제)

let currentNotice = "Welcome to K-BBQ! 🍖\nGrab a soju glass and let's JJAN! 🍻";
const ADMIN_PASSWORD = "admin"; // 공지사항 수정 비밀번호

// 🌟 새로 추가됨: 현재 접속 중인 유저 수
let onlineUsers = 0; 

io.on('connection', (socket) => {
    console.log('새로운 사용자가 고깃집에 입장했습니다!');

    // 🌟 유저가 접속하면 인원수를 1 증가시키고 모두에게 알림
    onlineUsers++;
    io.emit('user count', onlineUsers);

    // 새로 접속한 유저에게 기존 데이터 전송
    socket.emit('load board', boardMessages);
    socket.emit('load notice', currentNotice);

    // 🌟 새로 추가됨: 유저가 닉네임을 보내면 서버에 기억하고, 본인 제외 모두에게 입장 알림
    socket.on('user joined', (nickname) => {
        socket.nickname = nickname; // 소켓 객체에 닉네임 저장 (나갈 때 쓰기 위함)
        socket.broadcast.emit('user joined notification', nickname); // broadcast: 나를 제외한 모두에게 전송
    });

    // 일반 채팅 메시지 릴레이
    socket.on('chat message', (data) => {
        io.emit('chat message', data); 
    });

    // 문의사항(Inquiries/기존 영수증) 저장 로직
    socket.on('save board message', (boardData) => {
        boardMessages.unshift(boardData); // 최신 글을 맨 위에 추가
        
        // 30개가 넘어가면 가장 마지막(오래된) 글 삭제
        if (boardMessages.length > MAX_BOARD_MESSAGE) {
            boardMessages.pop();
        }
        
        io.emit('load board', boardMessages);
    });

    // 공지사항 업데이트 로직
    socket.on('update notice', (data) => {
        if (data.password === ADMIN_PASSWORD) {
            currentNotice = data.notice;
            io.emit('load notice', currentNotice);
        } else {
            socket.emit('notice error'); // 비밀번호 틀림
        }
    });

    // 유저가 나갔을 때(새로고침, 창 닫기 등)
    socket.on('disconnect', () => {
        console.log('사용자가 퇴장했습니다.');
        
        // 🌟 인원수를 1 감소시키고 모두에게 알림
        onlineUsers--;
        io.emit('user count', onlineUsers);

        // 🌟 아까 기억해둔 닉네임이 있다면 모두에게 퇴장 알림 전송
        if (socket.nickname) {
