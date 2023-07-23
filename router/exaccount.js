const router = require("express").Router();
const pool = require("../database/connection");
const jwtUtils = require("../utils/jwtUtils");
const { v4 } = require("uuid");

router.get("/", jwtUtils.verify, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const searchQuery = req.query.search || "";
  const offset = (page - 1) * pageSize;
  const values = [pageSize, offset];

  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    let countQuery = "";
    let dataQuery = "";

    if (req.user.level === 1) {
      countQuery = "SELECT COUNT(*) as count FROM account a WHERE status = 2";
      if (searchQuery !== "") {
        countQuery += " AND a.account_no LIKE ?";
        values.push(`%${searchQuery}%`);
      }

      dataQuery = `SELECT a.*, s.status FROM account a 
                    LEFT JOIN status s ON a.status = s.id 
                    WHERE a.status = 2 AND a.account_no LIKE ? 
                    ORDER BY a.regist_date DESC, a.created_date DESC LIMIT ? OFFSET ?`;
      values.unshift(`%${searchQuery}%`);
    } else if (req.user.level === 2) {
      countQuery = `SELECT COUNT(*) as count FROM account a 
                    LEFT JOIN user u ON a.owner = u.id 
                    WHERE status = 2 AND u.level NOT IN (1)`;
      if (searchQuery !== "") {
        countQuery += " AND a.account_no LIKE ?";
        values.push(`%${searchQuery}%`);
      }

      dataQuery = `SELECT a.*, s.status FROM account a 
                    LEFT JOIN status s ON a.status = s.id 
                    LEFT JOIN user u ON a.owner = u.id 
                    WHERE a.status = 2 AND a.account_no LIKE ? AND u.level NOT IN (1) 
                    ORDER BY a.regist_date DESC, a.created_date DESC LIMIT ? OFFSET ?`;
      values.unshift(`%${searchQuery}%`);
    } else if (req.user.level === 3) {
      countQuery = `SELECT COUNT(*) as count FROM account a 
                    LEFT JOIN user u ON a.owner = u.id 
                    WHERE status = 2 AND u.level NOT IN (1 , 2)`;
      if (searchQuery !== "") {
        countQuery += " AND a.account_no LIKE ?";
        values.push(`%${searchQuery}%`);
      }

      dataQuery = `SELECT a.*, s.status FROM account a 
                    LEFT JOIN status s ON a.status = s.id 
                    LEFT JOIN user u ON a.owner = u.id 
                    WHERE a.status = 2 AND a.account_no LIKE ? AND u.level NOT IN (1 , 2) 
                    ORDER BY a.regist_date DESC, a.created_date DESC LIMIT ? OFFSET ?`;
      values.unshift(`%${searchQuery}%`);
    }

    connection.query(countQuery, values, (err, countResult) => {
      if (err) {
        connection.release();
        res.status(500).json({ error: "Internal server error" });
        return;
      }

      const totalAccount = countResult[0].count;

      connection.query(dataQuery, values, (err, dataResult) => {
        connection.release();

        if (err) {
          res.status(500).json({ error: "Internal server error" });
          return;
        }

        res.status(200).json({ totalAccount, exAccounts: dataResult });
      });
    });
  });
});

router.get("/:id", async (req, res) => {
  const id = req.params.id;
  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
    }
    const query = `SELECT * FROM account WHERE id = ?`;
    connection.query(query, id, (err, results) => {
      connection.release();
      if (err) {
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      res.status(200).json({ account: results[0] });
    });
  });
});

router.put("/restore/:id", (req, res) => {
  const id = req.params.id;
  const { restored_by } = req.body;
  const values = [restored_by, id];
  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "internal server error" });
      return;
    }
    const query =
      "UPDATE account SET status = 1 = deleted_by = '' , deleted_date = null , restored_by = ? , restored_date = CURRENT_TIMESTAMP  WHERE id = ?";
    connection.query(query, values, (err, results) => {
      connection.release();
      if (err) {
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      // const message = `restored an account on`;
      // addNotification(restored_by, message, restored_by);
      res.json({ message: "success", data: results });
    });
  });
});

const addNotification = (userId, message, createdBy) => {
  const id = v4();
  const query = `INSERT INTO notifications (id , user_id, message , created_by , part) VALUES (? , ?, ? , ? , 'New Account')`;
  const values = [id, userId, message, createdBy];
  console.log("values : ", values);
  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting database connection: ", err);
      return;
    }

    connection.query(query, values, (err, results) => {
      connection.release();
      if (err) {
        console.error("Error executing query: ", err);
        return;
      }
      addSeenStatus(userId, id);
      console.log("Notification added successfully");
    });
  });
};

const addSeenStatus = (userId, notificationId) => {
  const query = "SELECT id FROM user";

  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting database connection: ", err);
      return;
    }

    connection.query(query, (err, users) => {
      if (err) {
        console.error("Error executing query: ", err);
        connection.release();
        return;
      }
      console.log(users);

      // Iterate over each user and insert into seen_status table
      users.forEach((user) => {
        const id = v4(); // Assuming you have a method to generate a unique ID, such as uuid/v4
        const insertQuery =
          "INSERT INTO seen_status (id, user_id, notification_id, seen) VALUES (?, ?, ?, 0)";
        const values = [id, user.id, notificationId]; // Replace `notificationId` with the actual notification ID

        connection.query(insertQuery, values, (err, results) => {
          if (err) {
            console.error("Error executing query: ", err);
          } else {
            console.log(
              "Notification added successfully for user ID:",
              user.id
            );
          }
        });
      });

      connection.release();
    });
  });
};

module.exports = router;
