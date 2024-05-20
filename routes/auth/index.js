const express = require("express");
const router = express.Router();
const fs = require("fs");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");

dotenv.config();

router.get("/dum", (r, res) => {
  res.status(200).send("Badhai ho!");
});

router.get("/login", (req, res) => {
  try {
    const { username, password } = req.body;
    const userData = { username, password };
    if (!username || !password) {
      throw new Error("Invalid input :(");
    }
    const user = JSON.parse(fs.readFileSync("userdata.json", "utf8"))
    ;
    if (userData.username == username && userData.password == password) {
      console.log("User succesfully logged in ;)");
      const token = jwt.sign(userData, process.env.SECRET_KEY, {
        expiresIn: "1h",
      });
      res.json({ token });
    }
  } catch (error) {
    console.log("ERROR");
  }
});

router.post("/register", (req, res) => {
  try {
    const { username, password } = req.body;
    const userData = { username, password };
    if (!username || !password) {
      throw new Error("Invalid input :(");
    }
    fs.appendFileSync("userdata.json", JSON.stringify(userData) + "\n");
    res.status(200).send("User created successfully :)");
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;
