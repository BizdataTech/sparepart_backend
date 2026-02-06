import express from "express";
import { getClientLogo, getSections } from "../controllers/clientController.js";

const router = express.Router();

router.get("/client/logo", getClientLogo);
router.get("/client/sections", getSections);

export default router;
