const router = require("express").Router();
const pool = require("../database/connection");
const jwtUtils = require("../utils/jwtUtils");

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
      countQuery = "SELECT COUNT(*) as count FROM account WHERE status = 2";
      if (searchQuery !== "") {
        countQuery += " AND client_name LIKE ?";
        values.push(`%${searchQuery}%`);
      }

      dataQuery = `SELECT a.*, s.status FROM account a 
                    LEFT JOIN status s ON a.status = s.id 
                    WHERE a.status = 2 AND client_name LIKE ? 
                    ORDER BY created_date DESC LIMIT ? OFFSET ?`;
      values.unshift(`%${searchQuery}%`);
    } else if (req.user.level === 2) {
      countQuery = `SELECT COUNT(*) as count FROM account a 
                    LEFT JOIN user u ON a.owner = u.id 
                    WHERE status = 2 AND u.level NOT IN (1)`;
      if (searchQuery !== "") {
        countQuery += " AND client_name LIKE ?";
        values.push(`%${searchQuery}%`);
      }

      dataQuery = `SELECT a.*, s.status FROM account a 
                    LEFT JOIN status s ON a.status = s.id 
                    LEFT JOIN user u ON a.owner = u.id 
                    WHERE a.status = 2 AND client_name LIKE ? AND u.level NOT IN (1) 
                    ORDER BY created_date DESC LIMIT ? OFFSET ?`;
      values.unshift(`%${searchQuery}%`);
    } else if (req.user.level === 3) {
      countQuery = `SELECT COUNT(*) as count FROM account a 
                    LEFT JOIN user u ON a.owner = u.id 
                    WHERE status = 2 AND u.level NOT IN (1 , 2)`;
      if (searchQuery !== "") {
        countQuery += " AND client_name LIKE ?";
        values.push(`%${searchQuery}%`);
      }

      dataQuery = `SELECT a.*, s.status FROM account a 
                    LEFT JOIN status s ON a.status = s.id 
                    LEFT JOIN user u ON a.owner = u.id 
                    WHERE a.status = 2 AND client_name LIKE ? AND u.level NOT IN (1 , 2) 
                    ORDER BY created_date DESC LIMIT ? OFFSET ?`;
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
      res.json({ message: "success", data: results });
    });
  });
});

module.exports = router;
