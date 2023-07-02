const router = require("express").Router();
const pool = require("../database/connection");
const { v4 } = require("uuid");
const bcrypt = require("bcrypt");
const jwtUtils = require("../utils/jwtUtils");
const jwt = require("jsonwebtoken");
let refreshTokens = [];

const getUserByName = (name) => {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        reject(err);
      } else {
        const query = "SELECT * FROM user WHERE name = ?";
        connection.query(query, [name], (err, results) => {
          connection.release();
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        });
      }
    });
  });
};

router.get("/", async (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    const query = `SELECT * FROM user;`;
    connection.query(query, (err, results) => {
      connection.release();
      if (err) {
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      res.status(200).json({ user: results });
    });
  });
});

router.post("/create", jwtUtils.authMiddleware, async (req, res) => {
  const id = v4();
  const { username, level, createdBy, modifiedBy } = req.body;
  const hashPassword = await bcrypt.hash(password, 10);

  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    if (req.user.level === 1) {
      const checkQuery = "SELECT COUNT(*) AS count FROM user WHERE name = ?";
      const checkValues = [username.toLowerCase()];

      connection.query(checkQuery, checkValues, (err, checkResult) => {
        if (err) {
          connection.release();
          res.status(500).json({ error: "Internal server error" });
          return;
        }

        const userExists = checkResult[0].count > 0;

        if (userExists) {
          connection.release();
          res.status(400).json({ error: "Username already exists" });
          return;
        }

        // Insert the new user
        const insertQuery = `INSERT INTO user(id, name, hash_password, level, created_by, created_date, modified_by, modified_date) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP,?,CURRENT_TIMESTAMP)`;
        const insertValues = [
          id,
          username.toLowerCase(),
          hashPassword,
          level,
          createdBy,
          modifiedBy,
        ];

        connection.query(insertQuery, insertValues, (err, insertResult) => {
          connection.release();

          if (err) {
            res.status(500).json({ error: "Internal server error" });
            return;
          }

          res.status(200).json({ message: "Success", data: insertResult });
        });
      });
    } else {
      res.json({ message: "you are not allowed to create user" });
    }
  });
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const users = await getUserByName(username);
  const user = users[0];

  if (!user) {
    res.status(400).json({ error: "User doesn't exist" });
    return;
  }

  const dbPassword = user.hash_password;

  bcrypt.compare(password, dbPassword).then((match) => {
    if (!match) {
      res
        .status(400)
        .json({ error: "Wrong username and password combination" });
    } else {
      const accessToken = jwtUtils.generateAccessToken(user);
      const refreshToken = jwtUtils.generateRefreshToken(user);
      refreshTokens.push(refreshToken);
      res.cookie("jwt", accessToken, {
        maxAge: 3 * 24 * 60 * 60 * 1000,
      });
      res.status(200).json({
        message: "Login successful",
        data: { id: user.id, name: user.name, level: user.level },
        accessToken,
        refreshToken,
      });
    }
  });
});

router.get("/profile", jwtUtils.authMiddleware, (req, res) => {
  const user = req.user;
  res.json({ user, message: "Protected route accessed successfully" });
});

router.post("/refresh", (req, res) => {
  const refreshToken = req.body.token;
  if (!refreshToken) {
    return res.status(401).json("you are not authenticated");
  }
  if (!refreshTokens.includes(refreshToken)) {
    return res.status(403).json("refresh token is not valid");
  }
  jwt.sign(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, result) => {
    if (err) throw err;
    refreshTokens = refreshTokens.filter((token) => token !== refreshToken);

    const newAccessToken = jwtUtils.generateAccessToken(result);
    const newRefreshToken = jwtUtils.generateRefreshToken(result);

    res
      .status(200)
      .json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  });
});

router.get("/logout", (req, res) => {
  res.clearCookie("jwt");
  if (res.clearCookie) {
    res.json({ message: "Logged out successfully" });
  } else {
    res.json({ message: "logout failed" });
  }
});

module.exports = router;
