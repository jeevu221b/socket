const express = require("express");
const jwt = require("jsonwebtoken");
const app = express();
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { sleep } = require("./utils");
// const { decode } = require("punycode");
const server = http.createServer(app);
app.use(cors());

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const rooms = {};
const sessions = {};
// const room = [];
const readyUsers = {};

io.on("connection", (socket) => {
  console.log("New client connected");
  // console.log(socket.handshake.headers.authorization);
  let decodedToken;
  try {
    decodedToken = jwt.verify(
      socket.handshake.headers.authorization,
      "MY_SECRET_KEY"
    );
    // console.log("Decoded token:", decodedToken);
  } catch (err) {
    console.error("Token verification failed:", err);
  }
  // for (const room in rooms) {
  //   // rooms[room] = rooms[room].filter((user) => user.id !== socket.id);
  //   rooms[room] = rooms[room].map((user) => {
  //     if (user.userId === decodedToken.userId) {
  //       user.isOnline = true;
  //     }
  //     return user;
  //   });
  //   console.log("At connect", rooms[room]);
  //   io.to(room).emit("roomUsers", rooms[room]);
  // }

  socket.on("joinRoom", ({ username, sessionId, photoURL }) => {
    if (!sessionId) {
      throw Error("Session ID is required");
    }
    socket.join(sessionId);
    console.log("User joined room", sessionId, `@${username}`, photoURL);
    if (!rooms[sessionId]) {
      rooms[sessionId] = [];
    }

    const newUser = {
      socketId: socket.id,
      userId: decodedToken ? decodedToken.userId : "",
      username: `@${username}`,
      isOnline: true,
      score: 0,
      lastRound: 0,
      imageName: photoURL,
      rank: 0,
    };
    if (
      rooms[sessionId].findIndex((data) => data.username == newUser.username) <
      0
    ) {
      rooms[sessionId].push(newUser);
    } else {
      rooms[sessionId] = rooms[sessionId].map((user) => {
        if (user.username === newUser.username) {
          user.isOnline = true;
          user.id = socket.id;
        }
        return user;
      });
    }

    //Code with isHost flag

    // const isHost = rooms[sessionId].length === 0; // Check if this is the first user joining

    // const newUser = {
    //   socketId: socket.id,
    //   // userId: decodedToken ? decodedToken.userId : "",
    //   username: `@${username}`,
    //   isOnline: true,
    //   score: 0,
    //   lastRound: 0,
    //   imageName: photoURL,
    //   rank: 0,
    //   isHost: isHost, // Set isHost flag accordingly
    // };

    // const existingUserIndex = rooms[sessionId].findIndex(
    //   (data) => data.username == newUser.username
    // );
    // if (existingUserIndex < 0) {
    //   // User is not in the room, add the new user
    //   rooms[sessionId].push(newUser);
    // } else {
    //   // User is already in the room, update their details
    //   rooms[sessionId] = rooms[sessionId].map((user, index) => {
    //     if (index === existingUserIndex) {
    //       user.isOnline = true;
    //       user.id = socket.id;
    //     }
    //     return user;
    //   });
    // }

    // Send the list of users in the room to the new user
    console.log("At joining", rooms[sessionId]);
    io.to(sessionId).emit("roomUsers", rooms[sessionId]);
  });

  socket.on("leaveRoom", ({ sessionId }) => {
    console.log("Inside leave room");
    for (const room in rooms) {
      rooms[room] = rooms[room].filter((user) => {
        if (user.userId === decodedToken.userId) {
          console.log("User left room", room, user.username);
          return false; // Remove user if condition is true
        }
        return true; // Keep user if condition is false
      });
      io.to(sessionId).emit("roomUsers", rooms[room]);
    }
  });

  let isLoopRunning = false;

  socket.on("isReadyNow", async ({ sessionId }) => {
    /// {room:[{userId:1,username:"@user1",isOnline:true,score:0,lastRound:0,imageName:""},{userId:2,username:"@user2",isOnline:true,score:0,lastRound:0,imageName:""]}
    ///push user to readyUsers[sessionId].push(decodedToken.userId)
    readyUsers[sessionId] = readyUsers[sessionId] || [];
    if (!readyUsers[sessionId].includes(decodedToken.userId)) {
      // If the user ID doesn't exist, push it to the array
      readyUsers[sessionId].push(decodedToken.userId);
    }
    console.log("Ready users", readyUsers[sessionId]);
    let data_to_send = [];
    let second_data_to_send = [];

    if (
      readyUsers[sessionId].length == rooms[sessionId].length &&
      !isLoopRunning
    ) {
      isLoopRunning = true;

      for (let i = 0; i < rooms[sessionId].length; i++) {
        data_to_send.push({
          id: rooms[sessionId][i].userId,
          username: rooms[sessionId][i].username,
          score: rooms[sessionId][i].score,
          isOnline: rooms[sessionId][i].isOnline,
          userId: rooms[sessionId][i].userId,
          answerState: "notAnswered",
        });
        // data_to_send.push(data);
      }

      console.log("KILLLLLLLLLUA", data_to_send);
      io.to(sessionId).emit("roomUsersScore", data_to_send);

      for (let index = 0; index < 10; index++) {
        sessions["currentIndex"] = index;
        sessions["startedTime"] = new Date().getTime();

        if (index == 0) {
          console.log("Emitting allReady");
          io.to(sessionId).emit("allReady");
        }

        console.log("Emitting nextQuestion", index);
        io.to(sessionId).emit("nextQuestion", { index });

        // set the answer to notAnswered
        rooms[sessionId] = rooms[sessionId].map((user) => {
          user.answer = "notAnswered";
          return user;
        });

        const waitTime = 16000;
        const startTime = new Date().getTime();

        while (new Date().getTime() - startTime < waitTime) {
          const allAnswered = rooms[sessionId].every(
            (user) => user.answer !== "notAnswered"
          );
          if (allAnswered) {
            await sleep(3000);
            break;
          }
          await sleep(1000);
        }

        for (let i = 0; i < rooms[sessionId].length; i++) {
          second_data_to_send.push({
            id: rooms[sessionId][i].userId,
            username: rooms[sessionId][i].username,
            score: rooms[sessionId][i].score,
            isOnline: rooms[sessionId][i].isOnline,
            userId: rooms[sessionId][i].userId,
            answerState: "notAnswered",
          });
        }

        console.log("ZOLDYICKkkkkkkkkkkk", second_data_to_send);
        io.to(sessionId).emit("roomUsersScore", second_data_to_send);
        second_data_to_send = [];
      }

      isLoopRunning = false;
    }
  });

  socket.on("gameStarted", async ({ sessionId }) => {
    //prepareForGame emit the game to all the users
    readyUsers[sessionId] = [];
    io.to(sessionId).emit("prepareForGame");
  });

  // socket.on("timeExpired", ({ username, room }) => {
  //   io.to("1").emit("timeExpiredUser", username);
  // });
  let answerOrder = {};

  socket.on("onAnswer", ({ sessionId, answer }) => {
    // console.log("Answer received", answer, sessionId, decodedToken.userId);
    // console.log("Answer received", answer, sessionId);
    console.log("LAAAAAAAAAAAAAAAAAAAAAAW", rooms[sessionId]);

    // let totalScore = 0;
    // let username = "";
    // if (answer) {
    //   rooms[sessionId] = rooms[sessionId].map((user) => {
    //     if (user.userId === decodedToken.userId) {
    //       user.score += 10;
    //       totalScore = user.score;
    //       username = user.username;
    //     }
    //     return user;
    //   });
    // }

    // Claude code
    let totalScore = 0;
    let username = "";

    if (!answerOrder[sessionId]) {
      answerOrder[sessionId] = []; // Initialize the answer order array for the session
    }

    rooms[sessionId] = rooms[sessionId].map((user) => {
      if (user.userId === decodedToken.userId) {
        if (answer) {
          answerOrder[sessionId].push(user); // Add the user to the answer order array
          user.answer = "correctlyAnswered";
        } else {
          user.answer = "incorrectlyAnswered";
        }
        username = user.username;
      } else if (!("answer" in user)) {
        user.answer = "notAnswered"; // Set default value for users who haven't answered
      }
      return user;
    });

    // Assign scores based on the order of the answerOrder array
    if (answer) {
      answerOrder[sessionId].forEach((user, index) => {
        if (index === 0) {
          user.score += 10; // First user gets 10 points
        } else if (index === 1) {
          user.score += 8; // Second user gets 8 points
        } else {
          user.score += 5; // Rest of the users get 5 points
        }
        if (user.userId === decodedToken.userId) {
          totalScore = user.score;
        }
      });
    }

    const data_to_send = rooms[sessionId].map((user) => {
      return {
        id: user.userId,
        username: user.username,
        score: user.score,
        isOnline: user.isOnline,
        userId: user.userId,
        answerState:
          user.userId === decodedToken.userId
            ? user.answer
            : user.answer || "notAnswered",
      };
    });
    io.to(sessionId).emit("roomUsersScore", data_to_send);
  });

  socket.on("updatePartyData", ({ id, name, value, sessionId }) => {
    console.log("Settings updated", id, name, value, sessionId);
    io.to(sessionId).emit("partyData", { id, name, value });
  });

  socket.on("getRoomUsersScore", ({ sessionId }) => {
    console.log("getRoomUsersScore", sessionId);

    // socketId: socket.id,
    //   userId: decodedToken ? decodedToken.userId : "",
    //   username: `@${username}`,
    //   isOnline: true,
    //   score: 0,
    //   lastRound: 0,
    //   imageName: photoURL,
    //   rank: 0,

    // const data_to_send = [
    //   {
    //     id: rooms[sessionId][0].userId,
    //     username: rooms[sessionId][0].username,
    //     score: rooms[sessionId][0].score,
    //     isOnline: rooms[sessionId][0].isOnline,
    //     userId: rooms[sessionId][0].userId,
    //     answerState: "correctlyAnswered",
    //   },
    // ];
    const data_to_send = [];
    for (let i = 0; i < rooms[sessionId].length; i++) {
      data_to_send.push({
        id: rooms[sessionId][i].userId,
        username: rooms[sessionId][i].username,
        score: rooms[sessionId][i].score,
        isOnline: rooms[sessionId][i].isOnline,
        userId: rooms[sessionId][i].userId,
        answerState: "notAnswered",
      });
      // data_to_send.push(data);
    }

    console.log("Before emtting roomUsersScore", data_to_send);
    io.to(sessionId).emit("roomUsersScore", data_to_send);
  });

  socket.on("disconnect", () => {
    for (const room in rooms) {
      rooms[room] = rooms[room].map((user) => {
        if (user.socketId === socket.id) {
          user.isOnline = false;
          user.disconnectedAt = new Date().getTime();
        }
        console.log("Room to disconnect", room);
        io.to(room).emit("roomUsers", rooms[room]);

        setTimeout(() => {
          // check if user is back online
          if (!user.isOnline) {
            //remove user from room
            rooms[room] = rooms[room].filter(
              (user) => user.socketId !== socket.id
            );

            // if rooms is empty, delete the room
            if (rooms[room].length === 0) {
              delete rooms[room];
            }

            io.to(room).emit("roomUsers", rooms[room]);
          }
        }, 15000);

        return user;
      });
      console.log("At disconnect", rooms[room]);
      // io.to(room).emit("roomUsers", rooms[room]);
    }
    console.log("Client disconnected");
  });
});

server.listen(3001, () => {
  console.log("App running on port 3001 :)");
});
