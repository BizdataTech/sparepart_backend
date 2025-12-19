import jwt from "jsonwebtoken";
const getToken = (userId) => {
  const secretkey = process.env.JWT_SECRET;
  return jwt.sign({ userId }, secretkey, { expiresIn: "7d" });
};

export default getToken;
