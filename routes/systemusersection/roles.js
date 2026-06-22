// backend/routes/roles.js
import express from "express";
import mongoose from "mongoose"; // Import mongoose for ObjectId validation
import { SchemaOfRole } from "../../schemas/general.js"; // Adjust the import path as necessary
const router = express.Router();
import { Role } from "../../schemas/general.js";
import { updateRoleAccesses,clearRoleAccesses } from "../../controllers/roleController.js";

// GET /api/roles - Fetch all available roles
router.get("/", async (req, res) => {
  try {
    const roles = await SchemaOfRole.find({});
    const roleData = roles.map((role) => ({
      id: role._id, // Mongoose document _id
      name: role.name,
      accesses: role.accesses || [], // Ensure accesses is always an array
    }));
    if (roleData.length === 0) {
      return res.status(200).json([]);
    }

    // Send a 200 OK response with the array of roles
    res.status(200).json(roleData);
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({
      message: "Server error while fetching roles",
      error: error.message,
    });
  }
});

router.get("/allroles", async (req, res) => {
  try {
    const roles = await SchemaOfRole.find({});
    const roleData = roles.map((role) => ({
      _id: role._id,
      name: role.name,
      accesses: role.accesses || [], // Ensure accesses is always an array
      hasAllAccess: role.hasAllAccess || false, // Ensure hasAllAccess is always a boolean
    }));
    res.status(200).json(roleData);
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({
      message: "Server error while fetching roles",
      error: error.message,
    });
  }
});

router.post("/", async (req, res) => {
  const name = req.body.name; 
  if (!name || typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({
      message: "Role name is required and must be a non-empty string.",
    });
  }
  try {
    const existingRole = await SchemaOfRole.findOne({ name: name });
    if (existingRole) {
      return res
        .status(409)
        .json({ message: `Role '${name}' already exists.` });
    }
    const newRole = new SchemaOfRole({ name: name });
    await newRole.save();
    res.status(201).json({
      message: `Role '${name}' added successfully`,
      role: { id: newRole._id, name: newRole.name },
    });
  } catch (error) {
    console.error("Error adding new role:", error);
    res.status(500).json({
      message: "Server error while adding role",
      error: error.message,
    });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params; 
  const name = req.body.name; 
  if (!name || typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({
      message: "New role name is required and must be a non-empty string.",
    });
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid role ID format." });
  }
  try {
    const existingRoleWithNewName = await SchemaOfRole.findOne({
      name: name,
      _id: { $ne: id },
    });
    if (existingRoleWithNewName) {
      return res.status(409).json({
        message: `Role name '${name}' already exists for another role.`,
      });
    }
    const updatedRole = await SchemaOfRole.findByIdAndUpdate(
      id,
      { name: name },
      { new: true, runValidators: true }
    );
    if (!updatedRole) {
      return res.status(404).json({ message: "Role not found." });
    }
    res.status(200).json({
      message: `Role '${updatedRole.name}' updated successfully`,
      role: { id: updatedRole._id, name: updatedRole.name },
    });
  } catch (error) {
    console.error("Error updating role:", error);
    res.status(500).json({
      message: "Server error while updating role",
      error: error.message,
    });
  }
});

// DELETE /api/roles/:id - Delete a role
router.delete("/:id", async (req, res) => {
  const { id } = req.params; // Get the role ID from the URL parameters

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid role ID format." });
  }
  try {
    const deletedRole = await SchemaOfRole.findByIdAndDelete(id);
    if (!deletedRole) {
      return res.status(404).json({ message: "Role not found." });
    }
    res
      .status(200)
      .json({ message: `Role '${deletedRole.name}' deleted successfully` });
  } catch (error) {
    console.error("Error deleting role:", error);
    res.status(500).json({
      message: "Server error while deleting role",
      error: error.message,
    });
  }
});

// New routes for access control
router
  .route("/:id/accesses")
  .put(updateRoleAccesses) // To update accesses
  .delete(clearRoleAccesses); // To clear accesses

export default router;
