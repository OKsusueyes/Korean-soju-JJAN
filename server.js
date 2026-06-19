const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let boardMessages = [];
const MAX_BOARD_MESSAGE = 30; 

let currentNotice = "Welcome to K-BBQ! 🍖\nGrab a soju glass and let's JJAN! 🍻";
const ADMIN_PASSWORD = "admin"; 

let onlineUsers = 0; 

// 🌟 새로 추가됨: 유저별 소주/사이다 랭킹 데이터 저장소
let userStats = {}; // 예: { "Sujin": { soju: 3, soda: 1 }, "Guest01": { soju: 5, soda: 0 } }

io.on('connection', (socket) => {
    console.log('새로운 사용자가 고깃집에 입장했습니다!');

    onlineUsers++;
    io.emit('user count', onlineUsers);
    
    socket.emit('load board', boardMessages);
    socket.emit('load notice', currentNotice);
    
    // 처음 접속한 유저에게 현재 랭킹 쏴주기
    emitRankings();

    socket.on('user joined', (nickname) => {
        socket.nickname = nickname; 
        
        // 🌟 유저가 처음 들어왔을 때 통계 저장소에 자리 만들어주기
        if (!userStats[nickname]) {
            userStats[nickname] = { soju: 0, soda: 0 };
        }
        
        socket.broadcast.emit('user joined notification', nickname); 
        emitRankings(); // 랭킹 업데이트
    });

    socket.on('chat message', (data) => {
        io.emit('chat message', data); 
    });

    // 🌟 새로 추가됨: 클라이언트에서 소주/사이다를 추가했을 때 랭킹 계산
    socket.on('add beverage', (data) => {
        const { nickname, type } = data;
        
        if (!userStats[nickname]) {
            userStats[nickname] = { soju: 0, soda: 0 };
        }
        
        if (type === 'soju') userStats[nickname].soju++;
        if (type === 'soda') userStats[nickname].soda++;
        
        // 랭킹 재계산 후 모두에게 방송
        emitRankings();
    });

    socket.on('save board message', (boardData) => {
        boardMessages.unshift(boardData); 
        if (boardMessages.length > MAX_BOARD_MESSAGE) {
            boardMessages.pop();
        }
        io.emit('load board', boardMessages);
    });

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
        onlineUsers--;
        io.emit('user count', onlineUsers);

        if (socket.nickname) {
            io.emit('user left notification', socket.nickname);
        }
    });
});

// 🌟 새로 추가됨: Top 3 랭킹 계산 및 전송 함수
function emitRankings() {
    // 소주 랭킹 정렬 (soju 값이 높은 순)
    const sojuRank = Object.entries(userStats)
        .filter(entry => entry[1].soju > 0) // 0병인 사람은 제외
        .sort((a, b) => b[1].soju - a[1].soju)
        .slice(0, 3) // 1~3위만 자르기
        .map(entry => ({ nickname: entry[0], count: entry[1].soju }));

    // 사이다 랭킹 정렬 (soda 값이 높은 순)
    const sodaRank = Object.entries(userStats)
        .filter(entry => entry[1].soda > 0)
        .sort((a, b) => b[1].soda - a[1].soda)
        .slice(0, 3)
        .map(entry => ({ nickname: entry[0], count: entry[1].soda }));

    // 클라이언트들로 데이터 전송
    io.emit('update rankings', { sojuRank, sodaRank });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Soju JJAN 서버가 포트 ${PORT}에서 실행 중입니다! 🍻`);
});
