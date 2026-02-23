import { verifyAdminToken } from "../utils/adminToken.js";

const authenticateAdmin = (req, res, next) => {
  try {
    let token = req.cookies.admin_token;
    if (!token)
      return res.status(401).json({ message: "Authentication Required" });
    let payload = verifyAdminToken(token);
    req.adminId = payload.adminId;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or Expired Token" });
  }
};

export default authenticateAdmin;
