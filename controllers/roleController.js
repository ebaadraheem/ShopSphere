import { SchemaOfRole } from "../schemas/general.js";
import asyncHandler from "express-async-handler";

const updateRoleAccesses = asyncHandler(async (req, res) => {
    console.log("Updating role accesses with data:", req.body);
  const { id } = req.params;
  const { accesses } = req.body; // Expect an array of strings

  if (!Array.isArray(accesses)) {
    throw new Error("Accesses must be an array of strings.", null, 'INVALID_ACCESSES_FORMAT');
  }

  const role = await SchemaOfRole.findById(id);

  if (!role) {
    throw new Error("Role not found.", 'ROLE_NOT_FOUND');
  }

  role.accesses = accesses; // Update the accesses array
  const updatedRole = await role.save();

  res.json({
    message: "Role accesses updated successfully.",
    role: updatedRole, // Return the updated role
  });
});

const clearRoleAccesses = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const role = await SchemaOfRole.findById(id);

  if (!role) {
    throw new Error("Role not found.", 'ROLE_NOT_FOUND');
  }

  role.accesses = []; // Set accesses to an empty array
  const updatedRole = await role.save();

  res.json({
    message: "Role accesses cleared successfully.",
    role: updatedRole, // Return the updated role
  });
});

export {
  updateRoleAccesses,
  clearRoleAccesses,
};