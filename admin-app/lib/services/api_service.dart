import '../models/product.dart';
import '../models/order.dart';
import '../models/user.dart';
import '../models/store.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  final String _baseUrl =
      'https://api.example.com/v1'; // Replace with your actual API URL
  final Map<String, String> _headers = {
    'Content-Type': 'application/json',
  };

  // Set the authorization token
  void setToken(String token) {
    _headers['Authorization'] = 'Bearer $token';
  }

  // Products
  Future<List<Product>> fetchProducts({int? limit}) async {
    try {
      final queryParams = limit != null ? '?limit=$limit' : '';
      final response = await http.get(
        Uri.parse('$_baseUrl/products$queryParams'),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body)['data'];
        return data.map((json) => Product.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load products: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to fetch products: $e');
    }
  }

  Future<Product> fetchProductById(String id) async {
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/products/$id'),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        final dynamic data = json.decode(response.body)['data'];
        return Product.fromJson(data);
      } else {
        throw Exception('Failed to load product: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to fetch product: $e');
    }
  }

  Future<Product> createProduct(Product product) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/products'),
        headers: _headers,
        body: json.encode(product.toJson()),
      );
      if (response.statusCode == 201) {
        final dynamic data = json.decode(response.body)['data'];
        return Product.fromJson(data);
      } else {
        throw Exception('Failed to create product: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to create product: $e');
    }
  }

  Future<void> updateProduct(Product product) async {
    try {
      final response = await http.put(
        Uri.parse('$_baseUrl/products/${product.id}'),
        headers: _headers,
        body: json.encode(product.toJson()),
      );
      if (response.statusCode != 200) {
        throw Exception('Failed to update product: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to update product: $e');
    }
  }

  Future<void> deleteProduct(String id) async {
    try {
      final response = await http.delete(
        Uri.parse('$_baseUrl/products/$id'),
        headers: _headers,
      );
      if (response.statusCode != 204) {
        throw Exception('Failed to delete product: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to delete product: $e');
    }
  }

  // Orders
  Future<List<Order>> fetchOrders({int? limit}) async {
    try {
      final queryParams = limit != null ? '?limit=$limit' : '';
      final response = await http.get(
        Uri.parse('$_baseUrl/orders$queryParams'),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body)['data'];
        return data.map((json) => Order.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load orders: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to fetch orders: $e');
    }
  }

  Future<Order> fetchOrderById(String id) async {
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/orders/$id'),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        final dynamic data = json.decode(response.body)['data'];
        return Order.fromJson(data);
      } else {
        throw Exception('Failed to load order: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to fetch order: $e');
    }
  }

  Future<void> updateOrderStatus(String orderId, String status) async {
    try {
      final response = await http.patch(
        Uri.parse('$_baseUrl/orders/$orderId'),
        headers: _headers,
        body: json.encode({'status': status}),
      );
      if (response.statusCode != 200) {
        throw Exception(
            'Failed to update order status: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to update order status: $e');
    }
  }

  // Users
  Future<List<User>> fetchUsers({int? limit}) async {
    try {
      final queryParams = limit != null ? '?limit=$limit' : '';
      final response = await http.get(
        Uri.parse('$_baseUrl/users$queryParams'),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body)['data'];
        return data.map((json) => User.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load users: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to fetch users: $e');
    }
  }

  // Stores
  Future<List<Store>> fetchStores() async {
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/stores'),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body)['data'];
        return data.map((json) => Store.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load stores: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to fetch stores: $e');
    }
  }
}
