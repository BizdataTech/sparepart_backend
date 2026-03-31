# Project Overview - Spare Parts Backend

This is a Node.js/Express backend for an e-commerce platform specializing in vehicle spare parts.

## Project Structure

### 📁 Root Files

| File                | Purpose                                                                  |
| ------------------- | ------------------------------------------------------------------------ |
| `server.js`         | Main entry point - starts the Express server and connects to MongoDB     |
| `app.js`            | Express app configuration - sets up middleware, CORS, and route mounting |
| `config.js`         | Configuration settings                                                   |
| `package.json`      | Project dependencies and scripts                                         |
| `sampleCreation.js` | Script to populate sample/dummy data                                     |

---

### 📁 controllers/

**Purpose**: Business logic layer - handles requests and coordinating between models and responses

| Controller                  | Handles                                              |
| --------------------------- | ---------------------------------------------------- |
| `userController.js`         | User registration, login, profile management         |
| `adminUserController.js`    | Admin user management and permissions                |
| `productController.js`      | Product CRUD operations                              |
| `autoProductController.js`  | Auto-specific products                               |
| `cartController.js`         | Shopping cart operations (add, remove, update items) |
| `orderController.js`        | Order processing and management                      |
| `brandController.js`        | Vehicle brand management                             |
| `autoCategoryController.js` | Product category organization                        |
| `autoVehicleController.js`  | Vehicle data management                              |
| `homeController.js`         | Homepage/dashboard data                              |
| `sectionController.js`      | Website sections management                          |
| `clientController.js`       | Client-related operations                            |
| `warehouse.controller.js`   | Warehouse related document/pdf creations             |

---

### 📁 models/

**Purpose**: Database schema definitions - defines how data is stored in MongoDB

| Model                  | Represents                           |
| ---------------------- | ------------------------------------ |
| `userModel.js`         | Customer user accounts               |
| `adminUserModel.js`    | Administrator accounts               |
| `productModel.js`      | Product information                  |
| `autoProductModel.js`  | Auto-specific product details        |
| `cartModel.js`         | Shopping cart data                   |
| `orderModel.js`        | Customer orders                      |
| `brandModel.js`        | Vehicle brands (Toyota, Honda, etc.) |
| `autoCategoryModel.js` | Product categories                   |
| `autoVehicleModel.js`  | Vehicle information                  |
| `reservationModel.js`  | Product reservations                 |
| `sectionModel.js`      | Website sections                     |
| `logoModel.js`         | Logo/branding data                   |
| `orderCountModel.js`   | Order statistics/tracking            |

---

### 📁 routers/

**Purpose**: API endpoint definitions - maps URLs to controller functions

| Router                  | Endpoints                           |
| ----------------------- | ----------------------------------- |
| `userRouter.js`         | `/users` - user operations          |
| `adminUserRouter.js`    | `/admin-users` - admin operations   |
| `productRouter.js`      | `/products` - product operations    |
| `autoProductRouter.js`  | `/auto-products` - auto products    |
| `cartRouter.js`         | `/cart` - cart operations           |
| `orderRouter.js`        | `/orders` - order operations        |
| `brandRouter.js`        | `/brands` - brand operations        |
| `autoCategoryRouter.js` | `/categories` - category operations |
| `autoVehicleRouter.js`  | `/vehicles` - vehicle operations    |
| `homeRouter.js`         | `/home` - homepage data             |
| `sectionRouter.js`      | `/sections` - section data          |
| `warehouse.route.js`    | `/warehouse` - inventory operations |

---

### 📁 middlewares/

**Purpose**: Functions that process requests before they reach controllers

| Middleware             | Purpose                          |
| ---------------------- | -------------------------------- |
| `authentication.js`    | Sample Validates user JWT tokens |
| `authentication2.js`   | Main authentication logic        |
| `authenticateAdmin.js` | Validates admin JWT tokens       |
| `multer.js`            | Handles file uploads             |

---

### 📁 utils/

**Purpose**: Helper functions used across the application

| Utility                 | Purpose                                    |
| ----------------------- | ------------------------------------------ |
| `getToken.js`           | Generates JWT tokens for users             |
| `adminToken.js`         | Generates JWT tokens for admins            |
| `verifyPassword.js`     | Validates password during login            |
| `getPassword.js`        | Hashes passwords for storage               |
| `cloudinary.js`         | Cloudinary configuration for image uploads |
| `uploadToCloudinary.js` | Uploads images to Cloudinary cloud storage |
| `getOrderNumber.js`     | Generates unique order numbers             |
| `getFilterQuery.js`     | Builds database filter queries             |

---

### 📁 templates/

**Purpose**: HTML templates for rendering pdf structure.

| Template                     | Purpose                            |
| ---------------------------- | ---------------------------------- |
| `warehouse.productlist.html` | Product list display for warehouse |

---

## How It Works

### Request Flow

```
1. Client sends request → Express app
2. Middleware processes (authentication, file upload, etc.)
3. Router directs to correct endpoint
4. Controller handles business logic
5. Model queries/updates database
6. Response sent back to client
```

### Key Features

- ✅ User authentication with JWT tokens
- ✅ Product catalog management
- ✅ Shopping cart functionality
- ✅ Order processing
- ✅ Inventory/warehouse management
- ✅ Image uploads via Cloudinary
- ✅ Admin dashboard functionality
- ✅ Vehicle and brand management

---

## Technologies Used

- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **Authentication**: JWT (JSON Web Tokens)
- **Password Security**: Bcrypt
- **File Storage**: Cloudinary
- **File Upload**: Multer
- **Development**: Nodemon

---
