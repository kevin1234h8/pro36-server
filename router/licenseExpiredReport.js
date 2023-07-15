const router = require("express").Router();
const pool = require("../database/connection");
const jwtUtils = require("../utils/jwtUtils");

router.get("/", jwtUtils.verify, (req, res) => {
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
    let sqlCount = "";
    let sql = "";
    if (req.user.level === 1) {
      sqlCount =
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
      sql =
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
    } else if (req.user.level === 2) {
      sqlCount = `SELECT COUNT(*) FROM account acc 
      LEFT JOIN user u ON acc.owner = u.id
      WHERE STR_TO_DATE(acc.expired_date, '%d-%m-%Y') < CURDATE() AND acc.status = 1 AND u.level NOT IN(1)
      `;
      if (startDate != undefined || endDate != undefined) {
        sqlCount +=
          " AND acc.created_date BETWEEN STR_TO_DATE(?, '%d-%m-%Y') AND STR_TO_DATE(?, '%d-%m-%Y') ";
        valuesCount.push(startDate, endDate);
      }
      if (search !== "") {
        sqlCount += " AND acc.client_name LIKE ?";
        valuesCount.unshift(`%${search}%`);
      }
      sql = `SELECT acc.* FROM account acc 
      LEFT JOIN user u ON acc.owner = u.id
      WHERE STR_TO_DATE(acc.expired_date, '%d-%m-%Y') < CURDATE() AND acc.status = 1 AND u.level NOT IN(1)`;
      if (search !== "") {
        sql += " AND acc.client_name LIKE ?";
        values.unshift(`%${search}%`);
      }
      if (startDate != undefined || endDate != undefined) {
        sql +=
          " AND acc.created_date BETWEEN STR_TO_DATE(?, '%d-%m-%Y') AND STR_TO_DATE(?, '%d-%m-%Y') ";
        values.push(startDate, endDate);
      }
      sql += " ORDER BY acc.expired_date DESC";
    } else if (req.user.level === 3) {
      sqlCount = `SELECT COUNT(*) FROM account acc 
        LEFT JOIN user u ON acc.owner = u.id
        WHERE STR_TO_DATE(acc.expired_date, '%d-%m-%Y') < CURDATE() AND acc.status = 1 AND u.level NOT IN(1 , 2)
        `;
      if (startDate != undefined || endDate != undefined) {
        sqlCount +=
          " AND acc.created_date BETWEEN STR_TO_DATE(?, '%d-%m-%Y') AND STR_TO_DATE(?, '%d-%m-%Y') ";
        valuesCount.push(startDate, endDate);
      }
      if (search !== "") {
        sqlCount += " AND acc.client_name LIKE ?";
        valuesCount.unshift(`%${search}%`);
      }
      sql = `SELECT acc.* FROM account acc 
      LEFT JOIN user u ON acc.owner = u.id
      WHERE STR_TO_DATE(acc.expired_date, '%d-%m-%Y') < CURDATE() AND acc.status = 1 AND u.level NOT IN(1 ,2)`;
      if (search !== "") {
        sql += " AND acc.client_name LIKE ?";
        values.unshift(`%${search}%`);
      }
      if (startDate != undefined || endDate != undefined) {
        sql +=
          " AND acc.created_date BETWEEN STR_TO_DATE(?, '%d-%m-%Y') AND STR_TO_DATE(?, '%d-%m-%Y') ";
        values.push(startDate, endDate);
      }
      sql += " ORDER BY acc.expired_date DESC";
    }
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
