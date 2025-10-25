const express = require('express');
const multer = require('multer');
const path = require('path');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// إعدادات رفع الملفات
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('يسمح برفع الصور فقط!'), false);
        }
    }
});

// إنشاء طلب صيانة جديد
router.post('/', authMiddleware, upload.array('images', 5), async (req, res) => {
    try {
        const { title, description, type, category, priority, location } = req.body;

        if (!title || !description || !type || !category) {
            return res.status(400).json({
                success: false,
                error: 'العنوان، الوصف، النوع، والتصنيف مطلوبون'
            });
        }

        const request = new MaintenanceRequest({
            title,
            description,
            type,
            category,
            priority: priority || 'medium',
            location,
            createdBy: req.user._id
        });

        // حفظ الصور إذا وجدت
        if (req.files && req.files.length > 0) {
            request.images = req.files.map(file => file.filename);
        }

        await request.save();
        await request.populate('createdBy', 'name email');

        res.status(201).json({
            success: true,
            message: 'تم إنشاء طلب الصيانة بنجاح',
            data: { request }
        });

    } catch (error) {
        console.error('Create maintenance error:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في إنشاء طلب الصيانة: ' + error.message
        });
    }
});

// الحصول على جميع طلبات الصيانة
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { status, type, page = 1, limit = 10 } = req.query;
        
        let filter = {};
        
        // الفلترة حسب الصلاحيات
        if (req.user.role !== 'admin') {
            filter = {
                $or: [
                    { createdBy: req.user._id },
                    { assignedTo: req.user._id }
                ]
            };
        }
        
        // الفلترة حسب الحالة
        if (status) {
            filter.status = status;
        }
        
        // الفلترة حسب النوع
        if (type) {
            filter.type = type;
        }
        
        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { createdAt: -1 },
            populate: [
                { path: 'createdBy', select: 'name email role' },
                { path: 'assignedTo', select: 'name email role' }
            ]
        };
        
        const requests = await MaintenanceRequest.find(filter)
            .populate('createdBy', 'name email role')
            .populate('assignedTo', 'name email role')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);
            
        const total = await MaintenanceRequest.countDocuments(filter);
        
        res.json({
            success: true,
            data: {
                requests,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                total
            }
        });
        
    } catch (error) {
        console.error('Get maintenance error:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في جلب طلبات الصيانة'
        });
    }
});

// الحصول على طلب صيانة محدد
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const request = await MaintenanceRequest.findById(req.params.id)
            .populate('createdBy', 'name email role phone')
            .populate('assignedTo', 'name email role')
            .populate('comments.createdBy', 'name email role');
            
        if (!request) {
            return res.status(404).json({
                success: false,
                error: 'طلب الصيانة غير موجود'
            });
        }
        
        // التحقق من الصلاحيات
        if (req.user.role !== 'admin' && 
            request.createdBy._id.toString() !== req.user._id.toString() &&
            (!request.assignedTo || request.assignedTo._id.toString() !== req.user._id.toString())) {
            return res.status(403).json({
                success: false,
                error: 'ليس لديك صلاحية للوصول إلى هذا الطلب'
            });
        }
        
        res.json({
            success: true,
            data: { request }
        });
        
    } catch (error) {
        console.error('Get single maintenance error:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في جلب طلب الصيانة'
        });
    }
});

