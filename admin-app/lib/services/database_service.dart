import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../utils/constants.dart';
import 'supabase_service.dart';
import 'package:flutter/foundation.dart';

class DatabaseService {
  final FlutterSecureStorage _storage = FlutterSecureStorage();
  final SupabaseService _supabaseService = SupabaseService();

  Future<Map<String, String>> _getHeaders() async {
    final token = await _storage.read(key: 'token');
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  // Method to initialize database connection
  Future<bool> initializeDatabase() async {
    try {
      final url = '$apiBaseUrl/admin/initialize-database';
      final headers = await _getHeaders();
      debugPrint('[DatabaseService] Requesting: $url');
      debugPrint('[DatabaseService] Headers: $headers');
      final response = await http.post(
        Uri.parse(url),
        headers: headers,
      );
      return response.statusCode == 200;
    } catch (e) {
      debugPrint('[DatabaseService] Database initialization error: $e');
      return false;
    }
  }

  // Method to execute a SQL query
  Future<Map<String, dynamic>> executeQuery(String sql) async {
    try {
      final url = '$apiBaseUrl/admin/execute-query';
      final headers = await _getHeaders();
      debugPrint('[DatabaseService] Requesting: $url');
      debugPrint('[DatabaseService] Headers: $headers');
      final response = await http.post(
        Uri.parse(url),
        headers: headers,
        body: jsonEncode({'sql': sql}),
      );
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to execute query: ${response.body}');
      }
    } catch (e) {
      debugPrint('[DatabaseService] Query execution error: $e');
      return {'error': e.toString()};
    }
  }

  // Method to update database schema
  Future<bool> updateDatabaseSchema() async {
    try {
      final url = '$apiBaseUrl/admin/update-database-schema';
      final headers = await _getHeaders();
      debugPrint('[DatabaseService] Requesting: $url');
      debugPrint('[DatabaseService] Headers: $headers');
      final response = await http.post(
        Uri.parse(url),
        headers: headers,
      );
      return response.statusCode == 200;
    } catch (e) {
      debugPrint('[DatabaseService] Schema update error: $e');
      return false;
    }
  }

  // Method to update database functions
  Future<bool> updateDatabaseFunctions() async {
    try {
      final url = '$apiBaseUrl/admin/update-database-functions';
      final headers = await _getHeaders();
      debugPrint('[DatabaseService] Requesting: $url');
      debugPrint('[DatabaseService] Headers: $headers');
      final response = await http.post(
        Uri.parse(url),
        headers: headers,
      );
      return response.statusCode == 200;
    } catch (e) {
      debugPrint('[DatabaseService] Functions update error: $e');
      return false;
    }
  }

  // Method to check database health
  Future<Map<String, dynamic>> checkDatabaseHealth() async {
    try {
      final url = '$apiBaseUrl/admin/database-health';
      final headers = await _getHeaders();
      debugPrint('[DatabaseService] Requesting: $url');
      debugPrint('[DatabaseService] Headers: $headers');
      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      );
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to check database health: ${response.body}');
      }
    } catch (e) {
      debugPrint('[DatabaseService] Database health check error: $e');
      // Return a minimal health report with the error
      return {
        'status': 'error',
        'message': e.toString(),
        'tablesCount': 0,
        'totalRows': 0,
        'lastBackup': 'Never',
      };
    }
  }

  // Method to backup database
  Future<String> backupDatabase() async {
    try {
      final url = '$apiBaseUrl/admin/database-backup';
      final headers = await _getHeaders();
      debugPrint('[DatabaseService] Requesting: $url');
      debugPrint('[DatabaseService] Headers: $headers');
      final response = await http.post(
        Uri.parse(url),
        headers: headers,
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['backupUrl'] ?? 'Backup completed';
      } else {
        throw Exception('Failed to backup database: ${response.body}');
      }
    } catch (e) {
      debugPrint('[DatabaseService] Database backup error: $e');
      rethrow;
    }
  }

  // Method to get database tables
  Future<List<String>> getDatabaseTables() async {
    try {
      final url = '$apiBaseUrl/admin/database-tables';
      final headers = await _getHeaders();
      debugPrint('[DatabaseService] Requesting: $url');
      debugPrint('[DatabaseService] Headers: $headers');
      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return List<String>.from(data['tables']);
      } else {
        throw Exception('Failed to get database tables: ${response.body}');
      }
    } catch (e) {
      debugPrint('[DatabaseService] Getting tables error: $e');
      return [];
    }
  }

  // Method to get table schema
  Future<List<Map<String, dynamic>>> getTableSchema(String tableName) async {
    try {
      final url = '$apiBaseUrl/admin/database-schema/$tableName';
      final headers = await _getHeaders();
      debugPrint('[DatabaseService] Requesting: $url');
      debugPrint('[DatabaseService] Headers: $headers');
      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return List<Map<String, dynamic>>.from(data['schema']);
      } else {
        throw Exception('Failed to get table schema: ${response.body}');
      }
    } catch (e) {
      debugPrint('[DatabaseService] Getting schema error: $e');
      return [];
    }
  }
}
