import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../utils/constants.dart';
import 'supabase_service.dart';

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
      // Try with Supabase first
      await _supabaseService.initialize();

      // If we can't use direct Supabase, fallback to API
      final response = await http.post(
        Uri.parse('$apiBaseUrl/api/admin/initialize-database'),
        headers: await _getHeaders(),
      );

      return response.statusCode == 200;
    } catch (e) {
      print('Database initialization error: $e');
      return false;
    }
  }

  // Method to execute a SQL query
  Future<Map<String, dynamic>> executeQuery(String sql) async {
    try {
      // Try with Supabase first
      await _supabaseService.initialize();
      final supabaseResponse = await _supabaseService.executeQuery(sql);

      // Fix for handling PostgrestResponse - check if data is available without errors
      if (supabaseResponse.data != null && !supabaseResponse.hasError) {
        return {
          'data': supabaseResponse.data,
          'error': null,
        };
      }

      // Fallback to API
      final response = await http.post(
        Uri.parse('$apiBaseUrl/api/admin/execute-query'),
        headers: await _getHeaders(),
        body: jsonEncode({
          'sql': sql,
        }),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to execute query: ${response.body}');
      }
    } catch (e) {
      print('Query execution error: $e');
      return {'error': e.toString()};
    }
  }

  // Method to update database schema
  Future<bool> updateDatabaseSchema() async {
    try {
      // Try with Supabase first
      await _supabaseService.initialize();
      final success = await _supabaseService.updateDatabaseSchema();

      if (success) {
        return true;
      }

      // Fallback to API
      final response = await http.post(
        Uri.parse('$apiBaseUrl/api/admin/update-database-schema'),
        headers: await _getHeaders(),
      );

      return response.statusCode == 200;
    } catch (e) {
      print('Schema update error: $e');
      return false;
    }
  }

  // Method to update database functions
  Future<bool> updateDatabaseFunctions() async {
    try {
      // Try with Supabase first
      await _supabaseService.initialize();
      final success = await _supabaseService.updateDatabaseFunctions();

      if (success) {
        return true;
      }

      // Fallback to API
      final response = await http.post(
        Uri.parse('$apiBaseUrl/api/admin/update-database-functions'),
        headers: await _getHeaders(),
      );

      return response.statusCode == 200;
    } catch (e) {
      print('Functions update error: $e');
      return false;
    }
  }

  // Method to check database health
  Future<Map<String, dynamic>> checkDatabaseHealth() async {
    try {
      // Try with Supabase first
      await _supabaseService.initialize();
      try {
        final supabaseHealth = await _supabaseService.getDatabaseHealth();
        return supabaseHealth;
      } catch (_) {
        // Continue with API fallback
      }

      // Fallback to API
      final response = await http.get(
        Uri.parse('$apiBaseUrl/api/admin/database-health'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to check database health: ${response.body}');
      }
    } catch (e) {
      print('Database health check error: $e');
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
      // Try with Supabase first
      await _supabaseService.initialize();
      try {
        final backupUrl = await _supabaseService.createDatabaseBackup();
        if (backupUrl.isNotEmpty) {
          return backupUrl;
        }
      } catch (_) {
        // Continue with API fallback
      }

      // Fallback to API
      final response = await http.post(
        Uri.parse('$apiBaseUrl/api/admin/database-backup'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['backupUrl'] ?? 'Backup completed';
      } else {
        throw Exception('Failed to backup database: ${response.body}');
      }
    } catch (e) {
      print('Database backup error: $e');
      rethrow;
    }
  }

  // Method to get database tables
  Future<List<String>> getDatabaseTables() async {
    try {
      // Try with Supabase first
      await _supabaseService.initialize();
      try {
        final tables = await _supabaseService.getDatabaseTables();
        return List<String>.from(tables);
      } catch (_) {
        // Continue with API fallback
      }

      // Fallback to API
      final response = await http.get(
        Uri.parse('$apiBaseUrl/api/admin/database-tables'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return List<String>.from(data['tables']);
      } else {
        throw Exception('Failed to get database tables: ${response.body}');
      }
    } catch (e) {
      print('Getting tables error: $e');
      return [];
    }
  }

  // Method to get table schema
  Future<List<Map<String, dynamic>>> getTableSchema(String tableName) async {
    try {
      // Try with Supabase first
      await _supabaseService.initialize();
      try {
        final schema = await _supabaseService.getTableSchema(tableName);
        return List<Map<String, dynamic>>.from(schema);
      } catch (_) {
        // Continue with API fallback
      }

      // Fallback to API
      final response = await http.get(
        Uri.parse('$apiBaseUrl/api/admin/database-schema/$tableName'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return List<Map<String, dynamic>>.from(data['schema']);
      } else {
        throw Exception('Failed to get table schema: ${response.body}');
      }
    } catch (e) {
      print('Getting schema error: $e');
      return [];
    }
  }
}
