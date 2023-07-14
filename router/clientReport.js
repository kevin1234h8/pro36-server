const router = require("express").Router();
const pool = require("../database/connection");

router.get("/", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const offset = (page - 1) * pageSize;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const clientName = req.query.clientName || "";
  const values = [];
  const valuesCount = [];
  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    let sqlCount = "SELECT COUNT(*) as count FROM invoice_summary WHERE 1 = 1";
    if (startDate != undefined || endDate != undefined) {
      sqlCount +=
        " AND STR_TO_DATE(date, '%Y-%m-%d') BETWEEN STR_TO_DATE(?, '%Y-%m-%d') AND STR_TO_DATE(?, '%Y-%m-%d')";
      valuesCount.unshift(startDate, endDate);
    }
    if (clientName !== "") {
      sqlCount += " AND client_name LIKE ?";
      valuesCount.push(`%${clientName}%`);
    }
    let sql = `SELECT * FROM invoice_summary WHERE 1 = 1`;
    if (startDate != undefined || endDate != undefined) {
      sql +=
        " AND STR_TO_DATE(date, '%Y-%m-%d') BETWEEN STR_TO_DATE(?, '%Y-%m-%d') AND STR_TO_DATE(?, '%Y-%m-%d')";
      values.unshift(startDate, endDate);
    }
    if (clientName != "") {
      sql += " AND client_name LIKE ?";
      values.push(`%${clientName}%`);
    }
    sql += " ORDER BY date DESC";
    sql += " LIMIT ? OFFSET ?";
    values.push(pageSize, offset);
    connection.query(sqlCount, valuesCount, (err, countResult) => {
      if (err) {
        connection.release();
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      const totalCount = countResult[0].count;
      console.log(totalCount);
      connection.query(sql, values, (err, dataResult) => {
        connection.release();
        if (err) {
          res.status(500).json({ error: "Internal server error" });
          return;
        }

        const clientReportAccounts = dataResult;

        res.status(200).json({ totalCount, clientReportAccounts });
      });
    });
  });
});

module.exports = router;
