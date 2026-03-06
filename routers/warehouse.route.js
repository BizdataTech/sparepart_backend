import express from "express";
import { productListPDF } from "../controllers/warehouse.controller.js";

const router = express.Router();

router.get("/warehouse/orders/:id/product-list-pdf", productListPDF);

export default router;
