const mysql = require("mysql");
require("dotenv").config();
var pool = new mysql.createPool({
  host: process.env.HOST,
  user: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE,
});
module.exports = pool;
