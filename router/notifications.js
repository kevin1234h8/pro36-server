const router = require("express").Router();
const pool = require("../database/connection");
const jwtUtils = require("../utils/jwtUtils");

router.get("/:loginUserId", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 5;
  const offset = (page - 1) * pageSize;
  const loginUserId = req.params.loginUserId; // Assuming you have the login user ID available in the request object

  let query1 = `SELECT n.id, n.created_by , n.message, n.created_at , n.part ,  u.name , a.path 
  FROM notifications n
  LEFT JOIN user u ON n.created_by = u.id
    LEFT JOIN avatar a ON n.created_by = a.user_id
  LEFT JOIN seen_status ss ON n.id = ss.notification_id AND ss.user_id = ?
  WHERE  ss.seen = 0 ORDER BY n.created_at DESC `;

  query1 += " LIMIT ? OFFSET ?";

  const query2 = `SELECT COUNT(*) as count FROM notifications n
  LEFT JOIN user u ON n.created_by = u.id
    LEFT JOIN avatar a ON n.created_by = a.user_id
  LEFT JOIN seen_status ss ON n.id = ss.notification_id AND ss.user_id = ?
  WHERE  ss.seen = 0`;

  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting database connection: ", err);
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    connection.query(
      query1,
      [loginUserId, pageSize, offset],
      (err, results) => {
        if (err) {
          console.error("Error executing query 1: ", err);
          connection.release();
          res.status(500).json({ error: "Internal server error" });
          return;
        }

        const notifications = results;

        connection.query(query2, [loginUserId], (err, result) => {
          connection.release();
          if (err) {
            console.error("Error executing query 2: ", err);
            res.status(500).json({ error: "Internal server error" });
            return;
          }

          const count = result[0].count;
          console.log(count);
          res.status(200).json({ notifications, count });
        });
      }
    );
  });
});

router.put("/:loginUserId", (req, res) => {
  const loginUserId = req.params.loginUserId;
  const query1 = `UPDATE seen_status SET seen = 1 WHERE user_id = ?`;
  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting database connection: ", err);
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    connection.query(query1, [loginUserId], (err, results) => {
      if (err) {
        console.error("Error executing query : ", err);
        connection.release();
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      const query2 = `
      DELETE FROM seen_status WHERE user_id = ?
    `;

      connection.query(query2, [loginUserId], (err, deleteResult) => {
        connection.release();
        if (err) {
          console.error("Error executing delete query: ", err);
          res.status(500).json({ error: "Internal server error" });
          return;
        }

        const numDeleted = deleteResult.affectedRows;
        res.status(200).json({ numDeleted });
      });
    });
  });
});

module.exports = router;
