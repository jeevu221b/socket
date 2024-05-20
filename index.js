const fs = require("fs")
const express = require("express")
const jwt = require("jsonwebtoken")
const authRoute = require("./routes/auth/index.js")
const app = express()
const env = require("dotenv")
const morgan = require("morgan")
env.config()

// Middlewares"
app.use(morgan("combined"));
app.use(express.json())
app.use(express.urlencoded({ extended: false }));

function  verifyToken(req,res,next){
    const token = req.headers.authorization
    if(!token){
        res.status(401).send("AuthToken missing")
    }
    try{
    const decoded = jwt.verify(token, process.env.SECRET_KEY)
    console.log("User authenicated ;)")
    req.username = decoded.username
    next()
    }catch(error){
        res.status(401).send("User authentication failed :(")
    }

}


app.use("/auth", authRoute)
app.get("/secure",verifyToken,(req,res)=>{
    console.log(req)
    res.send("Welcome to the secure route")

})
app.listen(2000, ()=>{
    console.log("App running on port 2000 :)")
})
