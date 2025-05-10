import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/order.dart';
import '../utils/constants.dart';

class OrdersService {
  final FlutterSecureStorage _storage = FlutterSecureStorage();

  Future<Map<String, String>> _getHeaders() async {
    final token = await _storage.read(key: 'token');
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  Future<List<Order>> getOrders({
    int page = 1,
    int limit = 10,
    String? status,
    String? search,
    String? storeId,
  }) async {
    try {
      final queryParams = {
        'page': page.toString(),
        'limit': limit.toString(),
        if (status != null) 'status': status,
        if (search != null && search.isNotEmpty) 'search': search,
        if (storeId != null) 'storeId': storeId,
      };

      final uri = Uri.parse('$apiBaseUrl/orders').replace(
        queryParameters: queryParams,
      );

      final response = await http.get(
        uri,
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> ordersList = data['orders'] ?? data['data'] ?? [];
        return ordersList.map((json) => Order.fromJson(json)).toList();
      } else {
        throw Exception('Failed to fetch orders: ${response.body}');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<Order> getOrderById(String id) async {
    try {
      final response = await http.get(
        Uri.parse('$apiBaseUrl/orders/$id'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return Order.fromJson(data);
      } else {
        throw Exception('Failed to fetch order: ${response.body}');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<Order> updateOrderStatus(String id, String status) async {
    try {
      final response = await http.patch(
        Uri.parse('$apiBaseUrl$ordersEndpoint/$id'),
        headers: await _getHeaders(),
        body: jsonEncode({
          'status': status,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return Order.fromJson(data);
      } else {
        throw Exception('Failed to update order: ${response.body}');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getOrderStats() async {
    try {
      final response = await http.get(
        Uri.parse('$apiBaseUrl$ordersEndpoint/stats'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to fetch order stats: ${response.body}');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<void> refundOrder(String id, {String? reason}) async {
    try {
      final response = await http.post(
        Uri.parse('$apiBaseUrl/api/payment/refund'),
        headers: await _getHeaders(),
        body: jsonEncode({
          'orderId': id,
          'reason': reason,
        }),
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to refund order: ${response.body}');
      }
    } catch (e) {
      rethrow;
    }
  }
}
