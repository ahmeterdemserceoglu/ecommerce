import 'package:flutter/material.dart';

// TODO: Enter your API base URL here
// Base URL for API calls
const String apiBaseUrl =
    'YOUR_API_URL'; // Replace with your actual API domain (example: https://api.your-ecommerce.com)

// Supabase configuration
const String supabaseUrl = 'YOUR_SUPABASE_URL';
const String supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

// API endpoints
const String productsEndpoint = '/api/admin/products';
const String storesEndpoint = '/api/admin/stores';
const String ordersEndpoint = '/api/orders';
const String usersEndpoint = '/api/admin/users';
const String categoriesEndpoint = '/api/categories';
const String brandsEndpoint = '/api/brands';
const String payoutsEndpoint = '/api/admin/payouts';
const String databaseEndpoint = '/api/admin/database';

// Dashboard constants
const int dashboardCardCount = 4;

// Table page sizes
const List<int> tableSizes = [10, 25, 50, 100];

// Database configuration
const Map<String, String> databaseConfig = {
  'host': 'db.supabase.co', // You may need to update this with your actual host
  'port': '5432',
  'database': 'postgres',
};

// Status colors
const Map<String, int> statusColors = {
  'pending': 0xFFFFA726,
  'processing': 0xFF42A5F5,
  'shipped': 0xFF66BB6A,
  'delivered': 0xFF26A69A,
  'cancelled': 0xFFEF5350,
  'refunded': 0xFFAB47BC,
  'approved': 0xFF4CAF50,
  'rejected': 0xFFF44336,
  'draft': 0xFF9E9E9E,
  'published': 0xFF4CAF50,
  'inactive': 0xFFFF9800,
  'active': 0xFF4CAF50,
};
