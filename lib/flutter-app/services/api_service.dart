import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/product.dart';
import '../models/order.dart';
import '../models/user.dart';
import '../models/store.dart';

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
      // For demo purposes, return mock products
      await Future.delayed(const Duration(seconds: 1));

      return List.generate(
        limit ?? 10,
        (index) => Product(
          id: 'prod_${index + 1}',
          name: 'Product ${index + 1}',
          description: 'This is a description for Product ${index + 1}',
          price: (19.99 + index),
          imageUrl: 'https://picsum.photos/id/${100 + index}/500/500',
          stock: (10 + index * 2),
          sku: 'SKU${1000 + index}',
          category: index % 3 == 0
              ? 'Electronics'
              : (index % 3 == 1 ? 'Clothing' : 'Home'),
          weight: (0.5 + index * 0.2),
        ),
      );

      // In real app, use this code:
      // final queryParams = limit != null ? '?limit=$limit' : '';
      // final response = await http.get(
      //   Uri.parse('$_baseUrl/products$queryParams'),
      //   headers: _headers,
      // );
      //
      // if (response.statusCode == 200) {
      //   final List<dynamic> data = json.decode(response.body)['data'];
      //   return data.map((json) => Product.fromJson(json)).toList();
      // } else {
      //   throw Exception('Failed to load products: ${response.statusCode}');
      // }
    } catch (e) {
      throw Exception('Failed to fetch products: $e');
    }
  }

  Future<Product> fetchProductById(String id) async {
    try {
      // For demo purposes, return a mock product
      await Future.delayed(const Duration(seconds: 1));

      return Product(
        id: id,
        name: 'Product $id',
        description:
            'This is a detailed description for Product $id. It includes all the features and specifications of the product.',
        price: 29.99,
        imageUrl: 'https://picsum.photos/id/100/500/500',
        stock: 15,
        sku: 'SKU${1000 + int.parse(id.replaceAll(RegExp(r'[^0-9]'), ''))}',
        category: 'Electronics',
        weight: 1.2,
      );

      // In real app, use this code:
      // final response = await http.get(
      //   Uri.parse('$_baseUrl/products/$id'),
      //   headers: _headers,
      // );
      //
      // if (response.statusCode == 200) {
      //   final dynamic data = json.decode(response.body)['data'];
      //   return Product.fromJson(data);
      // } else {
      //   throw Exception('Failed to load product: ${response.statusCode}');
      // }
    } catch (e) {
      throw Exception('Failed to fetch product: $e');
    }
  }

  Future<Product> createProduct(Product product) async {
    try {
      // For demo purposes
      await Future.delayed(const Duration(seconds: 1));
      return product.copyWith(
          id: 'new_${DateTime.now().millisecondsSinceEpoch}');

      // In real app, use this code:
      // final response = await http.post(
      //   Uri.parse('$_baseUrl/products'),
      //   headers: _headers,
      //   body: json.encode(product.toJson()),
      // );
      //
      // if (response.statusCode == 201) {
      //   final dynamic data = json.decode(response.body)['data'];
      //   return Product.fromJson(data);
      // } else {
      //   throw Exception('Failed to create product: ${response.statusCode}');
      // }
    } catch (e) {
      throw Exception('Failed to create product: $e');
    }
  }

  Future<void> updateProduct(Product product) async {
    try {
      // For demo purposes
      await Future.delayed(const Duration(seconds: 1));

      // In real app, use this code:
      // final response = await http.put(
      //   Uri.parse('$_baseUrl/products/${product.id}'),
      //   headers: _headers,
      //   body: json.encode(product.toJson()),
      // );
      //
      // if (response.statusCode != 200) {
      //   throw Exception('Failed to update product: ${response.statusCode}');
      // }
    } catch (e) {
      throw Exception('Failed to update product: $e');
    }
  }

  Future<void> deleteProduct(String id) async {
    try {
      // For demo purposes
      await Future.delayed(const Duration(seconds: 1));

      // In real app, use this code:
      // final response = await http.delete(
      //   Uri.parse('$_baseUrl/products/$id'),
      //   headers: _headers,
      // );
      //
      // if (response.statusCode != 204) {
      //   throw Exception('Failed to delete product: ${response.statusCode}');
      // }
    } catch (e) {
      throw Exception('Failed to delete product: $e');
    }
  }

  // Orders
  Future<List<Order>> fetchOrders({int? limit}) async {
    try {
      // For demo purposes, return mock orders
      await Future.delayed(const Duration(seconds: 1));

      return List.generate(
        limit ?? 10,
        (index) => Order(
          id: 'ord_${index + 1}',
          customerName: 'Customer ${index + 1}',
          customerEmail: 'customer${index + 1}@example.com',
          customerPhone: '+1 (555) 123-${4567 + index}',
          createdAt: DateTime.now().subtract(Duration(days: index)),
          status: index % 5 == 0
              ? 'Pending'
              : (index % 5 == 1
                  ? 'Processing'
                  : (index % 5 == 2
                      ? 'Shipped'
                      : (index % 5 == 3 ? 'Delivered' : 'Cancelled'))),
          items: List.generate(
            2 + (index % 3),
            (i) => OrderItem(
              productId: 'prod_${i + 1}',
              productName: 'Product ${i + 1}',
              quantity: 1 + (i % 3),
              price: 19.99 + (i * 5.0),
              sku: 'SKU${1000 + i}',
            ),
          ),
          subtotal: 59.97 + (index * 10),
          totalAmount: 65.97 + (index * 10),
          tax: 5.0,
          shipping: 10.0,
          paymentMethod: index % 2 == 0 ? 'Credit Card' : 'PayPal',
          shippingAddress: '${123 + index} Main St, City, State 12345',
        ),
      );

      // In real app, use this code:
      // final queryParams = limit != null ? '?limit=$limit' : '';
      // final response = await http.get(
      //   Uri.parse('$_baseUrl/orders$queryParams'),
      //   headers: _headers,
      // );
      //
      // if (response.statusCode == 200) {
      //   final List<dynamic> data = json.decode(response.body)['data'];
      //   return data.map((json) => Order.fromJson(json)).toList();
      // } else {
      //   throw Exception('Failed to load orders: ${response.statusCode}');
      // }
    } catch (e) {
      throw Exception('Failed to fetch orders: $e');
    }
  }

  Future<Order> fetchOrderById(String id) async {
    try {
      // For demo purposes, return a mock order
      await Future.delayed(const Duration(seconds: 1));

      final orderNum = int.parse(id.replaceAll(RegExp(r'[^0-9]'), ''));

      return Order(
        id: id,
        customerName: 'Customer $orderNum',
        customerEmail: 'customer$orderNum@example.com',
        customerPhone: '+1 (555) 123-${4560 + orderNum}',
        createdAt: DateTime.now().subtract(Duration(days: orderNum)),
        status: orderNum % 5 == 0
            ? 'Pending'
            : (orderNum % 5 == 1
                ? 'Processing'
                : (orderNum % 5 == 2
                    ? 'Shipped'
                    : (orderNum % 5 == 3 ? 'Delivered' : 'Cancelled'))),
        items: List.generate(
          3,
          (i) => OrderItem(
            productId: 'prod_${i + 1}',
            productName: 'Product ${i + 1}',
            quantity: 1 + (i % 3),
            price: 19.99 + (i * 5.0),
            sku: 'SKU${1000 + i}',
          ),
        ),
        subtotal: 59.97,
        totalAmount: 74.97,
        tax: 5.0,
        shipping: 10.0,
        discount: orderNum % 2 == 0 ? 0 : 5.0,
        paymentMethod: orderNum % 2 == 0 ? 'Credit Card' : 'PayPal',
        shippingAddress: '${123 + orderNum} Main St, City, State 12345',
      );

      // In real app, use this code:
      // final response = await http.get(
      //   Uri.parse('$_baseUrl/orders/$id'),
      //   headers: _headers,
      // );
      //
      // if (response.statusCode == 200) {
      //   final dynamic data = json.decode(response.body)['data'];
      //   return Order.fromJson(data);
      // } else {
      //   throw Exception('Failed to load order: ${response.statusCode}');
      // }
    } catch (e) {
      throw Exception('Failed to fetch order: $e');
    }
  }

  Future<void> updateOrderStatus(String orderId, String status) async {
    try {
      // For demo purposes
      await Future.delayed(const Duration(seconds: 1));

      // In real app, use this code:
      // final response = await http.patch(
      //   Uri.parse('$_baseUrl/orders/$orderId'),
      //   headers: _headers,
      //   body: json.encode({'status': status}),
      // );
      //
      // if (response.statusCode != 200) {
      //   throw Exception('Failed to update order status: ${response.statusCode}');
      // }
    } catch (e) {
      throw Exception('Failed to update order status: $e');
    }
  }

  // Users
  Future<List<User>> fetchUsers({int? limit}) async {
    try {
      // For demo purposes, return mock users
      await Future.delayed(const Duration(seconds: 1));

      return List.generate(
        limit ?? 10,
        (index) => User(
          id: 'user_${index + 1}',
          name: 'User ${index + 1}',
          email: 'user${index + 1}@example.com',
          role:
              index % 3 == 0 ? 'Admin' : (index % 3 == 1 ? 'Manager' : 'User'),
          isActive: index % 5 != 0,
        ),
      );

      // In real app, use this code:
      // final queryParams = limit != null ? '?limit=$limit' : '';
      // final response = await http.get(
      //   Uri.parse('$_baseUrl/users$queryParams'),
      //   headers: _headers,
      // );
      //
      // if (response.statusCode == 200) {
      //   final List<dynamic> data = json.decode(response.body)['data'];
      //   return data.map((json) => User.fromJson(json)).toList();
      // } else {
      //   throw Exception('Failed to load users: ${response.statusCode}');
      // }
    } catch (e) {
      throw Exception('Failed to fetch users: $e');
    }
  }

  // Stores
  Future<List<Store>> fetchStores() async {
    try {
      // For demo purposes, return mock stores
      await Future.delayed(const Duration(seconds: 1));

      return List.generate(
        10,
        (index) => Store(
          id: 'store_${index + 1}',
          name: 'Store ${index + 1}',
          userId: 'user_${index + 1}',
          status: 'active',
          address: '${100 + index} Main Street, City, State 12345',
          createdAt: DateTime.now().subtract(Duration(days: index)),
          updatedAt: DateTime.now(),
        ),
      );

      // In real app, use this code:
      // final response = await http.get(
      //   Uri.parse('$_baseUrl/stores'),
      //   headers: _headers,
      // );
      //
      // if (response.statusCode == 200) {
      //   final List<dynamic> data = json.decode(response.body)['data'];
      //   return data.map((json) => Store.fromJson(json)).toList();
      // } else {
      //   throw Exception('Failed to load stores: ${response.statusCode}');
      // }
    } catch (e) {
      throw Exception('Failed to fetch stores: $e');
    }
  }
}
