import { User } from "../schemas/general.js";
import admin from "../Firebase/FirebaseAdmin.js";
import asyncHandler from "express-async-handler";

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find()
    .populate("role", "name");
    console.log("Fetched users:", users);
  res.json(users);
});

const createUser = asyncHandler(async (req, res) => {
  const { name, email, role, cnic, contactNo, password } = req.body;
  console.log("Creating user with data:",req.body);
  if (!name || !email || !role || !cnic || !contactNo || !password) {
    res.status(400).json({ message: "Please enter all required fields." });
    throw new Error("Please enter all required fields.");
  }
  const userExistsMongo = await User.findOne({ $or: [{ email }, { cnic }] });
  if (userExistsMongo) {
    res.status(400).json({ message: "User with that email or CNIC already exists." });
    throw new Error("User with that email or CNIC already exists.");
  }

  let firebaseUid;
  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });
    firebaseUid = userRecord.uid;
    console.log("Successfully created new Firebase user:", userRecord.uid);
  } catch (firebaseError) {
    if (firebaseError.code === "auth/email-already-exists") {
      res.status(400).json({ message: "Email already registered." });
      throw new Error("Email already registered.");
    }
    console.error("Firebase user creation error:", firebaseError);
    res.status(500).json({ message: "Failed to create user in Firebase." });
    throw new Error("Failed to create user in Firebase Authentication.");
  }

  try {
    const user = await User.create({
      name,
      email,
      role: role._id,
      cnic,
      contactNo,
      firebaseUid,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        cnic: user.cnic,
        contactNo: user.contactNo,
      });
    } else {
      await admin.auth().deleteUser(firebaseUid);
      res.status(400).json({ message: "Invalid user data." });
      throw new Error("Invalid user data for MongoDB.");
    }
  } catch (mongoError) {
    try {
      if (firebaseUid) {
        await admin.auth().deleteUser(firebaseUid);
        console.log("Cleaned up Firebase user due to MongoDB failure:", firebaseUid);
      }
    } catch (cleanupError) {
      console.error("Failed to clean up Firebase user:", cleanupError);
    }
    console.error("MongoDB user creation error:", mongoError);
    res.status(500).json({ message: "Failed to save user data to database." });
    throw new Error("Failed to save user data to database.");
  }
});

const updateUser = asyncHandler(async (req, res) => {
  const { name, role, cnic, contactNo } = req.body; 

  const user = await User.findById(req.params.id);

  if (user) {
    user.name = name || user.name;
    user.role = role._id || user.role._id;
    user.cnic = cnic || user.cnic;
    user.contactNo = contactNo || user.contactNo;

    if (cnic && cnic !== user.cnic) {
      const cnicExists = await User.findOne({ cnic });
      if (cnicExists && cnicExists._id.toString() !== user._id.toString()) {
        res.status(400).json({ message: "CNIC already exists for another user." });
        throw new Error("CNIC already exists for another user.");
      }
    }

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email, // Keep existing email
      role: updatedUser.role.name,
      cnic: updatedUser.cnic,
      contactNo: updatedUser.contactNo,
    });
  } else {
    res.status(404).json({ message: "User not found." });
    throw new Error("User not found.");
  }
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    const firebaseUid = user.firebaseUid;
    await user.deleteOne();
    try {
      await admin.auth().deleteUser(firebaseUid);
      console.log("Successfully deleted Firebase user:", firebaseUid);
    } catch (firebaseError) {
      if (firebaseError.code === "auth/user-not-found") {
        console.warn(
          "Firebase user not found, likely already deleted or never existed:",
          firebaseUid
        );
      } else {
        console.error("Firebase user deletion error:", firebaseError);
      }
    }

    res.json({ message: "User removed successfully." });
  } else {
    res.status(404).json({ message: "User not found." });
    throw new Error("User not found.");
  }
});

export {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
};