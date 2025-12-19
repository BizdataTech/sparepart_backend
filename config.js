import dotenv from "dotenv";
import fs from "fs";

const env_file_name = process.env.ENV_FILE_NAME;
const file_name = `.env.${env_file_name}`;

if (fs.existsSync(file_name)) {
  dotenv.config({ path: file_name });
} else {
  dotenv.config();
  console.warn(`file ${file_name} not found! fallen to previous .env file`);
}

export default {
  PORT: process.env.PORT,
  CONNECTION_STRING: process.env.CONNECTION_STRING,
  JWT_SECRET: process.env.JWT_SECRET,
};
