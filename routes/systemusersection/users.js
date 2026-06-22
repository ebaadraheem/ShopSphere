import express from "express";
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../../controllers/userController.js";
import authMiddleware from "../../Firebase/authMiddleware.js";
import { User } from "../../schemas/general.js";

const router = express.Router();

router.get("/", getAllUsers);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid }).populate({
      path: "role",
      select: "name accesses", // Select only the fields you need from the role
    });

    if (!user) {
      return res.status(404).json({ message: "User profile not found." });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
