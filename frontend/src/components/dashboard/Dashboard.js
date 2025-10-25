import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import LanguageSwitcher from '../shared/LanguageSwitcher';
import MaintenanceList from './maintenance/MaintenanceList';
import CreateRequest from './maintenance/CreateRequest';

const Dashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [refreshList, setRefreshList] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    setRefreshList(prev => !prev);
  };

  return (
    <Container fluid className="min-vh-100 bg-light p-0">
      {/* Header */}
      <div className="dashboard-header">
        <Container>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h3 className="mb-1">{t('dashboard')}</h3>
              <p className="text-muted mb-0">
                {t('welcome')}, {user.name} ({t(user.role)})
              </p>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <LanguageSwitcher />
              <Button variant="outline-danger" onClick={handleLogout}>
                {t('logout')}
              </Button>
            </div>
          </div>
        </Container>
      </div>

      {/* Main Content */}
      <Container className="mt-4">
        {showCreateForm ? (
          <CreateRequest 
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowCreateForm(false)}
          />
        ) : (
          <>
            {/* Quick Stats */}
            <Row className="mb-4">
              <Col md={3}>
                <Card className="stats-card">
                  <h2 className="stats-number">0</h2>
                  <p className="stats-label">{t('new')}</p>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="stats-card">
                  <h2 className="stats-number">0</h2>
                  <p className="stats-label">{t('in_progress')}</p>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="stats-card">
                  <h2 className="stats-number">0</h2>
                  <p className="stats-label">{t('completed')}</p>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="stats-card">
                  <h2 className="stats-number">0</h2>
                  <p className="stats-label">{t('total')}</p>
                </Card>
              </Col>
            </Row>

            {/* Maintenance Requests */}
            <MaintenanceList key={refreshList} />
          </>
        )}
      </Container>
    </Container>
  );
};

export default Dashboard;
