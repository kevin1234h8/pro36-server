const router = require("express").Router();
const pool = require("../database/connection");
const { v4 } = require("uuid");
const jwtUtils = require("../utils/jwtUtils");
function getNextNumber(maxNumber) {
  if (maxNumber === null || maxNumber === undefined) {
    return "00001";
  } else {
    const numberPortion = maxNumber.substring(maxNumber.lastIndexOf("/") + 1);
    const incrementedNumber = parseInt(numberPortion) + 1;
    return String(incrementedNumber).padStart(5, "0");
  }
}

router.get("/input-invoice", (req, res) => {
  const search = req.query.search || "";
  const owner = req.query.owner || "";
  var currentDate = new Date();
  var years = new Date(currentDate);
  years.setFullYear(currentDate.getFullYear() - 10);
  const createdDate =
    req.query.createdDate || years.toISOString().substring(0, 10);
  const values = [];
  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
    }
    let query = `SELECT invsum.* , invdet.period_from , invdet.period_to , invdet.account_no , invdet.broker_name , invdet.profit , invdet.service_cost FROM invoice_summary invsum LEFT JOIN invoice_details invdet ON invsum.no_invoice = invdet.no_invoice WHERE 1 = 1`;
    // if (search !== "") {
    //   query += " AND broker_name LIKE ?";
    //   values.unshift(`%${search}%`);
    // }
    // if (createdDate !== "") {
    //   query += " AND created_date BETWEEN ? AND NOW()";
    //   values.push(createdDate);
    // } else {
    //   query += " AND created_date = ?";
    //   values.push(createdDate);
    // }
    // if (owner !== "") {
    //   query += " AND owner = ?";
    //   values.push(owner);
    // }
    connection.query(query, (err, results) => {
      connection.release();
      if (err) {
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      res.status(200).json({ inputInvoiceDetails: results });
    });
  });
});

router.get("/input-invoice-details", jwtUtils.verify, (req, res) => {
  const search = req.query.search || "";
  const owner = req.query.owner || "";
  var currentDate = new Date();
  var years = new Date(currentDate);
  years.setFullYear(currentDate.getFullYear() - 10);
  const createdDate =
    req.query.createdDate || years.toISOString().substring(0, 10);
  const values = [];
  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
    }
    let query = "";
    if (req.user.level === 1) {
      query = `SELECT * FROM invoice_details WHERE 1 = 1`;
      if (search !== "") {
        query += " AND broker_name LIKE ?";
        values.unshift(`%${search}%`);
      }
      if (createdDate !== "") {
        query += " AND created_date BETWEEN ? AND NOW()";
        values.push(createdDate);
      } else {
        query += " AND created_date = ?";
        values.push(createdDate);
      }
      if (owner !== "") {
        query += " AND owner = ?";
        values.push(owner);
      }
    } else if (req.user.level === 2) {
      query = `SELECT  id.* FROM invoice_details  id 
      LEFT JOIN user u ON id.owner = u.id WHERE 1 = 1  AND u.level NOT in (1)`;
      if (search !== "") {
        query += " AND broker_name LIKE ?";
        values.unshift(`%${search}%`);
      }
      if (createdDate !== "") {
        query += " AND id.created_date BETWEEN ? AND NOW()";
        values.push(createdDate);
      } else {
        query += " AND id.created_date = ?";
        values.push(createdDate);
      }
      if (owner !== "") {
        query += " AND id.owner = ?";
        values.push(owner);
      }
    } else if (req.user.level === 3) {
      query = `SELECT  id.* FROM invoice_details  id 
      LEFT JOIN user u ON id.owner = u.id WHERE 1 = 1  AND u.level NOT in (1 , 2)`;
      if (search !== "") {
        query += " AND broker_name LIKE ?";
        values.unshift(`%${search}%`);
      }
      if (createdDate !== "") {
        query += " AND id.created_date BETWEEN ? AND NOW()";
        values.push(createdDate);
      } else {
        query += " AND id.created_date = ?";
        values.push(createdDate);
      }
      if (owner !== "") {
        query += " AND id.owner = ?";
        values.push(owner);
      }
    }
    console.log(query, values);
    connection.query(query, values, (err, results) => {
      connection.release();
      if (err) {
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      res.status(200).json({ inputInvoiceDetails: results });
    });
  });
});

// router.get("/input-invoice-details/:createdDate", (req, res) => {
//   const createdDate = req.params.createdDate;

//   pool.getConnection((err, connection) => {
//     if (err) {
//       res.status(500).json({ error: "Internal server error" });
//     }
//     let query = `SELECT * FROM invoice_details WHERE 1 = 1`;
//     if (search !== "") {
//       query += " AND broker_name LIKE ?";
//       values.unshift(`%${search}%`);
//     }
//     if (createdDate !== "") {
//       query += " AND created_date = ? ";
//       values.push(createdDate);
//     }

