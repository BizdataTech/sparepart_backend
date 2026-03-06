import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from "./routers/userRouter.js";
import autoProductRouter from "./routers/autoProductRouter.js";
import autoCategoryRouter from "./routers/autoCategoryRouter.js";
import autoVehicleRouter from "./routers/autoVehicleRouter.js";
import cartRouter from "./routers/cartRouter.js";
import brandRouter from "./routers/brandRouter.js";
import orderRouter from "./routers/orderRouter.js";
import homeRouter from "./routers/homeRouter.js";
import sectionRouter from "./routers/sectionRouter.js";
import clientRouter from "./routers/clientRouter.js";
import adminUserRouter from "./routers/adminUserRouter.js";
import warehouseRouter from "./routers/warehouse.route.js";

const app = express();
const allowedURLs = [
  "https://sparepart-frontend-ten.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedURLs.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("request not allowed"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  }),
);

app.use(cookieParser());
app.use(express.json());

app.use("/api", adminUserRouter);
app.use("/api", userRouter);
app.use("/api", autoProductRouter);
app.use("/api", autoCategoryRouter);
app.use("/api", autoVehicleRouter);
app.use("/api", cartRouter);
app.use("/api", orderRouter);
app.use("/api", brandRouter);
app.use("/api", homeRouter);
app.use("/api", sectionRouter);
app.use("/api", clientRouter);
app.use("/api", warehouseRouter);

export default app;
