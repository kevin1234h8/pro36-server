const express = require("express");
require("dotenv").config();
const cors = require("cors");
const app = express();
const accountRouter = require("./router/account");
const exAccountRouter = require("./router/exaccount");
const inputInvoice = require("./router/inputinvoice");
const userRouter = require("./router/user");
const multer = require("multer");
const path = require("path");
const pool = require("./database/connection");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const licenseExpiredReportRouter = require("./router/licenseExpiredReport");
const clientReportRouter = require("./router/clientReport");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN_DEPLOYMENT,
    credentials: true,
  })
);

app.use("/uploads", express.static("uploads"));
app.use("/account", accountRouter);
app.use("/ex-account", exAccountRouter);
app.use("/input-invoice", inputInvoice);
app.use("/user", userRouter);
app.use("/license-expired-report", licenseExpiredReportRouter);
app.use("/client-report", clientReportRouter);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Specify the directory to store the uploaded images
  },
  filename: function (req, file, cb) {
    // Generate a unique name for the uploaded image (you can modify this as per your requirements)
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname);
    cb(null, uniqueSuffix + fileExtension);
  },
});
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
    // Accept the file
    cb(null, true);
  } else {
    // Reject the file
    cb(new Error("Only JPEG and PNG file formats are allowed."), false);
  }
};
// Create the Multer middleware
const upload = multer({ storage: storage, fileFilter: fileFilter });

app.post("/stats", upload.single("uploaded_file"), function (req, res) {
  const { originalname, filename } = req.file;
  const { userId } = req.body;

  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    // Delete previous picture for the same user
    const query = "SELECT path FROM avatar WHERE user_id = ? ";
    connection.query(query, [userId], (err, results) => {
      if (err) {
        console.error("Error executing query: ", err);
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      if (results.length > 0) {
        const previousPicturePath = path.join(
          __dirname,
          "uploads",
          results[0].path
        );

        // After deleting the previous picture, proceed with inserting the new picture
        const values = [originalname, filename, userId];
        const insertQuery = `UPDATE avatar SET image = ? , path = ?  WHERE user_id = ?`;
        connection.query(insertQuery, values, (err, results) => {
          connection.release();

          if (err) {
            console.error("Error executing query: ", err);
            res.status(500).json({ error: "Internal server error" });
            return;
          }

          res.status(200).json({ message: "success", data: results });
        });
        // });
      } else {
        // If no previous picture found, directly proceed with inserting the new picture
        const values = [originalname, filename, userId];
        const insertQuery = `INSERT INTO avatar(image, path, user_id) VALUES (?,?,?)`;
        connection.query(insertQuery, values, (err, results) => {
          connection.release();

          if (err) {
            console.error("Error executing query: ", err);
            res.status(500).json({ error: "Internal server error" });
            return;
          }

          res.status(200).json({ message: "success", data: results });
        });
      }
    });
  });
});

app.get("/avatar/:userId", (req, res) => {
  const userId = req.params.userId;
  const values = [userId];
  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    const query = `SELECT * FROM avatar WHERE user_id = ? `;
    connection.query(query, values, (err, results) => {
      connection.release();

      if (err) {
        console.error("Error executing query: ", err);
        res.status(500).json({ error: "Internal server error" });
        return;
      }

      res.status(200).json({ avatar: results[0] });
    });
  });
});

function authMiddleware(req, res, next) {
  // Get the token from the request headers or cookies
  const token = req.headers.authorization || req.cookies.jwt;

  if (!token) {
    return res
      .status(401)
      .json({ message: "Authentication failed: Token missing" });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, "your-secret-key");

    // Set the decoded user information on the request object
    req.user = decoded.user;

    next(); // Call the next middleware or route handler
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Authentication failed: Invalid token" });
  }
}

app.post("/login", authMiddleware, (req, res) => {
  // Perform authentication logic, e.g., verify credentials

  // If the user is authenticated, generate a JWT token
  const token = jwt.sign({ user: userId }, "your-secret-key", {
    expiresIn: "1h",
  });

  // Set the token as a cookie or include it in the response headers
  res.cookie("jwt", token, { httpOnly: true });
  // Or: res.setHeader('Authorization', `Bearer ${token}`);

  res.json({ message: "Login successful" });
});

app.listen(process.env.PORT, () => {
  console.log(`the server is running at port ${process.env.PORT}`);
});
