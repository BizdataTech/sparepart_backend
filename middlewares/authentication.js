import jwt from "jsonwebtoken";
import config from "../config.js";

const authentication = (req, res, next) => {
  const token = req.cookies.token;
  if (!token)
    return res.status(401).json({
      success: false,
      message: "no token found. user not authenticated.",
    }); //client is not authenticated
  const isAuthenticated = jwt.verify(token, config.JWT_SECRET);
  if (!isAuthenticated)
    return res
      .status(401)
      .json({ succes: false, message: "invalid token signature" });
  next();
};

export default authentication;
