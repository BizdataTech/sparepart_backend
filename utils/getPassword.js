import bcrypt from "bcrypt";

const getPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedpass = await bcrypt.hash(password, salt);
    return hashedpass;
  } catch (error) {
    return error;
  }
};

export default getPassword;
