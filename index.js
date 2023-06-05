const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Armazenar informações sobre os jogadores conectados
const players = {};

app.use(express.static('pages'));

io.on('connection', (socket) => {
  console.log('Novo jogador conectado');

  // Evento disparado quando um jogador entra no jogo
  socket.on('joinGame', (data) => {
    const { playerName } = data;
    players[socket.id] = {
      name: playerName,
      type: '',
      number: 0,
    };

    socket.emit('gameJoined', { playerId: socket.id });
    console.log(`Jogador ${playerName} entrou no jogo`);

    // Verifica se há dois jogadores para iniciar o jogo
    const playerCount = Object.keys(players).length;
    if (playerCount === 2) {
      startGame();
    }
  });

  // Evento disparado quando um jogador faz sua escolha
  socket.on('makeChoice', (data) => {
    const { playerId, choice, number } = data;
    players[playerId].type = choice;
    players[playerId].number = number;
    console.log(`Jogador ${players[playerId].name} escolheu ${choice} e informou o número ${number}`);
    checkResult();
  });

  // Evento disparado quando um jogador desconecta
  socket.on('disconnect', () => {
    const player = players[socket.id];
    if (player) {
      console.log(`Jogador ${player.name} desconectou`);
      delete players[socket.id];
    }
  });
});

function startGame() {
  const playerIds = Object.keys(players);
  const player1 = players[playerIds[0]];
  const player2 = players[playerIds[1]];

  io.to(playerIds[0]).emit('gameStart', {
    opponentName: player2.name,
  });

  io.to(playerIds[1]).emit('gameStart', {
    opponentName: player1.name,
  });
}

function checkResult() {
  const playerIds = Object.keys(players);
  if (playerIds.length === 2) {
    const player1 = players[playerIds[0]];
    const player2 = players[playerIds[1]];

    if (player1.type !== '' && player2.type !== '') {
      const sum = player1.number + player2.number;
      const isSumEven = sum % 2 === 0;

      if ((isSumEven && player1.type === 'par') || (!isSumEven && player1.type === 'ímpar')) {
        io.to(playerIds[0]).emit('gameResult', { result: 'Vitória' });
        io.to(playerIds[1]).emit('gameResult', { result: 'Derrota' });
      } else if ((isSumEven && player2.type === 'par') || (!isSumEven && player2.type === 'ímpar')) {
        io.to(playerIds[1]).emit('gameResult', { result: 'Vitória' });
        io.to(playerIds[0]).emit('gameResult', { result: 'Derrota' });
      } else {
        io.to(playerIds[0]).emit('gameResult', { result: 'Empate' });
        io.to(playerIds[1]).emit('gameResult', { result: 'Empate' });
      }
    }
  }
}

const port = 3000;
server.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
