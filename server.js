const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");

const app = express();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = "lms_project_secret_2026";

app.use(cors());
app.use(express.json());


// ===============================
// DATABASE
// ===============================

const db = new Database("lms.db");

db.prepare(`
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();


// ===============================
// TEST ROUTE
// ===============================

app.get("/", (req, res) => {

    res.json({
        message: "LMS Backend is running successfully!"
    });

});


// ===============================
// REGISTER STUDENT
// ===============================

app.post("/api/register", async (req, res) => {

    try {

        const { name, email, password, course } = req.body;

        if (!name || !email || !password || !course) {

            return res.status(400).json({
                message: "Please fill all fields."
            });

        }

        const existingStudent = db
            .prepare("SELECT * FROM students WHERE email = ?")
            .get(email);

        if (existingStudent) {

            return res.status(400).json({
                message: "Email is already registered."
            });

        }

        const hashedPassword =
            await bcrypt.hash(password, 10);

        const result = db.prepare(`
            INSERT INTO students
            (name, email, password, course)
            VALUES (?, ?, ?, ?)
        `).run(
            name,
            email,
            hashedPassword,
            course
        );

        res.status(201).json({

            message: "Student registered successfully.",

            student: {
                id: result.lastInsertRowid,
                name: name,
                email: email,
                course: course
            }

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Registration failed."
        });

    }

});


// ===============================
// STUDENT LOGIN
// ===============================

app.post("/api/login", async (req, res) => {

    try {

        const { email, password } = req.body;

        if (!email || !password) {

            return res.status(400).json({
                message: "Please enter email and password."
            });

        }

        const student = db
            .prepare("SELECT * FROM students WHERE email = ?")
            .get(email);

        if (!student) {

            return res.status(401).json({
                message: "Invalid email or password."
            });

        }

        const passwordMatch =
            await bcrypt.compare(
                password,
                student.password
            );

        if (!passwordMatch) {

            return res.status(401).json({
                message: "Invalid email or password."
            });

        }

        const token = jwt.sign(
            {
                id: student.id,
                email: student.email
            },
            JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        res.json({

            message: "Login successful.",

            token: token,

            student: {
                id: student.id,
                name: student.name,
                email: student.email,
                course: student.course 
            }

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Login failed."
        });

    }

});


// ===============================
// START SERVER
// ===============================

app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `LMS Backend running at http://localhost:${PORT}`
    );

});
