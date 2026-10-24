
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET =
  process.env.JWT_SECRET || 'foodloop_secret_key_123';

// Verify login and load the latest account status from MongoDB.
// Restricted users can still log in so they can submit appeals.
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Not authorized. Please log in.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        message: 'Account not found. Please log in again.',
      });
    }

    // Always use the current database role and account status.
    req.user = {
      id: user._id.toString(),
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      organization: user.organization,
      accountActive: user.accountActive !== false,
      isArchived: user.isArchived === true,
    };

    req.dbUser = user;

    next();
  } catch (error) {
    console.error('Authentication error:', error);

    return res.status(401).json({
      message: 'Invalid or expired token. Please log in again.',
    });
  }
};

// Allow only active, non-archived accounts to perform restricted actions.
export const requireActiveAccount = (req, res, next) => {
  if (
    req.user?.accountActive === false ||
    req.user?.isArchived === true
  ) {
    return res.status(403).json({
      message:
        'Your account is restricted. You can still submit an appeal to the Admin.',
      code: 'ACCOUNT_RESTRICTED',
    });
  }

  next();
};

// Allow Donors and Admins where donor permissions are required.
// Restricted Donors are still blocked from restricted actions.
export const donorOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: 'Authentication required.',
    });
  }

  if (!['Donor', 'Admin'].includes(req.user.role)) {
    return res.status(403).json({
      message: 'Access denied. Donor access required.',
    });
  }

  next();
};

// Restrict access to the specified roles.
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied. You do not have permission.',
      });
    }

    next();
  };
};
