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
let userStats = {}; 

io.on('connection', (socket) => {
    console.log('새로운 사용자가 고깃집에 입장했습니다!');

    onlineUsers++;
    io.emit('user count', onlineUsers);
    
    socket.emit('load board', boardMessages);
    socket.emit('load notice', currentNotice);
    
    emitRankings();

    socket.on('user joined', (nickname) => {
        socket.nickname = nickname; 
        
        if (!userStats[nickname]) {
            userStats[nickname] = { soju: 0, soda: 0 };
        }
        
        socket.broadcast.emit('user joined notification', nickname); 
        emitRankings(); 
    });

    socket.on('chat message', (data) => {
        io.emit('chat message', data); 
    });

    socket.on('add beverage', (data) => {
        const { nickname, type } = data;
        
        if (!userStats[nickname]) {
            userStats[nickname] = { soju: 0, soda: 0 };
        }
        
        if (type === 'soju') userStats[nickname].soju++;
        if (type === 'soda') userStats[nickname].soda++;
        
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

function emitRankings() {
    const sojuRank = Object.entries(userStats)
        .filter(entry => entry[1].soju > 0) 
        .sort((a, b) => b[1].soju - a[1].soju)
        .slice(0, 3) 
        .map(entry => ({ nickname: entry[0], count: entry[1].soju }));

    const sodaRank = Object.entries(userStats)
        .filter(entry => entry[1].soda > 0)
        .sort((a, b) => b[1].soda - a[1].soda)
        .slice(0, 3)
        .map(entry => ({ nickname: entry[0], count: entry[1].soda }));

    io.emit('update rankings', { sojuRank, sodaRank });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Soju JJAN 서버가 포트 ${PORT}에서 실행 중입니다! 🍻`);
});
