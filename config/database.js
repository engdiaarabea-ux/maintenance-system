const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/maintenance_system', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`✅ MongoDB متصل: ${conn.connection.host}`);
        
        // Event listeners for database connection
        mongoose.connection.on('error', (err) => {
            console.error('❌ خطأ في اتصال MongoDB:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('⚠️  تم فصل اتصال MongoDB');
        });

        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('✅ تم إغلاق اتصال MongoDB');
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ خطأ في الاتصال بقاعدة البيانات:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;