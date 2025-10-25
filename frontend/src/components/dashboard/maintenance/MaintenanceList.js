import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Container, Row, Col, Card, Table, Button, Badge, Form, InputGroup } from 'react-bootstrap';
import { maintenanceAPI } from '../../../services/api';

const MaintenanceList = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await maintenanceAPI.getRequests();
      setRequests(response.data.data.requests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'new': return 'primary';
      case 'in_progress': return 'warning';
      case 'completed': return 'success';
      case 'cancelled': return 'danger';
      default: return 'secondary';
    }
  };

  const getPriorityVariant = (priority) => {
    switch (priority) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'secondary';
    }
  };

  const filteredRequests = filter === 'all' 
    ? requests 
    : requests.filter(req => req.status === filter);

  if (loading) {
    return <div className="text-center p-4">{t('loading')}...</div>;
  }

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h4>{t('maintenance_requests')}</h4>
            <Button variant="primary" size="sm">
              + {t('new_request')}
            </Button>
          </div>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col>
          <Card>
            <Card.Body>
              <div className="d-flex gap-2 flex-wrap">
                <Button
                  variant={filter === 'all' ? 'primary' : 'outline-primary'}
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  {t('all')} ({requests.length})
                </Button>
                <Button
                  variant={filter === 'new' ? 'primary' : 'outline-primary'}
                  size="sm"
                  onClick={() => setFilter('new')}
                >
                  {t('new')} ({requests.filter(r => r.status === 'new').length})
                </Button>
                <Button
                  variant={filter === 'in_progress' ? 'primary' : 'outline-primary'}
                  size="sm"
                  onClick={() => setFilter('in_progress')}
                >
                  {t('in_progress')} ({requests.filter(r => r.status === 'in_progress').length})
                </Button>
                <Button
                  variant={filter === 'completed' ? 'primary' : 'outline-primary'}
                  size="sm"
                  onClick={() => setFilter('completed')}
                >
                  {t('completed')} ({requests.filter(r => r.status === 'completed').length})
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">{t('maintenance_requests')}</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>{t('title')}</th>
                    <th>{t('type')}</th>
                    <th>{t('priority')}</th>
                    <th>{t('status')}</th>
                    <th>{t('location')}</th>
                    <th>{t('created_at')}</th>
                    <th>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => (
                    <tr key={request._id}>
                      <td>
                        <div>
                          <strong>{request.title}</strong>
                          <br />
                          <small className="text-muted">{request.description.substring(0, 50)}...</small>
                        </div>
                      </td>
                      <td>
                        <Badge bg="secondary">{request.type}</Badge>
                      </td>
                      <td>
                        <Badge bg={getPriorityVariant(request.priority)}>
                          {t(request.priority)}
                        </Badge>
                      </td>
                      <td>
                        <Badge bg={getStatusVariant(request.status)}>
                          {t(request.status)}
                        </Badge>
                      </td>
                      <td>{request.location || '-'}</td>
                      <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                      <td>
                        <Button variant="outline-primary" size="sm">
                          {t('view')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              
              {filteredRequests.length === 0 && (
                <div className="text-center p-4 text-muted">
                  {t('no_requests_found')}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default MaintenanceList;
