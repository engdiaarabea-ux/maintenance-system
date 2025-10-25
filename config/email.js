const nodemailer = require('nodemailer');

// إعدادات البريد الإلكتروني
const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// دالة إرسال البريد
const sendEmail = async (to, subject, html) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject,
            html
        };
        
        const result = await transporter.sendMail(mailOptions);
        console.log('✅ تم إرسال البريد الإلكتروني:', result.messageId);
        return result;
    } catch (error) {
        console.error('❌ خطأ في إرسال البريد:', error);
        throw error;
    }
};

// إشعار إنشاء طلب صيانة جديد
const sendNewRequestNotification = async (request, assignedToEmail) => {
    const subject = `طلب صيانة جديد - ${request.title}`;
    const html = `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">طلب صيانة جديد</h2>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                <p><strong>الموضوع:</strong> ${request.title}</p>
                <p><strong>الوصف:</strong> ${request.description}</p>
                <p><strong>النوع:</strong> ${request.type}</p>
                <p><strong>الأولوية:</strong> ${request.priority}</p>
                <p><strong>الموقع:</strong> ${request.location || 'غير محدد'}</p>
                <p><strong>رقم الطلب:</strong> ${request._id}</p>
            </div>
            <p style="margin-top: 20px;">
                <a href="http://localhost:3000/requests/${request._id}" 
                   style="background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                   عرض الطلب
                </a>
            </p>
        </div>
    `;
    
    return await sendEmail(assignedToEmail, subject, html);
};

// إشعار تحديث حالة الطلب
const sendStatusUpdateNotification = async (request, oldStatus, newStatus) => {
    const subject = `تحديث حالة طلب الصيانة - ${request.title}`;
    const html = `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">تم تحديث حالة طلب الصيانة</h2>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                <p><strong>الطلب:</strong> ${request.title}</p>
                <p><strong>الحالة السابقة:</strong> ${oldStatus}</p>
                <p><strong>الحالة الجديدة:</strong> ${newStatus}</p>
                <p><strong>وقت التحديث:</strong> ${new Date().toLocaleString('ar-EG')}</p>
            </div>
            <p style="margin-top: 20px;">
                <a href="http://localhost:3000/requests/${request._id}" 
                   style="background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                   عرض التفاصيل
                </a>
            </p>
        </div>
    `;
    
    return await sendEmail(request.createdBy.email, subject, html);
};

// إشعار تأخير في المعالجة
const sendDelayedRequestNotification = async (request) => {
    const delayedHours = Math.floor((new Date() - request.createdAt) / (1000 * 60 * 60));
    
    const subject = `تنبيه: تأخر في معالجة طلب الصيانة - ${request.title}`;
    const html = `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">تنبيه تأخر في المعالجة</h2>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                <p><strong>الطلب:</strong> ${request.title}</p>
                <p><strong>وقت الإنشاء:</strong> ${request.createdAt.toLocaleString('ar-EG')}</p>
                <p><strong>مدة التأخر:</strong> ${delayedHours} ساعة</p>
                <p><strong>الحالة الحالية:</strong> ${request.status}</p>
            </div>
            <p style="margin-top: 20px;">
                <a href="http://localhost:3000/requests/${request._id}" 
                   style="background: #e74c3c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                   متابعة الطلب
                </a>
            </p>
        </div>
    `;
    
    const recipients = ['admin@company.com'];
    if (request.assignedTo && request.assignedTo.email) {
        recipients.push(request.assignedTo.email);
    }
    
    return await sendEmail(recipients.join(','), subject, html);
};

module.exports = {
    transporter,
    sendEmail,
    sendNewRequestNotification,
    sendStatusUpdateNotification,
    sendDelayedRequestNotification
};