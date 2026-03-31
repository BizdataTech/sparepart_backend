import jwt from "jsonwebtoken";

const verifyUser = (req, res, next) => {
  let token = req.cookies?.token;
  try {
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token found. Authentication failed!",
      });
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired Token!" });
  }
};

export default verifyUser;
