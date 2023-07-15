const jwt = require("jsonwebtoken");

const generateAccessToken = (user) => {
  const accessToken = jwt.sign(
    { username: user.name, id: user.id, level: user.level },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "3d" }
  );
  return accessToken;
};

const generateRefreshToken = (user) => {
  const refreshToken = jwt.sign(
    {
      username: user.name,
      id: user.id,
      level: user.level,
    },
    process.env.REFRESH_TOKEN_SECRET
  );
  return refreshToken;
};

const verify = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, result) => {
      if (err) {
        return res.status(403).json("token is not valid !");
      }
      req.user = result;
      next();
    });
  } else {
    res.status(401).json("you are not authenticated");
  }
};

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization || req.cookies.jwt;
  if (!token) {
    return res
      .status(401)
      .json({ message: "Authentication failed: Token missing" });
  }
  try {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, result) => {
      if (err) {
        return res.status(403).json("token is not valid !");
      }
      req.user = result;
      next();
    });
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Authentication failed: Invalid token" });
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verify,
  authMiddleware,
};
