const express = require('express');
const User = require('../models/User');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// الحصول على جميع المستخدمين (للمدير فقط)
router.get('/', authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
        const users = await User.find({})
            .select('-password')
            .sort({ createdAt: -1 });
            
        res.json({
            success: true,
            data: { users }
        });
        
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في جلب المستخدمين'
        });
    }
});

// الحصول على مستخدم محدد
router.get('/:id', authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'المستخدم غير موجود'
            });
        }
        
        res.json({
            success: true,
            data: { user }
        });
        
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في جلب بيانات المستخدم'
        });
    }
});

// تحديث مستخدم
router.put('/:id', authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
        const { name, email, role, phone, department, isActive } = req.body;
        
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'المستخدم غير موجود'
            });
        }
        
        const updates = {};
        if (name) updates.name = name;
        if (email) updates.email = email;
        if (role) updates.role = role;
        if (phone !== undefined) updates.phone = phone;
        if (department !== undefined) updates.department = department;
        if (isActive !== undefined) updates.isActive = isActive;
        
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        ).select('-password');
        
        res.json({
            success: true,
            message: 'تم تحديث المستخدم بنجاح',
            data: { user: updatedUser }
        });
        
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في تحديث المستخدم'
        });
    }
});

// حذف مستخدم
router.delete('/:id', authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'المستخدم غير موجود'
            });
        }
        
        // منع حذف المستخدم إذا كان لديه طلبات صيانة
        const MaintenanceRequest = require('../models/MaintenanceRequest');
        const userRequests = await MaintenanceRequest.countDocuments({
            $or: [
                { createdBy: req.params.id },
                { assignedTo: req.params.id }
            ]
        });
        
        if (userRequests > 0) {
            return res.status(400).json({
                success: false,
                error: 'لا يمكن حذف المستخدم لأنه مرتبط بطلبات صيانة'
            });
        }
        
        await User.findByIdAndDelete(req.params.id);
        
        res.json({
            success: true,
            message: 'تم حذف المستخدم بنجاح'
        });
        
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في حذف المستخدم'
        });
    }
});

// الحصول على الفنيين فقط
router.get('/role/technicians', authMiddleware, async (req, res) => {
    try {
        const technicians = await User.find({ role: 'technician', isActive: true })
            .select('name email phone department')
            .sort({ name: 1 });
            
        res.json({
            success: true,
            data: { technicians }
        });
        
    } catch (error) {
        console.error('Get technicians error:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في جلب قائمة الفنيين'
        });
    }
});

// تحديث حالة المستخدم (تفعيل/تعطيل)
router.patch('/:id/status', authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
        const { isActive } = req.body;
        
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isActive },
            { new: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'المستخدم غير موجود'
            });
        }
        
        res.json({
            success: true,
            message: `تم ${isActive ? 'تفعيل' : 'تعطيل'} المستخدم بنجاح`,
            data: { user }
        });
        
    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في تحديث حالة المستخدم'
        });
    }
});

module.exports = router;