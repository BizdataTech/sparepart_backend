import express from "express";
import {
  createSection,
  deleteSection,
  getSearch,
  getSectionData,
  getSectionReference,
  getSections,
  updateSection,
} from "../controllers/sectionController.js";
import multer from "multer";

const router = express.Router();

router.get("/sections/search/:data_source", getSearch);
router.get("/sections", getSections);
router.get("/sections/reference/:reference_id", getSectionReference);
router.get("/sections/:section_type", getSectionData);
router.post(
  "/sections",
  multer({ storage: multer.memoryStorage() }).single("secure_url"),
  createSection,
);
router.patch(
  "/sections/:id",
  multer({ storage: multer.memoryStorage() }).single("secure_url"),
  updateSection,
);
router.delete("/sections/:id", deleteSection);

export default router;
