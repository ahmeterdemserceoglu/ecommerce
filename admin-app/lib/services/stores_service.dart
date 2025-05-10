import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/store.dart';
import '../utils/constants.dart';

class StoresService {
  final FlutterSecureStorage _storage = FlutterSecureStorage();

  Future<Map<String, String>> _getHeaders() async {
    final token = await _storage.read(key: 'token');
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  Future<List<Store>> getStores({
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

      final uri = Uri.parse('$apiBaseUrl/admin/stores').replace(
        queryParameters: queryParams,
      );

      final response = await http.get(
        uri,
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> storesList = data['stores'] ?? data['data'] ?? [];
        return storesList.map((json) => Store.fromJson(json)).toList();
      } else {
        throw Exception('Failed to fetch stores: ${response.body}');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<Store> getStoreById(String id) async {
    try {
      final response = await http.get(
        Uri.parse('$apiBaseUrl/admin/stores/$id'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return Store.fromJson(data);
      } else {
        throw Exception('Failed to fetch store: ${response.body}');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<Store> updateStoreStatus(String id, String status) async {
    try {
      final response = await http.patch(
        Uri.parse('$apiBaseUrl$storesEndpoint/$id'),
        headers: await _getHeaders(),
        body: jsonEncode({
          'status': status,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return Store.fromJson(data);
      } else {
        throw Exception('Failed to update store: ${response.body}');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<void> approveStore(String id) async {
    try {
      final response = await http.post(
        Uri.parse('$apiBaseUrl$storesEndpoint/$id/approve'),
        headers: await _getHeaders(),
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to approve store: ${response.body}');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<void> rejectStore(String id, {String? reason}) async {
    try {
      final response = await http.post(
        Uri.parse('$apiBaseUrl$storesEndpoint/$id/reject'),
        headers: await _getHeaders(),
        body: jsonEncode({
          'reason': reason,
        }),
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to reject store: ${response.body}');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getStoreStats() async {
    try {
      final response = await http.get(
        Uri.parse('$apiBaseUrl$storesEndpoint/stats'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to fetch store stats: ${response.body}');
      }
    } catch (e) {
      rethrow;
    }
  }
}
