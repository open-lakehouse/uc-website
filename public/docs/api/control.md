---
title: "Unity Control API"
description: "SCIM user management, token exchange, and logout on the Unity Catalog server."
canonical: https://unitycatalog.io/docs/api/control/
openapi: https://raw.githubusercontent.com/unitycatalog/unitycatalog/v0.7.0/api/control.yaml
---

# Unity Control API

SCIM user management, token exchange, and logout on the Unity Catalog server.

OpenAPI document: <https://raw.githubusercontent.com/unitycatalog/unitycatalog/v0.7.0/api/control.yaml> ([v0.7.0](https://github.com/unitycatalog/unitycatalog/blob/v0.7.0/api/control.yaml)).

Paths are relative to `http://localhost:8080/api/1.0/unity-control`.

## Users

- `GET /scim2/Users`: List users
- `POST /scim2/Users`: Create a user
- `GET /scim2/Users/{id}`: Get a user
- `PUT /scim2/Users/{id}`: Update a user
- `DELETE /scim2/Users/{id}`: Delete a user
- `GET /scim2/Me`: Get the current user

## OAuth2

- `POST /auth/tokens`: Get a token using an OAuth2 flow
- `POST /auth/logout`: Revoke access token cookie