//     if (owner !== "") {
//       query += " AND owner = ?";
//       values.push(owner);
//     }
//     connection.query(query, values, (err, results) => {
//       connection.release();
//       if (err) {
//         res.status(500).json({ error: "Internal server error" });
//         return;
//       }
//       res.status(200).json({ inputInvoiceDetails: results });
//     });
//   });
// });

router.get("/input-invoice-details/:invoiceDetailsId", (req, res) => {
  const invoiceDetailsId = req.params.invoiceDetailsId;
  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
    }
    let query = `SELECT * FROM invoice_details WHERE 1 = 1`;
    query += " AND id = ?";

    connection.query(query, [invoiceDetailsId], (err, results) => {
      connection.release();
      if (err) {
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      res.status(200).json({ inputInvoiceDetails: results[0] });
    });
  });
});

router.get("/input-invoice-details/:invoiceNo(*)", (req, res) => {
  const invoiceNo = req.params.invoiceNo;
  console.log(invoiceNo);
  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
    }
    let query = `SELECT * FROM invoice_details WHERE 1 = 1`;
    query += " AND no_invoice = ?";

    connection.query(query, [invoiceNo], (err, results) => {
      connection.release();
      if (err) {
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      res.status(200).json({ inputInvoiceDetails: results });
    });
  });
});

router.get("/input-invoice-details/:clientName", (req, res) => {
  const clientName = req.params.clientName;
  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
    }
    let query = `SELECT * FROM invoice_details WHERE 1 = 1`;
    if (search !== "") {
      query += " AND clientName LIKE ?";
      values.unshift(`%${search}%`);
    }
    if (clientName !== "") {
      query += " AND created_date = ? ";
      values.push(clientName);
    }

    connection.query(query, values, (err, results) => {
      connection.release();
      if (err) {
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      res.status(200).json({ inputInvoiceDetails: results });
    });
  });
});

router.get("/input-invoice-summary", jwtUtils.verify, (req, res) => {
  const search = req.query.search || "";
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const owner = req.query.owner;
  const offset = (page - 1) * pageSize;
  const values = [pageSize, offset];
  const valuesCount = [];
  const createdDate = req.query.createdDate || "";

  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
    }
    let query1 = "";
    let query = "";
    if (req.user.level === 1) {
      query1 = "SELECT COUNT(*) as count FROM invoice_summary WHERE 1 = 1";
      if (search !== "") {
        query1 += " AND client_name LIKE ?";
        valuesCount.push(`%${search}%`);
      }
      if (owner) {
        query1 += " AND owner = ?";
        valuesCount.unshift(owner);
      }
      query = `SELECT * FROM invoice_summary  WHERE 1 = 1  `;
      if (search !== "") {
        query += " AND client_name LIKE ?";
        values.unshift(`%${search}%`);
      }

      if (createdDate) {
        query += " AND created_date BETWEEN ? AND NOW()";
        values.unshift(createdDate);
      }

      if (owner) {
        query += " AND owner = ?";
        values.unshift(owner);
      }
    } else if (req.user.level === 2) {
      query1 = `SELECT COUNT(*) FROM invoice_summary invsum
      LEFT JOIN user u ON invsum.owner = u.id WHERE 1 = 1  AND u.level NOT in (1)`;
      if (search !== "") {
        query1 += " AND invsum.client_name LIKE ?";
        valuesCount.push(`%${search}%`);
      }
      if (owner) {
        query1 += " AND invsum.owner = ?";
        valuesCount.unshift(owner);
      }
      query = `SELECT invsum.* FROM invoice_summary invsum
      LEFT JOIN user u ON invsum.owner = u.id  WHERE 1 = 1 AND u.level NOT in (1) `;
      if (search !== "") {
        query += " AND invsum.client_name LIKE ?";
        values.unshift(`%${search}%`);
      }

      if (createdDate) {
        query += " AND invsum.created_date BETWEEN ? AND NOW()";
        values.unshift(createdDate);
      }

      if (owner) {
        query += " AND invsum.owner = ?";
        values.unshift(owner);
      }
    } else if (req.user.level === 3) {
      query1 = `SELECT COUNT(*) FROM invoice_summary invsum
      LEFT JOIN user u ON invsum.owner = u.id WHERE 1 = 1  AND u.level NOT in (1 , 2)`;
      if (search !== "") {
        query1 += " AND invsum.client_name LIKE ?";
        valuesCount.push(`%${search}%`);
      }
      if (owner) {
        query1 += " AND invsum.owner = ?";
        valuesCount.unshift(owner);
      }
      query = `SELECT invsum.* FROM invoice_summary invsum
      LEFT JOIN user u ON invsum.owner = u.id  WHERE 1 = 1 AND u.level NOT in (1 , 2) `;
      if (search !== "") {
        query += " AND invsum.client_name LIKE ?";
        values.unshift(`%${search}%`);
      }

      if (createdDate) {
        query += " AND invsum.created_date BETWEEN ? AND NOW()";
        values.unshift(createdDate);
      }

      if (owner) {
        query += " AND invsum.owner = ?";
        values.unshift(owner);
      }
    }
    query += " ORDER BY no_invoice DESC LIMIT ? OFFSET ?";
    connection.query(query1, valuesCount, (err, results1) => {
      const totalInvoiceSummary = results1[0].count;
      connection.query(query, values, (err, results2) => {
        connection.release();
        if (err) {
          res.status(500).json({ error: "Internal server error" });
          return;
        }
        res
          .status(200)
          .json({ totalInvoiceSummary, inputInvoiceSummary: results2 });
      });
    });
  });
});

