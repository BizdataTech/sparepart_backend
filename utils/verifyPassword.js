import bcrypt from "bcrypt";

const verifyPassword = async (password, hashed_password) => {
  return await bcrypt.compare(password, hashed_password);
};

export default verifyPassword;
