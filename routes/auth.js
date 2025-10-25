const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, phone, department } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'الاسم، البريد الإلكتروني، وكلمة المرور مطلوبة'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'كلمة المرور يجب أن تكون至少 6 أحرف'
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'البريد الإلكتروني مستخدم بالفعل'
            });
        }

        // Create user
        const user = new User({
            name,
            email,
            password,
            role: role || 'user',
            phone,
            department
        });

        await user.save();

        // Generate token
        const token = jwt.sign(
            { 
                userId: user._id, 
                role: user.role 
            },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '30d' }
        );

        res.status(201).json({
            success: true,
            message: 'تم إنشاء الحساب بنجاح',
            data: {
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    phone: user.phone,
                    department: user.department
                }
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في السيرفر: ' + error.message
        });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'البريد الإلكتروني وكلمة المرور مطلوبان'
            });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(400).json({
                success: false,
                error: 'الحساب غير مفعل. يرجى التواصل مع الإدارة'
            });
        }

        // Generate token
        const token = jwt.sign(
            { 
                userId: user._id, 
                role: user.role 
            },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            message: 'تم تسجيل الدخول بنجاح',
            data: {
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    phone: user.phone,
                    department: user.department
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في السيرفر: ' + error.message
        });
    }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                user: req.user
            }
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في السيرفر'
        });
    }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { name, phone, department } = req.body;
        
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { name, phone, department },
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'تم تحديث الملف الشخصي بنجاح',
            data: { user }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في تحديث الملف الشخصي'
        });
    }
});

module.exports = router;