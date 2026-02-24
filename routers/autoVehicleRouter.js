import {
  createVehicle,
  getVehicles,
  updateVehicle,
} from "../controllers/autoVehicleController.js";
import express from "express";
import authenticateAdmin from "../middlewares/authenticateAdmin.js";

let router = express.Router();

router.get("/auto-vehicles", getVehicles);
router.post("/auto-vehicles", authenticateAdmin, createVehicle);
router.patch("/auto-vehicles/:id", authenticateAdmin, updateVehicle);

export default router;
