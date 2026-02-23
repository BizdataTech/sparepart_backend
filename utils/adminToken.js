import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.JWT_ADMIN_SECRET;

export const getAdminToken = (id) => {
  return jwt.sign({ adminId: id }, SECRET_KEY, { expiresIn: "7d" });
};

export const verifyAdminToken = (token) => {
  return jwt.verify(token, SECRET_KEY);
};
