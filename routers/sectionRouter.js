import express from "express";
import {
  createSection,
  getSearch,
  getSectionData,
  getSectionReference,
  getSections,
} from "../controllers/sectionController.js";
import multer from "multer";

const router = express.Router();

router.get("/sections", getSections);
router.get("/sections/reference/:reference_id", getSectionReference);
router.get("/sections/:type", getSectionData);
router.post(
  "/sections",
  multer({ storage: multer.memoryStorage() }).single("url"),
  createSection,
);
router.get("/sections/search/:data_source", getSearch);

export default router;