router.post("/input-invoice-details/create", async (req, res) => {
  const values = req.body.values;
  const insertData = async (value) => {
    const [
      id,
      no_invoice,
      period_from,
      period_to,
      account_no,
      broker_name,
      profit,
      service_cost,
      cost_in_rupiah,
      created_by,
      owner,
    ] = value;

    const values = [
      id,
      no_invoice,
      period_from,
      period_to,
      account_no,
      broker_name,
      profit,
      service_cost,
      cost_in_rupiah,
      created_by,
      owner,
    ];

    try {
      const connection = await new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
          if (err) {
            reject(err);
          } else {
            resolve(connection);
          }
        });
      });

      const query =
        "INSERT INTO invoice_details(id , no_invoice, period_from, period_to, account_no, broker_name, profit, service_cost, cost_in_rupiah, created_by, created_date , owner) VALUES (? , ?,?,?,?,?,?,?,?,?, CURRENT_TIMESTAMP , ?)";

      await new Promise((resolve, reject) => {
        connection.query(query, values, (err, results) => {
          connection.release();
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        });
      });

      return;
    } catch (error) {
      throw new Error("Internal server error");
    }
  };

  try {
    await Promise.all(values.map(insertData));
    res.status(200).json({ message: "success" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/input-invoice-summary/create", (req, res) => {
  const id = v4();
  const {
    invoiceNo,
    date,
    clientName,
    serviceFee,
    rate,
    city,
    country,
    bankName,
    beneficiaryName,
    accountNumber,
    totalAmountInRupiah,
    created_by,
    owner,
  } = req.body;
  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    const query = `INSERT INTO invoice_summary (id , no_invoice, date, client_name, service_fee, rate, city, country, bank_name, bank_beneficiary, bank_no, total_amount, created_by, created_date , owner) SELECT ? ,  CONCAT(?, LPAD((SELECT COUNT(id) + 1 FROM invoice_summary WHERE DATE(CURRENT_TIMESTAMP) = DATE(created_date)), 5, '0')), ? ,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP , ?`;
    const values = [
      id,
      invoiceNo,
      date,
      clientName,
      serviceFee,
      rate,
      city,
      country,
      bankName,
      beneficiaryName,
      accountNumber,
      totalAmountInRupiah,
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

router.get("/lastest-no-invoice", (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    const query = `SELECT MAX(no_invoice) AS maxNumber FROM invoice_summary ORDER BY created_date DESC`;
    connection.query(query, (err, results) => {
      connection.release();
      if (err) {
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      const maxNumber = results[0].maxNumber;
      const nextNumber = getNextNumber(maxNumber);
      res.status(200).json({ maxNumber: nextNumber });
    });
  });
});

router.get("/", (req, res) => {
  const searchQuery = req.query.search;
  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json("internal server error");
    }
    const query = "SELECT * FROM account WHERE client_name LIKE ?";
    const values = [`%${searchQuery}%`];
    connection.query(query, values, (err, results) => {
      connection.release();
      if (err) {
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      res.status(200).json({ accounts: results });
    });
  });
});

router.get("/input-invoice-summary/:id", async (req, res) => {
  const id = req.params.id;
  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
    }
    const query = `SELECT * FROM invoice_summary WHERE id = ?`;
    connection.query(query, [id], (err, results) => {
      connection.release();
      if (err) {
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      res.status(200).json({ inputInvoiceSummary: results[0] });
    });
  });
});
router.get("/input-invoice-summary-details/:id", async (req, res) => {
  const id = req.params.id;
  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
    }
    const query = `SELECT * FROM invoice_summary WHERE id = ?`;
    connection.query(query, [id], (err, results) => {
      connection.release();
      if (err) {
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      res.status(200).json({ inputInvoiceSummary: results[0] });
    });
  });
});

