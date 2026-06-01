from fastapi.testclient import TestClient
from app.main import app


def test_admin_analytics_requires_auth():
    client = TestClient(app)
    res = client.get('/admin/analytics')
    assert res.status_code in (401, 422)


def test_admin_users_requires_auth():
    client = TestClient(app)
    res = client.get('/admin/users')
    assert res.status_code in (401, 422)
