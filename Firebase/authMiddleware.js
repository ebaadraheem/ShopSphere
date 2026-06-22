// Import the already-initialized admin instance
import admin from "./FirebaseAdmin.js";

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided.' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    // Verify the token using the imported admin instance
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Attach user info to the request object
    req.user = decodedToken; 
    
    next();
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return res.status(403).json({ message: 'Forbidden: Invalid token.' });
  }
};

export default authMiddleware;