const axios = require('axios');

// تكامل Freshservice
class FreshserviceIntegration {
    constructor() {
        this.baseURL = `https://${process.env.FRESHSERVICE_DOMAIN}/api/v2`;
        this.apiKey = process.env.FRESHSERVICE_API_KEY;
        this.authHeader = {
            'Authorization': 'Basic ' + Buffer.from(this.apiKey + ':X').toString('base64'),
            'Content-Type': 'application/json'
        };
    }

    // الحصول على التذاكر من Freshservice
    async getTickets() {
        try {
            const response = await axios.get(`${this.baseURL}/tickets`, {
                headers: this.authHeader
            });
            
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Freshservice get tickets error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    // الحصول على تذكرة محددة
    async getTicket(ticketId) {
        try {
            const response = await axios.get(`${this.baseURL}/tickets/${ticketId}`, {
                headers: this.authHeader
            });
            
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Freshservice get ticket error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    // تحديث تذكرة في Freshservice
    async updateTicket(ticketId, updateData) {
        try {
            const response = await axios.put(`${this.baseURL}/tickets/${ticketId}`, updateData, {
                headers: this.authHeader
            });
            
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Freshservice update ticket error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    // إنشاء تذكرة جديدة في Freshservice
    async createTicket(ticketData) {
        try {
            const response = await axios.post(`${this.baseURL}/tickets`, ticketData, {
                headers: this.authHeader
            });
            
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Freshservice create ticket error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    // مزامنة تذكرة Freshservice مع النظام
    async syncTicketToSystem(ticketId) {
        try {
            const ticketResult = await this.getTicket(ticketId);
            
            if (!ticketResult.success) {
                return ticketResult;
            }

            const ticket = ticketResult.data.ticket;
            
            // تحويل تذكرة Freshservice إلى طلب صيانة في النظام
            const maintenanceData = {
                title: ticket.subject,
                description: ticket.description_text,
                type: this.mapFreshserviceCategory(ticket.category),
                category: ticket.sub_category || 'general',
                priority: this.mapFreshservicePriority(ticket.priority),
                status: this.mapFreshserviceStatus(ticket.status),
                location: ticket.department || 'غير محدد',
                externalId: ticket.id.toString(),
                source: 'freshservice'
            };

            // هنا يمكنك إضافة كود لحفظ البيانات في قاعدة البيانات
            const MaintenanceRequest = require('../models/MaintenanceRequest');
            const existingRequest = await MaintenanceRequest.findOne({ externalId: ticket.id.toString() });

            if (existingRequest) {
                // تحديث الطلب الموجود
                const updatedRequest = await MaintenanceRequest.findByIdAndUpdate(
                    existingRequest._id,
                    maintenanceData,
                    { new: true }
                );
                return { success: true, data: updatedRequest, action: 'updated' };
            } else {
                // إنشاء طلب جديد
                const newRequest = new MaintenanceRequest(maintenanceData);
                await newRequest.save();
                return { success: true, data: newRequest, action: 'created' };
            }

        } catch (error) {
            console.error('Sync ticket error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // تحويل أولوية Freshservice إلى أولوية النظام
    mapFreshservicePriority(freshservicePriority) {
        const priorityMap = {
            1: 'critical', // Low in Freshservice
            2: 'high',     // Medium
            3: 'medium',   // High
            4: 'low'       // Urgent
        };
        return priorityMap[freshservicePriority] || 'medium';
    }

    // تحويل حالة Freshservice إلى حالة النظام
    mapFreshserviceStatus(freshserviceStatus) {
        const statusMap = {
            2: 'in_progress', // Open
            3: 'in_progress', // Pending
            4: 'completed',   // Resolved
            5: 'cancelled'    // Closed
        };
        return statusMap[freshserviceStatus] || 'new';
    }

    // تحويل تصنيف Freshservice إلى نوع النظام
    mapFreshserviceCategory(category) {
        const categoryMap = {
            'Electrical': 'electrical',
            'Plumbing': 'plumbing',
            'HVAC': 'ac',
            'Civil': 'civil',
            'Fire Safety': 'fire_fighting',
            'Generator': 'generator',
            'UPS': 'ups'
        };
        return categoryMap[category] || 'general';
    }
}

module.exports = new FreshserviceIntegration();