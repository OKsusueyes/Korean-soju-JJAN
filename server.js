// server.js 내부 수정
let onlineUsers = 0; // 현재 접속자 수 저장 변수

io.on('connection', (socket) => {
    onlineUsers++; // 누군가 접속하면 +1
    io.emit('user count', onlineUsers); // 모든 사람에게 현재 인원 업데이트

    // 클라이언트가 닉네임을 보내면 전체 방에 입장 알림!
    socket.on('user joined', (nickname) => {
        socket.nickname = nickname; // 나갈 때를 대비해 소켓에 닉네임 기억하기
        socket.broadcast.emit('user joined notification', nickname); // 본인 제외 모두에게 알림
    });

    // ... (기존 채팅, 게시판, 공지사항 관련 코드 유지) ...

    socket.on('disconnect', () => {
        onlineUsers--; // 나가면 -1
        io.emit('user count', onlineUsers); // 업데이트된 인원 재전송
        
        if (socket.nickname) {
            io.emit('user left notification', socket.nickname); // 퇴장 메시지 전송
        }
    });
});
