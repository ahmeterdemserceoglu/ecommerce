// TODO: Enter your API base URL here
// Base URL for API calls
const String apiBaseUrl =
    'https://www.hdticaret.com/api'; // Replace with your actual API domain (example: https://api.your-ecommerce.com)

// Supabase configuration
const String supabaseUrl = 'https://swytqjegdclddjdezgjj.supabase.co';
const String supabaseAnonKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3eXRxamVnZGNsZGRqZGV6Z2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MjI0MTAsImV4cCI6MjA2MTk5ODQxMH0.BbHHS8UZxKnUt9vMQLI9jFRUxKrUJD6LLgeb_IDK4TA';

// API endpoints (sadece path, başında /api olmadan)
const String productsEndpoint = 'admin/products';
const String storesEndpoint = 'admin/stores';
const String ordersEndpoint = 'orders';
const String usersEndpoint = 'admin/users';
const String categoriesEndpoint = 'categories';
const String brandsEndpoint = 'brands';
const String payoutsEndpoint = 'admin/payouts';
const String databaseEndpoint = 'admin/database';

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
