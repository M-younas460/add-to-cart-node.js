const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const path = require("path");

const app = express();
const port = 5000;
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads')); // Serve static files from the uploads directory

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/checkout", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/'); // Directory where files will be stored
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// Multer filter to allow only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// Initialize multer with storage and file filter
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // Limit file size to 5MB
  fileFilter: fileFilter,
});

// Schema definition for Product and Customer with imageUrl
const ProductSchema = new mongoose.Schema({
  products: [
    {
      productName: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
      imageUrl: { type: String, required: false }, // Add imageUrl field
    },
  ],
  customer: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
  },
});

const Order = mongoose.model("Order", ProductSchema);

// POST API to create an order with image upload
app.post("/api/checkout", upload.single('image'), async (req, res) => {
  console.log("Request body:", req.body);

  const { products, customer } = req.body;

  // Check if image was uploaded and add it to the product
  if (req.file) {
    products.forEach(product => {
      product.imageUrl = req.file.path; // Add the uploaded image path to the product
    });
  }

  if (!products || products.length === 0 || !customer.name || !customer.email || !customer.address) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const newOrder = new Order({
      products,
      customer: {
        name: customer.name,
        email: customer.email,
        address: customer.address,
      },
    });

    await newOrder.save();
    res.status(201).json({ message: "Order placed successfully", order: newOrder });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ message: "Failed to place order", error: error.message });
  }
});

// GET API to fetch all orders for the admin page
app.get("/api/orders", async (req, res) => {
  try {
    // Fetch all orders from the database
    const orders = await Order.find();
    res.status(200).json(orders); // Send orders as response
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Failed to fetch orders", error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
