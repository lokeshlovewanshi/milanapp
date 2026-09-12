# AI Coding Assistant Instructions for Match Partner API

## Project Overview

This is a Spring Boot 3.4.0 matchmaking/partner API built with Java 17, using JPA/Hibernate for data persistence with MySQL, JWT for authentication, AWS S3 for file storage, and Google OAuth integration. The application follows a layered architecture with controllers, services, and repositories.

## Architecture & Design Patterns

### Layered Architecture

- **Controllers**: Handle HTTP requests/responses, located in `openapi/{module}/controller/`
- **Services**: Business logic, now implemented with interfaces for dependency injection (e.g., `AuthenticationServiceInterface`)
- **Repositories**: Data access layer using Spring Data JPA
- **Models**: DTOs, entities, and mappers in `model/` subdirectories

### Key Components

- **Authentication**: JWT-based with Google OAuth fallback
- **User Profiles**: Extensive matrimonial profile management with 40+ fields
- **Likes/Shortlists**: Relationship management with status tracking (PENDING/ACCEPTED/REJECTED)
- **Attachments**: S3 file upload/download with presigned URLs
- **Views**: Profile view tracking

### Data Flow

1. Requests enter via controllers with `@RequestAttribute("username")` for authenticated users
2. Controllers delegate to service interfaces (e.g., `ProfileLikeServiceInterface`)
3. Services interact with repositories and external services (S3, JWT)
4. Responses use DTOs with ID formatting (JM00001 format via `CommonUtils.convertToJMFormat()`)

## Developer Workflow

### Build & Run

- **Build**: `./gradlew build`
- **Run**: `./gradlew bootRun`
- **Test**: `./gradlew test`
- **Clean**: `./gradlew clean`

### Development Setup

- Java 17 required (configured in `build.gradle`)
- MySQL database connection in `application.properties`
- AWS S3 credentials and Google OAuth keys needed for full functionality
- Lombok annotation processing enabled

### Testing

- Unit tests in `test/java/` using JUnit 5
- Integration tests for service/repository layers
- Mock external dependencies (S3, OAuth) for isolated testing

## Code Conventions & Patterns

### Service Layer

- All services have interfaces (e.g., `UserProfileServiceInterface`) injected into controllers
- Implementations named `{ServiceName}Impl` with `@Service` annotation
- Constructor injection preferred over field injection

### Entity Design

- JPA entities with `@Data` (Lombok) for getters/setters
- Composite keys for relationships (e.g., `ProfileLikeId`, `ShortlistId`)
- Enums for status fields (e.g., `Status.PENDING/APPROVED/REJECTED`)

### Security

- JWT tokens extracted via `JwtRequestInterceptor` and set as request attributes
- `JwtAuthenticationFilter` validates tokens for protected endpoints
- Swagger UI accessible without auth, API endpoints require Bearer tokens

### ID Management

- Internal IDs are integers, external APIs use JM-prefixed strings (JM00001)
- `CommonUtils.convertFromJMFormat()` converts external IDs to internal integers

### Error Handling

- `GlobalExceptionHandler` provides consistent error responses
- `ClientException` for business logic errors with HTTP status codes
- JWT/security exceptions mapped to appropriate HTTP responses

### External Integrations

- **AWS S3**: File uploads via `S3ServiceInterface`, presigned URLs for downloads
- **Google OAuth**: Token exchange in `GoogleAuthServiceInterface`
- **Email**: SMTP configuration for notifications (Gmail in properties)

## Common Tasks

### Adding New Features

1. Create entity/repository if new data model needed
2. Add service interface and implementation
3. Create/update controller with proper auth checks
4. Update DTOs and mappers as needed
5. Add Swagger annotations for API documentation

### Authentication Flow

- Signup: `POST /api/v1/auth/signup` creates user with PENDING status
- Login: `POST /api/v1/auth/login` returns JWT token
- Protected endpoints use `Authorization: Bearer <token>` header
- Username extracted automatically via interceptor

### File Uploads

- `POST /api/v1/attachments/upload` with multipart file
- Files stored in S3 with user association
- Presigned URLs generated for secure access

### Relationship Management

- Likes: `POST /api/v1/likes/{userId}` to like, `POST /api/v1/likes/accept/{userId}` to accept
- Shortlists: `POST /api/v1/shortlist/{userId}` to shortlist profiles
- Status tracking prevents duplicate actions

## Key Files to Reference

- `PartnerApplication.java`: Main Spring Boot class
- `SecurityConfiguration.java`: Auth setup and endpoint permissions
- `JwtServiceInterface`: Token operations
- `UserProfile.java`: Core entity with extensive fields
- `CommonUtils.java`: ID conversion utilities
- `application.properties`: DB and external service configs

## Best Practices

- Use service interfaces for all business logic injection
- Handle null checks and validation in service layer
- Follow REST conventions with proper HTTP status codes
- Use DTOs for API responses to control data exposure
- Log errors in `GlobalExceptionHandler` for debugging
- Test service methods with mocked repositories