router.get("/input-invoice-summary-client-name/:id", async (req, res) => {
  const id = req.params.id;
  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
    }
    const query = `SELECT * FROM invoice_summary WHERE id = ?`;
    connection.query(query, [id], (err, results) => {
      connection.release();
      if (err) {
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      res.status(200).json({ inputInvoiceSummary: results[0] });
    });
  });
});

router.get("/input-invoice-summary/:invoiceNo(*)", async (req, res) => {
  const invoiceNo = req.params.invoiceNo;
  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
    }
    const query = `SELECT invsum.* , invdet.period_from , invdet.period_to , invdet.account_no , invdet.broker_name , invdet.profit , invdet.service_cost , invdet.cost_in_rupiah FROM invoice_summary invsum LEFT JOIN invoice_details invdet ON invsum.no_invoice = invdet.no_invoice WHERE invsum.id = ? `;
    connection.query(query, [invoiceNo], (err, results) => {
      connection.release();
      if (err) {
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      res.status(200).json({ inputInvoiceSummary: results });
    });
  });
});

router.get("/input-invoice-details/:invoiceNo(*)", async (req, res) => {
  const invoiceNo = req.params.invoiceNo;
  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
    }
    const query = `SELECT * FROM invoice_details WHERE no_invoice = ?`;
    connection.query(query, [invoiceNo], (err, results) => {
      connection.release();
      if (err) {
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      res.status(200).json({ inputInvoiceSummary: results });
    });
  });
});

router.post("/invoice-number", (req, res) => {
  const { date } = req.body;
  const values = [date];
  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    const query = `
    SELECT CONCAT(?, LPAD((SELECT COUNT(id) + 1 FROM invoice_summary WHERE DATE(CURRENT_TIMESTAMP) = DATE(created_date)), 5, '0')) AS invoice_number;
  `;

    connection.query(query, values, (error, results) => {
      if (error) {
        res.status(500).json({
          error: "An error occurred while retrieving the invoice number",
        });
      } else {
        const invoiceNumber = results[0].invoice_number;
        res.json({ invoiceNumber });
      }
    });
  });
});

router.get("/input-invoice-details/:owner/:accountNo", async (req, res) => {
  const owner = req.params.owner;
  const accountNo = req.params.accountNo;
  const values = [owner];
  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    let query = "SELECT * FROM invoice_details WHERE owner = ?";
    if (accountNo > 0) {
      query += ` AND account_no = ?`;
      values.push(accountNo);
    }
    console.log(query, values);
    connection.query(query, values, (err, results) => {
      connection.release();
      if (err) {
        res.status(500).json({ error: "Internal server error" });
        return;
      }

      res.status(200).json({ inputInvoiceDetails: results[0] });
    });
  });
});

router.put("/input-invoice-summary/:invoiceId", async (req, res) => {
  const invoiceId = req.params.invoiceId;
  const {
    clientName,
    serviceFee,
    rate,
    city,
    country,
    bankName,
    beneficiaryName,
    bankNo,
    modifiedBy,
  } = req.body;

  const values = [
    clientName,
    serviceFee,
    rate,
    city,
    country,
    bankName,
    beneficiaryName,
    bankNo,
    modifiedBy,
    invoiceId,
  ];

  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    let query =
      "UPDATE invoice_summary SET client_name = ? ,service_fee = ? ,rate = ? ,city = ? ,country = ? , bank_name = ? ,bank_beneficiary = ? ,bank_no = ? ,modified_by = ? ,modified_date = CURRENT_TIMESTAMP  WHERE id = ? ";
    connection.query(query, values, (err, results) => {
      connection.release();
      if (err) {
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      res
        .status(200)
        .json({ message: "invoice deleted successfully", results });
    });
  });
});

router.post("/input-invoice-summary/owner", (req, res) => {
  const owner = req.body.owner;
  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    const query = "SELECT * FROM invoice_summary WHERE owner = ? ";
    connection.query(query, [owner], (err, results) => {
      connection.release();
      if (err) {
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      res.status(200).json({ inputInvoiceSummary: results });
    });
  });
});

router.delete("/input-invoice-summary/:invoiceId", async (req, res) => {
  const invoiceId = req.params.invoiceId;
  pool.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    let query = "DELETE FROM invoice_summary WHERE id = ?";
    connection.query(query, [invoiceId], (err, results) => {
      connection.release();
      if (err) {
        res.status(500).json({ error: "Internal server error" });
        return;
      }

      res
        .status(200)
        .json({ message: "invoice deleted successfully", results });
    });
  });
});

module.exports = router;
