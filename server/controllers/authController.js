const prisma = require('../config/database');
const { hashPassword, comparePassword, generateToken, generateResetToken, verifyResetToken } = require('../utils/auth');

const signup = async (req, res) => {
  try {
    const { name, email, password, businessName, country, currency } = req.body;

    if (!name || !email || !password || !businessName) {
      return res.status(400).json({ error: 'Name, email, password, and business name are required' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await hashPassword(password);

    const organization = await prisma.organization.create({
      data: {
        name: businessName,
        country: country || null,
        currency: currency || 'USD',
      },
    });

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'OWNER',
        organizationId: organization.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        action: 'SIGNUP',
        entity: 'User',
        entityId: user.id,
        metadata: JSON.stringify({ email }),
      },
    });

    const token = generateToken({ userId: user.id, organizationId: organization.id });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
      organization: {
        id: organization.id,
        name: organization.name,
        currency: organization.currency,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await comparePassword(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
      },
    });

    const token = generateToken({ userId: user.id, organizationId: user.organizationId });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        currency: user.organization.currency,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

const logout = async (req, res) => {
  try {
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          organizationId: req.user.organizationId,
          userId: req.user.id,
          action: 'LOGOUT',
          entity: 'User',
          entityId: req.user.id,
        },
      });
    }

    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { organization: true },
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        currency: user.organization.currency,
        country: user.organization.country,
        timezone: user.organization.timezone,
        phone: user.organization.phone,
        email: user.organization.email,
        address: user.organization.address,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await comparePassword(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: 'PASSWORD_CHANGE',
        entity: 'User',
        entityId: user.id,
      },
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (email) {
      const emailLower = email.trim().toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email: emailLower } });
      if (existing && existing.id !== req.user.id) {
        return res.status(400).json({ error: 'Email is already taken by another account' });
      }
      updateData.email = emailLower;
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        organizationId: updatedUser.organizationId,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

const updateOrganization = async (req, res) => {
  try {
    const { name, currency, country, timezone, phone, email, address } = req.body;
    const orgId = req.user.organizationId;

    const data = {};
    if (name) data.name = name.trim();
    if (currency) data.currency = currency.trim().toUpperCase();
    if (country !== undefined) data.country = country ? country.trim() : null;
    if (timezone !== undefined) data.timezone = timezone ? timezone.trim() : null;
    if (phone !== undefined) data.phone = phone ? phone.trim() : null;
    if (email !== undefined) data.email = email ? email.trim() : null;
    if (address !== undefined) data.address = address ? address.trim() : null;

    const updatedOrg = await prisma.organization.update({
      where: { id: orgId },
      data,
    });

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: req.user.id,
        action: 'UPDATE_ORGANIZATION',
        entity: 'Organization',
        entityId: orgId,
        metadata: JSON.stringify(data),
      },
    });

    res.json({
      success: true,
      message: 'Organization settings updated successfully',
      organization: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        currency: updatedOrg.currency,
        country: updatedOrg.country,
        timezone: updatedOrg.timezone,
        phone: updatedOrg.phone,
        email: updatedOrg.email,
        address: updatedOrg.address,
      },
    });
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ error: 'Failed to update organization settings' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      // Safe response to prevent account enumeration
      return res.json({
        success: true,
        message: 'If an account exists with that email, a password reset link has been prepared.',
      });
    }

    const resetToken = generateResetToken(user.id, user.email);

    // If real email service is configured (e.g. SMTP/SendGrid/SES), email would be sent here.
    // In current environment, we record the audit log and return instructions/token for testing.
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        entity: 'User',
        entityId: user.id,
      },
    });

    const isDev = process.env.NODE_ENV !== 'production';
    res.json({
      success: true,
      message: 'Password reset token generated. Set up SMTP/Email provider to deliver reset emails directly.',
      resetToken: isDev ? resetToken : undefined,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    const decoded = verifyResetToken(token);
    if (!decoded || !decoded.userId) {
      return res.status(400).json({ error: 'Invalid or expired password reset token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User no longer exists' });
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: 'PASSWORD_RESET_COMPLETED',
        entity: 'User',
        entityId: user.id,
      },
    });

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

module.exports = {
  signup,
  login,
  logout,
  getMe,
  changePassword,
  updateProfile,
  updateOrganization,
  forgotPassword,
  resetPassword,
};
