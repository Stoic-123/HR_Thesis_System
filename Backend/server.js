import express from "express"
import cookieParser from "cookie-parser";
import cors from "cors"
import rateLimit from "express-rate-limit"
const app = express()
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,               
    message: "Too many requests, please try again later."
});

app.use(limiter);
app.use(express.json());
app.use(cookieParser())
app.use(cors())
app.get("/",(req,res)=>{
    res.send("hello world..")
})
app.listen(8080,()=>{
console.log("http://localhost:8080")
})