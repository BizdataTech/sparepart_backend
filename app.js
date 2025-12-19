import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from "./routers/userRouter.js";
import categoryRouter from "./routers/categoryRouter.js";
import productRouter from "./routers/productRouter.js";
import autoProductRouter from "./routers/autoProductRouter.js";
import autoCategoryRouter from "./routers/autoCategoryRouter.js";
import autoVehicleRouter from "./routers/autoVehicleRouter.js";
import searchRouter from "./routers/searchRouter.js";
import cartRouter from "./routers/cartRouter.js";
import brandRouter from "./routers/brandRouter.js";
import makeRouter from "./routers/makeRouter.js";
import productSectionRouter from "./routers/productSectionRouter.js";
import Sample from "./sampleCreation.js";
import path from "path";

const app = express();
const allowedURLs = [
  "https://ecom-prototype-one.vercel.app",
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
  })
);

app.use(cookieParser());
app.use(express.json());

app.use(
  "/sample_images",
  express.static(path.join(process.cwd(), "sample_images"))
);

app.use("/api", userRouter);
app.use("/api", categoryRouter);
app.use("/api", productRouter);
app.use("/api", autoProductRouter);
app.use("/api", autoCategoryRouter);
app.use("/api", autoVehicleRouter);
app.use("/api", searchRouter);
app.use("/api", cartRouter);
app.use("/api", brandRouter);
app.use("/api", makeRouter);
app.use("/api", productSectionRouter);

export default app;