// تحديث طلب الصيانة
router.put('/:id', authMiddleware, requireRole(['admin', 'technician']), async (req, res) => {
    try {
        const { title, description, priority, status, assignedTo, location, estimatedHours, actualHours } = req.body;
        
        const request = await MaintenanceRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({
                success: false,
                error: 'طلب الصيانة غير موجود'
            });
        }
        
        // التحقق من صلاحيات الفني
        if (req.user.role === 'technician' && request.assignedTo?.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'ليس لديك صلاحية لتعديل هذا الطلب'
            });
        }
        
        // التحديثات المسموحة
        const updates = {};
        if (title) updates.title = title;
        if (description) updates.description = description;
        if (priority) updates.priority = priority;
        if (status) updates.status = status;
        if (assignedTo) updates.assignedTo = assignedTo;
        if (location) updates.location = location;
        if (estimatedHours) updates.estimatedHours = estimatedHours;
        if (actualHours) updates.actualHours = actualHours;
        
        // إذا تم الانتهاء، سجل وقت الانتهاء
        if (status === 'completed' && request.status !== 'completed') {
            updates.completedAt = new Date();
        }
        
        const updatedRequest = await MaintenanceRequest.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        ).populate('createdBy', 'name email')
         .populate('assignedTo', 'name email');
        
        res.json({
            success: true,
            message: 'تم تحديث طلب الصيانة بنجاح',
            data: { request: updatedRequest }
        });
        
    } catch (error) {
        console.error('Update maintenance error:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في تحديث طلب الصيانة'
        });
    }
});

// إضافة تعليق
router.post('/:id/comments', authMiddleware, async (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text) {
            return res.status(400).json({
                success: false,
                error: 'نص التعليق مطلوب'
            });
        }
        
        const request = await MaintenanceRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({
                success: false,
                error: 'طلب الصيانة غير موجود'
            });
        }
        
        // التحقق من الصلاحيات
        if (req.user.role === 'user' && request.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'ليس لديك صلاحية لإضافة تعليق على هذا الطلب'
            });
        }
        
        request.comments.push({
            text,
            createdBy: req.user._id
        });
        
        await request.save();
        await request.populate('comments.createdBy', 'name email role');
        
        res.json({
            success: true,
            message: 'تم إضافة التعليق بنجاح',
            data: { comments: request.comments }
        });
        
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في إضافة التعليق'
        });
    }
});

// إضافة قطع غيار مطلوبة
router.post('/:id/required-parts', authMiddleware, requireRole(['admin', 'technician']), async (req, res) => {
    try {
        const { partName, quantity, availableInStock } = req.body;
        
        if (!partName || !quantity) {
            return res.status(400).json({
                success: false,
                error: 'اسم القطعة والكمية مطلوبان'
            });
        }
        
        const request = await MaintenanceRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({
                success: false,
                error: 'طلب الصيانة غير موجود'
            });
        }
        
        // التحقق من صلاحيات الفني
        if (req.user.role === 'technician' && request.assignedTo?.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'ليس لديك صلاحية لإضافة قطع غيار لهذا الطلب'
            });
        }
        
        request.requiredParts.push({
            partName,
            quantity: parseInt(quantity),
            availableInStock: availableInStock || false
        });
        
        await request.save();
        
        res.json({
            success: true,
            message: 'تم إضافة القطعة المطلوبة بنجاح',
            data: { requiredParts: request.requiredParts }
        });
        
    } catch (error) {
        console.error('Add required parts error:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في إضافة القطعة المطلوبة'
        });
    }
});

// الحصول على إحصائيات
router.get('/stats/overview', authMiddleware, async (req, res) => {
    try {
        let filter = {};
        
        if (req.user.role !== 'admin') {
            filter = {
                $or: [
                    { createdBy: req.user._id },
                    { assignedTo: req.user._id }
                ]
            };
        }
        
        const totalRequests = await MaintenanceRequest.countDocuments(filter);
        const newRequests = await MaintenanceRequest.countDocuments({ ...filter, status: 'new' });
        const inProgressRequests = await MaintenanceRequest.countDocuments({ ...filter, status: 'in_progress' });
        const completedRequests = await MaintenanceRequest.countDocuments({ ...filter, status: 'completed' });
        
        // إحصائيات حسب النوع
        const typeStats = await MaintenanceRequest.aggregate([
            { $match: filter },
            { $group: { _id: '$type', count: { $sum: 1 } } }
        ]);
        
        res.json({
            success: true,
            data: {
                total: totalRequests,
                new: newRequests,
                inProgress: inProgressRequests,
                completed: completedRequests,
                typeStats: typeStats
            }
        });
        
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في جلب الإحصائيات'
        });
    }
});

module.exports = router;