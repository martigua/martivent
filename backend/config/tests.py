def test_healthz_ok(client):
    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_openapi_schema_available(client):
    response = client.get("/api/schema/")

    assert response.status_code == 200
