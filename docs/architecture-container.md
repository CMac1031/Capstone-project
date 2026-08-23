# Northstar CRM - Container Architecture

## Containers

| Container | Technology | Responsibility |
|---|---|---|
| Web application | React and TypeScript | Login, search, profile and interaction form |
| Backend API | Java 21 and Spring Boot | Business logic, validation, security and REST APIs |
| Database | PostgreSQL | Stores customers and interactions |
| Message broker | Apache Kafka | Delivers versioned interaction events |
| Kafka consumer | Spring Boot | Processes interaction events |
| Delivery pipeline | GitHub Actions | Builds, tests and scans the application |
| Runtime | k3s | Runs the deployed containers |

## Container Diagram

```mermaid
flowchart TD
    User["CRM Agent"] --> React["React Web Application"]
    React -->|"HTTPS/REST + JWT"| API["Spring Boot API"]
    API -->|"JPA/SQL"| DB[("PostgreSQL")]
    API -->|"InteractionRecorded v1"| Kafka["Kafka"]
    Kafka --> Consumer["Audit Consumer"]
    Consumer --> DB