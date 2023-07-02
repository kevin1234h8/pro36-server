const router = require("express").Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

router.get("/avatar", upload.single("avatar"), (req, res) => {
  avatar = req.file;
});
