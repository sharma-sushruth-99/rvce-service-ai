
export const DB_SCHEMA = `
-- Polished DDL for the "service_ai_db" used by the customer support demo.

-- Users: Stores customer information.
CREATE TABLE Users (
    UserID INT PRIMARY KEY,
    FullName VARCHAR(100) NOT NULL,
    EmailID VARCHAR(100) UNIQUE NOT NULL,
    ContactNumber VARCHAR(20),
    PasswordHash VARCHAR(255) NOT NULL,
    UserAddress TEXT,
    CreatedAt TIMESTAMP -- Format: DD-MM-YYYY HH:MM:SS
);

-- Products: Details of all products available.
CREATE TABLE Products (
    ProductID INT PRIMARY KEY,
    ProductName VARCHAR(200) NOT NULL,
    Category VARCHAR(100),
    SubCategory VARCHAR(100),
    PriceUSD DECIMAL(10,2),
    NoStockQuantity INT,
    Description TEXT
);

-- UserOrders: Records of items purchased by users.
CREATE TABLE UserOrders (
    OrderID INT PRIMARY KEY,
    UserID INT,
    ProductID INT,
    ProductName VARCHAR(200),
    Quantity INT,
    UserAddress TEXT,
    OrderPlaceDate DATE, -- Format: DD-MM-YYYY
    DeliveryDate DATE -- Format: DD-MM-YYYY
);

-- Transactions: Payment information linked to orders.
CREATE TABLE Transactions (
    TransactionID INT PRIMARY KEY,
    UserID INT,
    PaymentMethod VARCHAR(50),
    AmountUSD DECIMAL(10,2),
    TransactionDateTime DATETIME -- Format: DD-MM-YYYY HH:MM:SS
);

-- OrdersTransaction: Maps orders to transactions.
CREATE TABLE OrdersTransaction (
    OrderID INT,
    TransactionID INT,
    PRIMARY KEY (OrderID, TransactionID)
);

-- Feedback: Customer feedback on their support interactions.
CREATE TABLE Feedback (
    FeedbackID INT PRIMARY KEY,
    UserID INT,
    Description TEXT,
    Rating INT -- A rating between 1 and 5.
);
`;