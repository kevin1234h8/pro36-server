const router = require("express").Router();
const pool = require("../database/connection");
const limiter = require("../utils/rateLimitUtils");
const jwtUtils = require("../utils/jwtUtils");

router.get("/", jwtUtils.verify, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const searchQuery = req.query.search || "";
  const offset = (page - 1) * pageSize;
  const owner = req.query.owner || "";
  const countValues = [];
  const queryValues = [];
  const currentDate = new Date();
  const tenYearsAgo = new Date(
    currentDate.getFullYear() - 10,
    currentDate.getMonth(),
    currentDate.getDate()
  );
  const createdDate =
    req.query.createdDate || tenYearsAgo.toISOString().substring(0, 10);

  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    let countQuery = "";
    let dataQuery = "";

    if (req.user.level === 1) {
      countQuery = "SELECT COUNT(*) as count FROM account WHERE status = 1";
      if (searchQuery !== "") {
        countQuery += " AND client_name LIKE ?";
        countValues.unshift(`%${searchQuery}%`);
      }

      dataQuery = `SELECT a.*, s.status FROM account a 
                    LEFT JOIN status s ON a.status = s.id 
                    WHERE a.status = 1 AND client_name LIKE ?`;
      queryValues.unshift(`%${searchQuery}%`);

      if (owner !== "") {
        dataQuery += " AND owner = ?";
        queryValues.push(owner);
      }
      if (createdDate !== "") {
        dataQuery += " AND a.created_date BETWEEN ? AND NOW()";
        queryValues.push(createdDate);
      }
    } else if (req.user.level === 2) {
      countQuery = `SELECT COUNT(*) as count FROM account a 
                    LEFT JOIN user u ON a.owner = u.id 
                    WHERE status = 1 AND u.level NOT IN (1)`;
      if (searchQuery !== "") {
        countQuery += " AND client_name LIKE ?";
        countValues.unshift(`%${searchQuery}%`);
      }
      dataQuery = `SELECT a.*, s.status FROM account a 
                    LEFT JOIN status s ON a.status = s.id 
                    LEFT JOIN user u ON a.owner = u.id 
                    WHERE a.status = 1 AND client_name LIKE ? AND u.level NOT IN (1)`;
      queryValues.unshift(`%${searchQuery}%`);

      if (createdDate !== "") {
        dataQuery += " AND a.created_date BETWEEN ? AND NOW()";
        queryValues.push(createdDate);
      }
    }

    dataQuery += " ORDER BY created_date DESC LIMIT ? OFFSET ?";
    queryValues.push(pageSize, offset);

    console.log(dataQuery, queryValues);

    connection.query(countQuery, countValues, (err, countResult) => {
      if (err) {
        connection.release();
        res.status(500).json({ error: "Internal server error" });
        return;
      }

      const totalAccount = countResult[0].count;

      connection.query(dataQuery, queryValues, (err, dataResult) => {
        connection.release();

        if (err) {
          res.status(500).json({ error: "Internal server error" });
          return;
        }

        res.status(200).json({ totalAccount, accounts: dataResult });
      });
    });
  });
});

router.get("/:id", async (req, res) => {
  const id = req.params.id;
  const search = req.query.search || "";
  const values = [id];
  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
    }
    let sql = `SELECT * FROM account WHERE id = ?`;
    if (search !== "") {
      sql += " AND client_name = ? ";
      values.push(`%${search}%`);
    }
    connection.query(sql, values, (err, results) => {
      connection.release();
      if (err) {
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      res.status(200).json({ account: results[0] });
    });
  });
});

router.post("/create", limiter, (req, res) => {
  const {
    id,
    client_name,
    account_no,
    password,
    inv_pass,
    server,
    ea_name,
    regist_date,
    expired_date,
    serial_key,
    remark,
    vps,
    recruit_by,
    created_by,
    owner,
  } = req.body;
  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    const query = `INSERT INTO account (id, client_name, account_no, password, inv_pass, server, ea_name, regist_date, expired_date, serial_key, remark, vps, recruit_by, status , created_by , created_date , owner) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1 , ? , CURRENT_TIMESTAMP , ?)`;
    const values = [
      id,
      client_name,
      account_no,
      password,
      inv_pass,
      server,
      ea_name,
      regist_date,
      expired_date,
      serial_key,
      remark,
      vps,
      recruit_by,
      created_by,
      owner,
    ];
    connection.query(query, values, (err, results) => {
      connection.release();

      if (err) {
        console.error("Error executing query: ", err);
        res.status(500).json({ error: "Internal server error" });
        return;
      }

      res.status(200).json({ message: "success", data: results });
    });
  });
});

router.put("/:id", async (req, res) => {
  const {
    client_name,
    account_no,
    password,
    inv_pass,
    server,
    ea_name,
    regist_date,
    expired_date,
    serial_key,
    remark,
    vps,
    recruit_by,
    modified_by,
  } = req.body;
  const id = req.params.id;
  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    const query =
      "UPDATE account SET client_name = ?, account_no = ?, password = ?, inv_pass = ?, server = ?, ea_name = ?, regist_date = ?, expired_date = ?, serial_key = ?, remark = ?, vps = ?, recruit_by = ?, status = 1 , modified_by = ? , modified_date = CURRENT_TIMESTAMP WHERE id = ?";
    const values = [
      client_name,
      account_no,
      password,
      inv_pass,
      server,
      ea_name,
      regist_date,
      expired_date,
      serial_key,
      remark,
      vps,
      recruit_by,
      modified_by,
      id,
    ];
    connection.query(query, values, (err, results) => {
      connection.release();
      if (err) {
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      res.status(200).json({ message: "success", data: results });
    });
  });
});

router.put("/delete/:id", (req, res) => {
  const id = req.params.id;
  const { deleted_by } = req.body;
  const values = [deleted_by, id];

  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "internal server error" });
      return;
    }
    const query =
      "UPDATE account SET status = 2, deleted_by = ?, deleted_date = CURRENT_TIMESTAMP , restored_by = '' , restored_date = null WHERE id = ?";
    connection.query(query, values, (err, results) => {
      connection.release();
      if (err) {
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      res.status(200).json({ message: "success", data: results });
    });
  });
});

router.get("/:id/:createdDate", (req, res) => {
  const id = req.params.id;
  const createdDate = req.params.createdDate;
  const search = req.query.search;
  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    let query =
      "SELECT a.*, s.status FROM account a LEFT JOIN status s ON a.status = s.id WHERE 1 = 1 AND a.status = 1 ";
    if (search !== "") {
      query += " AND client_name LIKE ?";
    }
    if (createdDate !== "") {
    }
  });
});

module.exports = router;
