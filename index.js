import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";
import axios from "axios";

const app = express();
const port = 3000;


if (process.env.NODE_NEW !== "production") {
    const dotenv = await import("dotenv");
    dotenv.config();
}


const isAdmin = (req) => {
    return req.query.admin === process.env.ADMIN_TOKEN;
};

app.set("view engine", "ejs");


const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


/* Home page display */

app.get("/", async (req, res) => {
    try {
        const admin = req.query.admin === process.env.ADMIN_TOKEN;
        const result = await db.query("SELECT * FROM books ORDER BY id ASC");

        res.render("index.ejs", {
            books: result.rows, admin
        });
    } catch (err) {
        console.error("Error loanding books:", err);
        res.status(500).send("Server Error");
    }
});

/* add book */
app.get("/add", (req, res) => {
    res.render("add.ejs")
});

app.post ("/add", async (req, res) => {
    console.log(req.body);

    const { title, author, isbn, description } = req.body;
    
   

    try { 
        const coverUrl = isbn
        ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
        : null;
        
        await db.query(
            `INSERT INTO books (title, author, isbn, cover_url, description) VALUES ($1, $2, $3, $4, $5)`,
            [title, author, isbn, coverUrl, description]
        );

        res.redirect("/");
    } catch (err) {
        console.error("ERROR adding book:", err.message);
        res.status(500).send("Could not add the book");
    }
});

/* single book page*/
app.get("/book/:id", async (req, res) => {
    const { id } = req.params;
    const admin = isAdmin(req);

    try {
        const result = await db.query(
            "SELECT * FROM books WHERE id = $1",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).send("Book not found");
        }

        res.render("book.ejs", {
            book: result.rows[0],
            admin: admin,
            adminToken: admin ? process.env.ADMIN_TOKEN : null,
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading book")
    }
});


app.post("/book/:id/notes", async (req, res) => {
    if (!isAdmin(req)) {
        return res.status(403).send("Forbidden");
    }

    const { id } = req.params;
    const { notes } = req.body;

    try {
        await db.query(
        "UPDATE books SET notes = $1 WHERE id = $2",
        [notes, id]
    );


    res.redirect(`/book/${id}?admin=${process.env.ADMIN_TOKEN}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error updating notes");
    }
});

/* edit book */
app.post ("/book/:id/edit", async (req, res) => {
    if (!isAdmin(req)) {
        return res.status(403).send(Forbidden);
    }

     const { id } = req.params;
     const {title, author, isbn, description, notes } = req.body;


     try {
        await db.query(
            `UPDATE books SET title=$1, author=$2, isbn=$3, description=$4, notes=$5 WHERE id=$6`,
            [title, author, isbn, description, notes, id]
        );
        res.redirect(`/book/${id}?admin=${process.env.ADMIN_TOKEN}`);
     } catch (err) {
        console.error("EDIT Error:", err);
        res.status(500).send("Could not edit book");
     }
});


/* Edit notes */
app.post("/edit-notes", async (req, res) => {
    const { id, notes } = req.body;

    try {
        await db.query(
            "UPDATE books SET notes = $1 WHERE id = $2",
            [notes, id]
        );
        res.redirect("/");
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Error updating notes");
    }
});


/* user comments */
app.post("/comment", async (req, res) => {
    const {book_id, content } = req.body;

    try {
        await db.query(
            "INSERT INTO comments (book_id, content) VALUES ($1, $2)",
            [book_id, content]
        );
        res.redirect("/");
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Error adding comment");
    }
});

/* delete book */
app.post("/book/:id/delete", async (req, res) => {
    if (!isAdmin(req)) {
        return res.status(403).send("Forbidden");
    }

    const { id } = req.params;

    try {
        await db.query("DELETE FROM books WHERE id=$1", [id]);
        res.redirect("/");
    } catch (err) {
        console.error("Error deleting book:", err.message);
        res.status(500).send("Could not delete book");
    }
});

app.listen(port, () =>{
    console.log(`Server runningon port ${port}`);
})
