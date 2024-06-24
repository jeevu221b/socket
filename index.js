const express = require("express");
const jwt = require("jsonwebtoken");
const app = express();
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { sleep } = require("./utils");
const roomUsersScore = require("./helper");
const server = http.createServer(app);
const dotenv = require("dotenv");
dotenv.config();
app.use(cors());
const PORT = process.env.PORT || 4005;
app.get("/", (req, res) => {
  res.send("Socket server running");
});
const io = new Server(server, {
  pingInterval: 10000, // default: 25000
  pingTimeout: 5000,
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const sessions = {};
const readyUsers = {};
let answerOrder = {};

io.on("connection", (socket) => {
  console.log(
    `************EVENT RECEIVED: new client connected **************** /n/n/n`
  );
  console.log("TOKEN:", socket.handshake.headers.authorization);
  let decodedToken;
  try {
    decodedToken = jwt.verify(
      socket.handshake.headers.authorization,
      "MY_SECRET_KEY"
    );
  } catch (err) {
    console.error("Token verification failed:", err);
  }
  console.log("Decoded token:", decodedToken);

  //find session where this users exists
  const sessionId = Object.keys(sessions).find((_id) =>
    sessions[_id]?.users.find((user) => user.userId === decodedToken?.userId)
  );

  console.log("Sessions", JSON.stringify(sessions));
  if (sessionId) {
    sessions[sessionId].users = sessions[sessionId]?.users.map((user) => {
      if (user.userId === decodedToken.userId) {
        //user joins the socket room
        socket.join(sessionId);
        user.socketId = socket.id;
        user.isOnline = true;
      }
      return user;
    });
    //Send the session info to the reconnected user
    console.log(
      "Before emmiting reconnectUserr:::::::",
      sessions[sessionId].users
    );
    // socket.emit("reconnectUser", sessions[idOfSession]);
    io.to(sessionId).emit("roomUsers", sessions[sessionId].users);

    //@TO_DO: move it to the function
    if (sessions[sessionId].category) {
      socket.emit("partyData", {
        id: "category",
        name: sessions[sessionId].category.name,
        value: sessions[sessionId].category.value,
      });
    }
    if (sessions[sessionId].subcategory) {
      socket.emit("partyData", {
        id: "subcategory",
        name: sessions[sessionId].subcategory.name,
        value: sessions[sessionId].subcategory.value,
      });
    }
    if (sessions[sessionId].level) {
      socket.emit("partyData", {
        id: "level",
        name: sessions[sessionId].level.name,
        value: sessions[sessionId].level.value,
      });
    }
  } else {
    io.to(socket.id).emit("socketConnected");
  }

  socket.on("joinRoom", async ({ username, sessionId, photoURL }) => {
    console.log(
      `************EVENT RECEIVED: joinRoom for session ${sessionId} **************** /n/n/n`
    );
    console.log(`************ Username : ${username} **************** /n/n/n`);
    if (!sessionId) {
      throw Error("Session ID is required");
    }
    socket.join(sessionId);
    if (decodedToken) {
      if (!sessions[sessionId]) {
        sessions[sessionId] = { users: [], round: 0, isGameRunning: false };
      }

      const isHost = sessions[sessionId]?.users?.length === 0 ? true : false;
      const user = {
        socketId: socket.id,
        userId: decodedToken?.userId,
        username: `${username}`,
        isOnline: true,
        score: 0,
        lastRound: 0,
        imageName: photoURL,
        rank: 0,
        answerState: "notAnswered",
        lastQuestionScore: 0,
        isHost: isHost, // Set isHost flag accordingly
      };
      const existingUserIndex1 = sessions[sessionId]?.users?.findIndex(
        (data) => data.username == user.username
      );
      if (existingUserIndex1 < 0) {
        sessions[sessionId].users.push(user);
      } else {
        sessions[sessionId].users = sessions[sessionId]?.users?.map(
          (user, index) => {
            if (index === existingUserIndex1) {
              user.isOnline = true;
              user.socketId = socket.id;
            }
            return user;
          }
        );
      }
      if (sessions[sessionId].hasPlayed) {
        sessions[sessionId].users = sessions[sessionId].users.sort(
          (a, b) => b.score - a.score
        );
        sessions[sessionId].users = sessions[sessionId].users.map(
          (user, index) => {
            user.rank = index + 1;
            return user;
          }
        );
        sessions[sessionId].hasPlayed = false;
      }

      if (sessions[sessionId].category) {
        socket.emit("partyData", {
          id: "category",
          name: sessions[sessionId].category.name,
          value: sessions[sessionId].category.value,
        });
      }
      if (sessions[sessionId].subcategory) {
        socket.emit("partyData", {
          id: "subcategory",
          name: sessions[sessionId].subcategory.name,
          value: sessions[sessionId].subcategory.value,
        });
      }
      if (sessions[sessionId].level) {
        socket.emit("partyData", {
          id: "level",
          name: sessions[sessionId].level.name,
          value: sessions[sessionId].level.value,
        });
      }
      console.log("Sessions: ", sessions[sessionId].users);
      // io.to(sessionId).emit("roomUsers", rooms[sessionId]);
      io.to(sessionId).emit("roomUsers", sessions[sessionId].users);
    }
  });

  socket.on("leaveRoom", ({ sessionId }) => {
    console.log(
      `************EVENT RECEIVED: leaveRoom for session ${sessionId} **************** /n/n/n`
    );
    if (sessions[sessionId]) {
      const user = sessions[sessionId]?.users.find(
        (user) => user.userId == decodedToken.userId
      );
      if (user?.isHost && sessions[sessionId]?.users.length > 1) {
        const nextUser = sessions[sessionId]?.users.find(
          (user) => user.userId !== decodedToken.userId
        );
        sessions[sessionId].users = sessions[sessionId]?.users.map((user) =>
          user.id === nextUser.id ? { ...user, isHost: true } : user
        );
      }
      sessions[sessionId].users = sessions[sessionId]?.users.filter(
        (user) => user.userId !== decodedToken.userId
      );
      //if user is the last user in the room, delete the room
    }
    console.log("At leave room: ", sessions[sessionId]);
    if (sessions[sessionId]) {
      io.to(sessionId).emit("roomUsers", sessions[sessionId].users);
    }

    if (sessions[sessionId]?.users.length === 0) {
      delete sessions[sessionId];
    }
  });

  let isLoopRunning = false;

  socket.on("isReadyNow", async ({ sessionId }) => {
    console.log(
      `************EVENT RECEIVED: isReadyNow for session ${sessionId} **************** /n/n/n`
    );
    if (sessions[sessionId]) {
      readyUsers[sessionId] = readyUsers[sessionId] || [];
      if (!readyUsers[sessionId].includes(decodedToken?.userId)) {
        // If the user ID doesn't exist, push it to the array
        readyUsers[sessionId].push(decodedToken.userId);
      }
      // let round = 0;
      let isGameCompleted = false;
      let data_to_send = [];
      let second_data_to_send = [];

      console.log("All Ready users", readyUsers[sessionId]);
      console.log(
        `All users in the room ${sessions[sessionId]?.users.length} and readyUsers ${readyUsers[sessionId].length}`
      );
      console.log(`loopRunning: ${isLoopRunning}`);
      if (
        readyUsers[sessionId].length == sessions[sessionId].users.length &&
        !isLoopRunning
      ) {
        isLoopRunning = true;
        // Reset the user's score and answer state
        sessions[sessionId].users = sessions[sessionId].users.map((user) => {
          data_to_send.push(
            roomUsersScore({
              id: user.userId,
              username: user.username,
              score: 0,
              // lastQuestionScore: user.lastQuestionScore,
              isOnline: user.isOnline,
              userId: user.userId,
              answerState: "notAnswered",
            })
          );

          user.score = 0;
          user.answerState = "notAnswered";
          user.lastQuestionScore = 0;
          return user;
        });

        // set default answer to notAnswered and default score
        // for (let i = 0; i < sessions[sessionId].users.length; i++) {
        //   data_to_send.push(
        //     roomUsersScore({
        //       id: sessions[sessionId].users[i].userId,
        //       username: sessions[sessionId].users[i].username,
        //       score: sessions[sessionId].users[i].score,
        //       // lastQuestionScore: sessions[sessionId].users[i].lastQuestionScore,
        //       isOnline: sessions[sessionId].users[i].isOnline,
        //       userId: sessions[sessionId].users[i].userId,
        //       answerState: "notAnswered",
        //     })
        //   );
        // }

        io.to(sessionId).emit("roomUsersScore", data_to_send);

        for (let index = 0; index < 10; index++) {
          sessions[sessionId]["currentIndex"] = index;
          sessions[sessionId]["startedTime"] = new Date().getTime();

          if (index == 0) {
            console.log("Emitting allReady");
            io.to(sessionId).emit("allReady");
          }

          for (let i = 0; i < sessions[sessionId].users.length; i++) {
            sessions[sessionId].startedTime = 0;
            sessions[sessionId].users[i].answerState = "notAnswered";
            sessions[sessionId].users[i].lastQuestionScore = 0;

            second_data_to_send.push(
              roomUsersScore({
                id: sessions[sessionId].users[i].userId,
                username: sessions[sessionId].users[i].username,
                score: sessions[sessionId].users[i].score,
                // lastQuestionScore: sessions[sessionId].users[i].lastQuestionScore,
                isOnline: sessions[sessionId].users[i].isOnline,
                userId: sessions[sessionId].users[i].userId,
                answerState: "notAnswered",
              })
            );
          }

          io.to(sessionId).emit("roomUsersScore", second_data_to_send);
          second_data_to_send = [];

          sessions[sessionId].isGameRunning = true;
          sessions[sessionId].startedTime = new Date().getTime();
          console.log("Emitting nextQuestion", index);
          io.to(sessionId).emit("nextQuestion", { index });
          const waitTime = 25000;
          const startTime = new Date().getTime();

          console.log(
            `15 second timer started, ${new Date().toLocaleString()}`
          );
          while (new Date().getTime() - startTime < waitTime) {
            // break the while loop and for loop if no user exist in the session
            if (
              !sessions[sessionId] ||
              !sessions[sessionId].users ||
              sessions[sessionId].users.length === 0
            ) {
              console.log(`No users in the session, ${new Date().getTime()}`);
              index = 10;
              break;
            }
            const allAnswered = sessions[sessionId]?.users.every(
              (user) => user.answerState != "notAnswered"
            );
            if (allAnswered) {
              console.log(`All users have answered${new Date().getTime()}`);
              await sleep(2000);
              break;
            }
            await sleep(1000);
            answerOrder = {};
          }
          if (index === 9) {
            isGameCompleted = true;
          }
          console.log(`15 second timer ended, ${new Date().toLocaleString()}`);
        }
        console.log(
          `Round completed, cleaning up the session ${sessions[sessionId]}`
        );
        if (isGameCompleted) {
          sessions[sessionId].hasPlayed = true;
          io.to(sessionId).emit("sendToLobby");
        }
        data_to_send = [];
        readyUsers[sessionId] = [];
        isLoopRunning = false;
        isGameCompleted = false;
      }
    }
  });

  socket.on("gameStarted", async ({ sessionId }) => {
    console.log(
      `************EVENT RECEIVED: gameStarted for session ${sessionId} **************** /n/n/n`
    );
    //prepareForGame emit the game to all the users
    readyUsers[sessionId] = [];
    io.to(sessionId).emit("prepareForGame");
    sessions[sessionId].hasPlayed = false;
  });

  // socket.on("timeExpired", ({ username, room }) => {
  //   io.to("1").emit("timeExpiredUser", username);
  // });
  // const answerOrder = {
  //   sessionId: {
  //     userId: {
  //       answer: true,
  //       time: 1234567890,
  //       score: 10,
  //     },
  //     userId2: {
  //       answer: false,
  //       time: 1234567890,
  //       score: 0,
  //     },
  //   },
  // };
  // let answerOrder = {};
  socket.on("onAnswer", ({ sessionId, answer }) => {
    console.log(
      `************EVENT RECEIVED: onAnswer for session ${sessionId} **************** /n/n/n`
    );
    console.log("USERS RECORD", sessions[sessionId].users);
    if (!answerOrder[sessionId]) {
      answerOrder[sessionId] = {}; // Initialize the answer order array for the session
    }
    answerOrder[sessionId][decodedToken.userId] = {
      answer: answer,
      time: new Date().getTime(),
    };

    // Assign scores based on the order of the answerOrder array
    //compare  sessions[sessionId].currentQuestion.startedAt with the time of the answer
    // create a multipler based on the time difference
    // assign the score to the user
    Object.keys(answerOrder[sessionId]).map((userId) => {
      if (userId === decodedToken.userId) {
        const user = sessions[sessionId].users.find(
          (user) => user.userId === userId
        );
        if (user) {
          // const timeDifference =
          //   answerOrder[sessionId][userId].time - sessions[sessionId].startedTime;
          // const multiplier = 1 - timeDifference / 15000;
          // const score = answerOrder[sessionId][userId].answer
          //   ? 10 * multiplier
          //   : 0;
          if (answer) {
            let score;
            const timeDifference =
              answerOrder[sessionId][userId].time -
              sessions[sessionId].startedTime;
            //if time difference is less than 3 seconds, assign 10 points
            if (timeDifference <= 5000) {
              score = 30;
            } else if (timeDifference <= 7000) {
              score = 21;
            } else if (timeDifference <= 15000) {
              score = 14;
            } else if (timeDifference <= 20000) {
              score = 8;
            } else {
              score = 4;
            }
            user.score += score;
            user.lastQuestionScore = score;
          }
          user.answerState = answerOrder[sessionId][userId].answer
            ? "correctlyAnswered"
            : "incorrectlyAnswered";
        }
      }
    });
    let data_to_send = [];

    for (let i = 0; i < sessions[sessionId].users.length; i++) {
      data_to_send.push(
        roomUsersScore({
          id: sessions[sessionId].users[i].userId,
          username: sessions[sessionId].users[i].username,
          score: sessions[sessionId].users[i].score,
          lastQuestionScore: sessions[sessionId].users[i].lastQuestionScore,
          isOnline: sessions[sessionId].users[i].isOnline,
          userId: sessions[sessionId].users[i].userId,
          answerState: sessions[sessionId].users[i].answerState,
          isMe: sessions[sessionId].users[i].userId === decodedToken.userId,
        })
      );
    }
    console.log("Before emtting roomUsersScore", data_to_send);
    io.to(sessionId).emit("roomUsersScore", data_to_send);
    data_to_send = [];
  });

  socket.on("updatePartyData", ({ id, name, value, sessionId }) => {
    console.log(
      `************EVENT RECEIVED: updatePartyData for session ${sessionId} **************** /n/n/n`
    );
    console.log("Settings updated", id, name, value, sessionId);
    if (sessions[sessionId]) {
      sessions[sessionId][id] = { name: name, value: value };
    }
    io.to(sessionId).emit("partyData", { id, name, value });
  });

  socket.on("getRoomUsersScore", ({ sessionId }) => {
    console.log(
      `************EVENT RECEIVED: getRoomUsersScore for session ${sessionId} **************** /n/n/n`
    );
    console.log("getRoomUsersScore", sessionId);
    const data_to_send = [];
    if (sessions[sessionId] && sessions[sessionId].users) {
      for (let i = 0; i < sessions[sessionId].users.length; i++) {
        data_to_send.push(
          roomUsersScore({
            id: sessions[sessionId].users[i].userId,
            username: sessions[sessionId].users[i].username,
            score: sessions[sessionId].users[i].score,
            // lastQuestionScore: sessions[sessionId].users[i].lastQuestionScore,
            isOnline: sessions[sessionId].users[i].isOnline,
            userId: sessions[sessionId].users[i].userId,
            answerState: "notAnswered",
          })
        );
      }
    }

    console.log("Before emitting roomUsersScore", data_to_send);
    io.to(sessionId).emit("roomUsersScore", data_to_send);
  });

  socket.on("disconnect", () => {
    console.log(
      `************EVENT RECEIVED: disconnect **************** /n/n/n`
    );
    for (const sessionId in sessions) {
      sessions[sessionId].users = sessions[sessionId].users.map((user) => {
        if (user.socketId === socket.id) {
          user.isOnline = false;
          user.disconnectedAt = new Date().getTime();
        }
        console.log("Session to disconnect", sessionId);
        io.to(sessionId).emit("roomUsers", sessions[sessionId].users);

        setTimeout(() => {
          // check if user is back online
          if (
            !user.isOnline &&
            sessions[sessionId] &&
            sessions[sessionId].users
          ) {
            // remove user from session
            sessions[sessionId].users = sessions[sessionId]?.users.filter(
              (user) => user.socketId !== socket.id
            );
            // if session is empty, delete the session
            if (sessions[sessionId].users.length === 0) {
              delete sessions[sessionId];
            }
            io.to(sessionId).emit("roomUsers", sessions[sessionId]?.users);
          }
        }, 90000);

        // if (sessions[sessionId].isGameRunning) {
        //   sessions[sessionId].users = sessions[sessionId]?.users.filter(
        //     (user) => user.socketId !== socket.id
        //   );
        // }

        return user;
      });
      console.log("At disconnect", sessions[sessionId].users);
      // io.to(sessionId).emit("roomUsers", sessions[sessionId].user);
    }
    console.log("Client disconnected");
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("App running on port 4001 :)");
});
