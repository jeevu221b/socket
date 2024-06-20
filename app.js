// const fs = require("fs")
const express = require("express");
const jwt = require("jsonwebtoken");
const authRoute = require("./routes/auth/index.js");
const app = express();
const env = require("dotenv");
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
// const morgan = require("morgan");
env.config();

// Middlewares"
// app.use(morgan("combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

function verifyToken(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    res.status(401).send("AuthToken missing");
  }
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    console.log("User authenicated ;)");
    req.username = decoded.username;
    next();
    //   eslint-disable-next-line no-unused-vars
  } catch (error) {
    res.status(401).send("User authentication failed :(");
  }
}
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

let clients = 0;
io.on("connection", (socket) => {
  clients += 1;
  console.log("a user connected");
  socket.emit("newclientconnect", "Welcome, baby!");
  socket.broadcast.emit("newclientconnect", `No. of users = ${clients}`);

  socket.on("disconnect", function () {
    clients--;
    socket.broadcast.emit("newclientconnect", `No. of users = ${clients}`);
  });
  // setTimeout(function () {
  //   //In built event called send that is associated with other event that used in the frontend called message
  //   // socket.send("Sent a message 4seconds after connection!");

  //   //To create a custom event we use emit method
  //   socket.emit("jeebo", {
  //     info: "This is an atttempt to create a custom event",
  //   });
  // }, 3000);

  // socket.on("jeebofromclient", (d) => {
  //   console.log(d);
  // });

  // socket.on("disconnect", function () {
  //   console.log("A user disconnected");
  // });

  // socket.on("chat message", (msg) => {
  //   io.emit("chat message", msg);
  // });
});

app.use("/auth", authRoute);
app.get("/secure", verifyToken, (req, res) => {
  console.log(req);
  res.send("Welcome to the secure route");
});
server.listen(2000, () => {
  console.log("App running on port 2000 :)");
});
