const router = require("express").Router();
const pool = require("../database/connection");

router.get("/", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const search = req.query.search || "";
  const offset = (page - 1) * pageSize;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const values = [];
  const valuesCount = [];
  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    let sqlCount =
      "SELECT COUNT(*) AS total FROM account WHERE STR_TO_DATE(expired_date, '%d-%m-%Y') < CURDATE() AND status = 1";
    if (startDate != undefined || endDate != undefined) {
      sqlCount +=
        " AND created_date BETWEEN STR_TO_DATE(?, '%d-%m-%Y') AND STR_TO_DATE(?, '%d-%m-%Y') ";
      valuesCount.push(startDate, endDate);
    }
    if (search !== "") {
      sqlCount += " AND client_name LIKE ?";
      valuesCount.unshift(`%${search}%`);
    }
    let sql =
      "SELECT * FROM account WHERE STR_TO_DATE(expired_date, '%d-%m-%Y') < CURDATE() AND status = 1";
    if (search !== "") {
      sql += " AND client_name LIKE ?";
      values.unshift(`%${search}%`);
    }
    if (startDate != undefined || endDate != undefined) {
      sql +=
        " AND created_date BETWEEN STR_TO_DATE(?, '%d-%m-%Y') AND STR_TO_DATE(?, '%d-%m-%Y') ";
      values.push(startDate, endDate);
    }
    sql += " ORDER BY expired_date DESC";
    sql += " LIMIT ? OFFSET ?";
    values.push(pageSize, offset);

    console.log("sql", sql);
    console.log("values", values);

    connection.query(sqlCount, valuesCount, (err, countResult) => {
      if (err) {
        connection.release();
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      const totalCount = countResult[0].total;

      connection.query(sql, values, (err, dataResult) => {
        connection.release();
        if (err) {
          res.status(500).json({ error: "Internal server error" });
          return;
        }

        const licenseExpiredAccounts = dataResult;

        res.status(200).json({ totalCount, licenseExpiredAccounts });
      });
    });
  });
});

module.exports = router;
