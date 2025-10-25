const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(async () => {
    console.log('✅ تم الاتصال بـ MongoDB Atlas بنجاح');
    await createDefaultUsers();
})
.catch(error => {
    console.error('❌ خطأ في الاتصال بقاعدة البيانات:', error);
});

// User Model
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'technician', 'user'], default: 'user' },
    language: { type: String, enum: ['ar', 'en'], default: 'ar' }
}, { timestamps: true });

UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

const User = mongoose.model('User', UserSchema);

// إنشاء المستخدمين الافتراضيين
async function createDefaultUsers() {
    try {
        const users = [
            { name: 'مدير النظام', email: 'admin@company.com', password: '123456', role: 'admin' },
            { name: 'فني الصيانة', email: 'technician@company.com', password: '123456', role: 'technician' },
            { name: 'موظف عادي', email: 'user@company.com', password: '123456', role: 'user' }
        ];
        
        for (let userData of users) {
            const existingUser = await User.findOne({ email: userData.email });
            if (!existingUser) {
                const user = new User(userData);
                await user.save();
                console.log(`✅ تم إنشاء المستخدم: ${userData.email}`);
            }
        }
    } catch (error) {
        console.error('❌ خطأ في إنشاء المستخدمين:', error);
    }
}

// Routes
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }
        
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET || 'fallback-secret'
        );
        
        res.json({
            message: 'تم تسجيل الدخول بنجاح',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                language: user.language
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/test', (req, res) => {
    res.json({ message: 'الـ Backend شغال بنجاح!' });
});

app.get('/', (req, res) => {
    res.json({ 
        message: 'مرحباً بك في نظام الصيانة',
        version: '1.0.0'
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 الخادم شغال على http://localhost:${PORT}`);
});