import express from "express";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

app.get("/", (_, res) => res.send("Server running"));

app.listen(5000, () => console.log("Server started on port 5000"));
