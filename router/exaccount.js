const router = require("express").Router();
const pool = require("../database/connection");

router.get("/", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const search = req.query.search || "";
  const offset = (page - 1) * pageSize;
  const values = [pageSize, offset];

  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    let query1 = "SELECT COUNT(*) as count FROM account WHERE status = 2";
    if (search !== "") {
      query1 += " AND client_name LIKE ?";
      values.push(`%${search}%`);
    }

    const query2 =
      "SELECT a.*, s.status FROM account a LEFT JOIN status s ON a.status = s.id WHERE a.status = 2 AND client_name LIKE ? ORDER BY created_date DESC LIMIT ? OFFSET ?";
    values.unshift(`%${search}%`);
    connection.query(query1, values, (err, results1) => {
      if (err) {
        connection.release();
        res.status(500).json({ error: "Internal server error" });
        return;
      }

      const totalAccount = results1[0].count;

      connection.query(query2, values, (err, results2) => {
        connection.release();

        if (err) {
          res.status(500).json({ error: "Internal server error" });
          return;
        }

        res.status(200).json({ totalAccount, exAccounts: results2 });
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
