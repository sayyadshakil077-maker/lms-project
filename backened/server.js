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

// Create students table
db.prepare(`
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        course TEXT DEFAULT 'Other',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();


// ===============================
// ADD COURSE COLUMN IF MISSING
// ===============================

try {

    db.prepare(`
        ALTER TABLE students
        ADD COLUMN course TEXT DEFAULT 'Other'
    `).run();

    console.log("Course column added.");

} catch (error) {

    if (!error.message.includes("duplicate column name")) {
        console.log("Course column already exists.");
    }

}


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

        const {
            name,
            email,
            password,
            course
        } = req.body;

        // Check all fields
        if (!name || !email || !password || !course) {

            return res.status(400).json({
                message: "Please fill all fields."
            });

        }


        // Check existing email
        const existingStudent = db
            .prepare("SELECT * FROM students WHERE email = ?")
            .get(email);

        if (existingStudent) {

            return res.status(400).json({
                message: "Email is already registered."
            });

        }


        // Hash password
        const hashedPassword =
            await bcrypt.hash(password, 10);


        // Save student
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


        // Success response
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

        console.error("REGISTER ERROR:", error);

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

        const {
            email,
            password
        } = req.body;


        if (!email || !password) {

            return res.status(400).json({
                message: "Please enter email and password."
            });

        }


        // Find student
        const student = db
            .prepare("SELECT * FROM students WHERE email = ?")
            .get(email);


        if (!student) {

            return res.status(401).json({
                message: "Invalid email or password."
            });

        }


        // Check password
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


        // Create JWT token
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


        // Login success
        res.json({

            message: "Login successful.",

            token: token,

            student: {
                id: student.id,
                name: student.name,
                email: student.email,
                course: student.course || "Other"
            }

        });

    } catch (error) {

        console.error("LOGIN ERROR:", error);

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
        `LMS Backend running on port ${PORT}`
    );

});