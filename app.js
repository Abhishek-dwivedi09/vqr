const express = require("express")
const bodyParser = require("body-parser")
const route = require("./routes/route")

require("dotenv").config();

const app = express()

app.use(bodyParser.json())
 app.use("/api",route );

 app.listen(process.env.PORT, ()=>{
    console.log(`server is running on ${process.env.PORT}`);
  })