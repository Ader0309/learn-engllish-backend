import express from "express";

const app = express();
const port = 3000;

app.use(express.static("public"));

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.get("/about", (req, res) => {
    res.send("About Page");
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
