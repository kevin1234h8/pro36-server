const router = require("express").Router();
const { query } = require("express");
const pool = require("../database/connection");
const jwtUtils = require("../utils/jwtUtils");

router.get("/", jwtUtils.verify, (req, res) => {
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
    let sqlCount = "";
    let sql = "";
    if (req.user.level === 1) {
      sqlCount = "SELECT COUNT(*) as count FROM invoice_summary WHERE 1 = 1";
      if (startDate != undefined || endDate != undefined) {
        sqlCount +=
          " AND STR_TO_DATE(date, '%Y-%m-%d') BETWEEN STR_TO_DATE(?, '%Y-%m-%d') AND STR_TO_DATE(?, '%Y-%m-%d')";
        valuesCount.unshift(startDate, endDate);
      }
      if (clientName !== "") {
        sqlCount += " AND client_name LIKE ?";
        valuesCount.push(`%${clientName}%`);
      }
      sql = `SELECT * FROM invoice_summary WHERE 1 = 1`;
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
    } else if (req.user.level === 2) {
      sqlCount = `SELECT COUNT(*) as count FROM invoice_summary invsum
      LEFT JOIN user u ON invsum.owner = u.id WHERE 1 = 1  AND u.level NOT in (1)`;
      if (startDate != undefined || endDate != undefined) {
        sqlCount +=
          " AND STR_TO_DATE(date, '%Y-%m-%d') BETWEEN STR_TO_DATE(?, '%Y-%m-%d') AND STR_TO_DATE(?, '%Y-%m-%d')";
        valuesCount.unshift(startDate, endDate);
      }
      if (clientName !== "") {
        sqlCount += " AND invsum.client_name LIKE ?";
        valuesCount.push(`%${clientName}%`);
      }
      sql = `SELECT invsum.* FROM invoice_summary invsum
      LEFT JOIN user u ON invsum.owner = u.id  WHERE 1 = 1 AND u.level NOT in (1)`;
      if (startDate != undefined || endDate != undefined) {
        sql +=
          " AND STR_TO_DATE(invsum.date, '%Y-%m-%d') BETWEEN STR_TO_DATE(?, '%Y-%m-%d') AND STR_TO_DATE(?, '%Y-%m-%d')";
        values.unshift(startDate, endDate);
      }
      if (clientName != "") {
        sql += " AND invsum.client_name LIKE ?";
        values.push(`%${clientName}%`);
      }
      sql += " ORDER BY invsum.date DESC";
    } else if (req.user.level === 3) {
      sqlCount = `SELECT COUNT(*) as count FROM invoice_summary invsum
      LEFT JOIN user u ON invsum.owner = u.id WHERE 1 = 1  AND u.level NOT in (1,2)`;
      if (startDate != undefined || endDate != undefined) {
        sqlCount +=
          " AND STR_TO_DATE(date, '%Y-%m-%d') BETWEEN STR_TO_DATE(?, '%Y-%m-%d') AND STR_TO_DATE(?, '%Y-%m-%d')";
        valuesCount.unshift(startDate, endDate);
      }
      if (clientName !== "") {
        sqlCount += " AND invsum.client_name LIKE ?";
        valuesCount.push(`%${clientName}%`);
      }
      sql = `SELECT invsum.* FROM invoice_summary invsum
      LEFT JOIN user u ON invsum.owner = u.id  WHERE 1 = 1 AND u.level NOT in (1,2)`;
      if (startDate != undefined || endDate != undefined) {
        sql +=
          " AND STR_TO_DATE(invsum.date, '%Y-%m-%d') BETWEEN STR_TO_DATE(?, '%Y-%m-%d') AND STR_TO_DATE(?, '%Y-%m-%d')";
        values.unshift(startDate, endDate);
      }
      if (clientName != "") {
        sql += " AND invsum.client_name LIKE ?";
        values.push(`%${clientName}%`);
      }
      sql += " ORDER BY invsum.date DESC";
    }

    sql += " LIMIT ? OFFSET ?";
    values.push(pageSize, offset);
    console.log(sql, values);
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

        res.status(200).json({ totalCount, clientReportAccounts }); // Include totalCount in the response
      });
    });
  });
});

module.exports = router;
