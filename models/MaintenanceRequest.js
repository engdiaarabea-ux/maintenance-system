const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const RequiredPartSchema = new mongoose.Schema({
    partName: {
        type: String,
        required: true,
        trim: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    availableInStock: {
        type: Boolean,
        default: false
    },
    requestedAt: {
        type: Date,
        default: Date.now
    }
});

const MaintenanceRequestSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        required: true,
        enum: [
            'electrical', 'civil', 'plumbing', 'ac', 
            'equipment', 'belts', 'fire_alarm', 'ups', 
            'generator', 'fire_fighting', 'cleaning', 'pest_control'
        ]
    },
    category: {
        type: String,
        required: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['new', 'in_progress', 'completed', 'cancelled'],
        default: 'new'
    },
    location: {
        type: String,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    images: [{
        type: String,
        trim: true
    }],
    comments: [CommentSchema],
    requiredParts: [RequiredPartSchema],
    completedAt: {
        type: Date
    },
    estimatedHours: {
        type: Number,
        min: 0
    },
    actualHours: {
        type: Number,
        min: 0
    }
}, {
    timestamps: true
});

// Index for better performance
MaintenanceRequestSchema.index({ status: 1, createdAt: -1 });
MaintenanceRequestSchema.index({ createdBy: 1, createdAt: -1 });
MaintenanceRequestSchema.index({ assignedTo: 1, status: 1 });

// Virtual for request age
MaintenanceRequestSchema.virtual('ageInDays').get(function() {
    return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('MaintenanceRequest', MaintenanceRequestSchema);