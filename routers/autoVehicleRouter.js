import {
  createVehicle,
  getVehicles,
  updateVehicle,
} from "../controllers/autoVehicleController.js";
import express from "express";

let router = express.Router();

router.get("/auto-vehicles", getVehicles);
router.post("/auto-vehicles", createVehicle);
router.patch("/auto-vehicles/:id", updateVehicle);

export default router;
