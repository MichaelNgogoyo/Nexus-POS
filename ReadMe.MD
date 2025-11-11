# 🛒 Point of Sale (POS) System

A modular Point of Sale system built with **Spring Boot** and **React**, designed for managing sales operations, product inventory, and flexible payment integrations. The system is scalable, secure, and supports modern authentication and payment services.

---

## 🚀 Features

- **Sales Module** – Checkout logic, transaction processing, and sales reporting.
- **Product Module** – Product catalog management, inventory control, and stock validation.
- **Payment Integration** – Supports **Daraja (M-Pesa API)**, **Visa**, **Stripe**, and other gateways.
- **Authentication** – Secure login and role-based access powered by **Keycloak**.
- **API Documentation** – Integrated with **Swagger UI** for testing and exploration.
- **Database** – **PostgreSQL**, containerized using **Docker** for easy setup and portability.

---

## 🛠️ Tech Stack

- **Backend:** Spring Boot, Spring Data JPA, Lombok
- **Frontend:** React (planned UI for Cart, Checkout, Sales Dashboard)
- **Database:** PostgreSQL (running in Docker)
- **Authentication:** Keycloak
- **API Docs:** Swagger (OpenAPI)
- **Payments:** Daraja (M-Pesa), Visa, Stripe, others

---

## 🗄️ Database Setup (Postgres with Docker)

Run PostgreSQL in Docker:

```bash
docker run --name pos-db \\
  -e POSTGRES_USER=pos_user \\
  -e POSTGRES_PASSWORD=pos_pass \\
  -e POSTGRES_DB=pos_db \\
  -p 5432:5432 \\
  -d postgres:15
```

Database config (`application.yml`):

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/pos_db
    username: pos_user
    password: pos_pass
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
```

---

## 🔑 Authentication (Keycloak)

- Keycloak is used for **OAuth2 + OpenID Connect** authentication and role-based authorization.
- Configure your Keycloak server with:
    - **Realm:** pos-system
    - **Client:** pos-client
    - **Roles:** `ADMIN`, `CASHIER`, `USER`

Spring Boot integrates with Keycloak using the `spring-boot-starter-oauth2-resource-server` dependency.

---

## 📖 API Documentation (Swagger)

Once the application is running, Swagger UI is available at:

```
http://localhost:8080/swagger-ui/index.html
```

Use this to explore endpoints for Products, Cart, Sales, and Checkout.

---

## ▶️ Running the Application

1. Start PostgreSQL container (see above).
2. Start Keycloak server and configure realm/clients.
3. Run Spring Boot backend:

```bash
mvn spring-boot:run
```

4. (Optional) Run React frontend:

```bash
cd frontend
npm start
```

---

## ✅ Roadmap

- [ ] Implement Cart & Checkout UI in React
- [ ] Add reporting module (sales trends, inventory usage)
- [ ] Expand payment providers
- [ ] Deploy with Docker Compose (Backend + DB + Keycloak + Frontend)

---

## 📜 License

This project is licensed under the MIT License.  




