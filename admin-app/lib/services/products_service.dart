import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/product.dart';
import '../utils/constants.dart';

class ProductsService {
  final FlutterSecureStorage _storage = FlutterSecureStorage();

  Future<Map<String, String>> _getHeaders() async {
    final token = await _storage.read(key: 'token');
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  Future<List<Product>> getProducts({
    int page = 1,
    int limit = 10,
    String? status,
    String? search,
  }) async {
    try {
      final queryParams = {
        'page': page.toString(),
        'limit': limit.toString(),
        if (status != null) 'status': status,
        if (search != null && search.isNotEmpty) 'search': search,
      };

      final uri = Uri.parse('$apiBaseUrl$productsEndpoint').replace(
        queryParameters: queryParams,
      );

      final response = await http.get(
        uri,
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> productsList = data['products'];
        return productsList.map((json) => Product.fromJson(json)).toList();
      } else {
        throw Exception('Failed to fetch products: ${response.body}');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<Product> getProductById(String id) async {
    try {
      final response = await http.get(
        Uri.parse('$apiBaseUrl$productsEndpoint/$id'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return Product.fromJson(data);
      } else {
        throw Exception('Failed to fetch product: ${response.body}');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<Product> updateProductStatus(String id, String status) async {
    try {
      final response = await http.patch(
        Uri.parse('$apiBaseUrl$productsEndpoint/$id'),
        headers: await _getHeaders(),
        body: jsonEncode({
          'status': status,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return Product.fromJson(data);
      } else {
        throw Exception('Failed to update product: ${response.body}');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<void> approveProduct(String id) async {
    try {
      final response = await http.post(
        Uri.parse('$apiBaseUrl$productsEndpoint/$id/approve'),
        headers: await _getHeaders(),
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to approve product: ${response.body}');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<void> rejectProduct(String id, {String? reason}) async {
    try {
      final response = await http.post(
        Uri.parse('$apiBaseUrl$productsEndpoint/$id/reject'),
        headers: await _getHeaders(),
        body: jsonEncode({
          'reason': reason,
        }),
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to reject product: ${response.body}');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<void> setFeatured(String id, bool isFeatured) async {
    try {
      final response = await http.patch(
        Uri.parse('$apiBaseUrl$productsEndpoint/$id'),
        headers: await _getHeaders(),
        body: jsonEncode({
          'featured': isFeatured,
        }),
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to update featured status: ${response.body}');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getProductStats() async {
    try {
      final response = await http.get(
        Uri.parse('$apiBaseUrl$productsEndpoint/stats'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to fetch product stats: ${response.body}');
      }
    } catch (e) {
      rethrow;
    }
  }
}
