CREATE DATABASE IF NOT EXISTS event_platform;
USE event_platform;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100),
  email VARCHAR(150) UNIQUE,
  password VARCHAR(255),
  role ENUM('admin','organizer','attendee') DEFAULT 'attendee',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200),
  description TEXT,
  venue VARCHAR(200),
  event_date DATE,
  event_time TIME,
  status ENUM('draft','published','completed','cancelled') DEFAULT 'draft',
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS ticket_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT,
  name VARCHAR(100),
  price DECIMAL(10,2),
  quantity INT,
  sold INT DEFAULT 0,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  event_id INT,
  total_amount DECIMAL(10,2),
  payment_status ENUM('pending','paid','failed') DEFAULT 'pending',
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (event_id) REFERENCES events(id)
);

CREATE TABLE IF NOT EXISTS tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT,
  ticket_type_id INT,
  ticket_code VARCHAR(100) UNIQUE,
  checkin_status ENUM('not_checked','checked') DEFAULT 'not_checked',
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id)
);

-- Admin account (Admin@123)
INSERT INTO users (full_name,email,password,role)
VALUES ('Super Admin','admin@event.com',
'$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','admin')
ON DUPLICATE KEY UPDATE full_name = 'Super Admin';
