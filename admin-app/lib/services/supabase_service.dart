import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import '../utils/constants.dart';

class SupabaseService {
  // URL and key will be loaded from secure storage or constants
  late String _supabaseUrl;
  late String _supabaseAnonKey;
  late supabase.SupabaseClient _client;
  final FlutterSecureStorage _storage = FlutterSecureStorage();
  static bool _isInitialized = false;

  // Initialize Supabase
  Future<void> initialize() async {
    if (_isInitialized) {
      debugPrint('[SupabaseService] Already initialized.');
      return;
    }
    // Try to load from secure storage first
    try {
      final storedUrl = await _storage.read(key: 'supabase_url');
      final storedKey = await _storage.read(key: 'supabase_key');
      if (storedUrl != null && storedKey != null) {
        _supabaseUrl = storedUrl;
        _supabaseAnonKey = storedKey;
      } else {
        _supabaseUrl = supabaseUrl;
        _supabaseAnonKey = supabaseAnonKey;
        if (_supabaseUrl != 'YOUR_SUPABASE_URL' &&
            _supabaseAnonKey != 'YOUR_SUPABASE_ANON_KEY') {
          await _storage.write(key: 'supabase_url', value: _supabaseUrl);
          await _storage.write(key: 'supabase_key', value: _supabaseAnonKey);
        }
      }
    } catch (e) {
      _supabaseUrl = supabaseUrl;
      _supabaseAnonKey = supabaseAnonKey;
      debugPrint('[SupabaseService] Error loading Supabase credentials: $e');
    }
    if (_supabaseUrl == 'YOUR_SUPABASE_URL' ||
        _supabaseAnonKey == 'YOUR_SUPABASE_ANON_KEY') {
      debugPrint(
          '[SupabaseService] Warning: Using placeholder Supabase credentials. API calls will fail.');
    }
    try {
      await supabase.Supabase.initialize(
        url: _supabaseUrl,
        anonKey: _supabaseAnonKey,
      );
      _isInitialized = true;
      debugPrint(
          '[SupabaseService] Supabase initialized with URL: $_supabaseUrl');
    } catch (e) {
      debugPrint('[SupabaseService] Supabase initialize error: $e');
      rethrow;
    }
    _client = supabase.Supabase.instance.client;
  }

  // Test Supabase connection
  Future<void> testConnection() async {
    try {
      await initialize();
      final response =
          await _client.from('profiles').select().limit(1).maybeSingle();
      debugPrint('[SupabaseService] Test connection response: $response');
    } catch (e) {
      debugPrint('[SupabaseService] Test connection error: $e');
    }
  }

  // Get the Supabase client
  supabase.SupabaseClient get client {
    return _client;
  }

  // Sign in with email and password
  Future<supabase.AuthResponse?> signInWithEmailAndPassword(
      String email, String password) async {
    try {
      final response = await _client.auth.signInWithPassword(
        email: email,
        password: password,
      );

      // Store the session
      if (response.session != null) {
        await _storage.write(
          key: 'supabase_session',
          value: jsonEncode({
            'access_token': response.session!.accessToken,
            'refresh_token': response.session!.refreshToken,
          }),
        );
      }

      return response;
    } catch (e) {
      debugPrint('Error signing in: $e');
      return null;
    }
  }

  // Sign out
  Future<void> signOut() async {
    try {
      await _client.auth.signOut();
      await _storage.delete(key: 'supabase_session');
    } catch (e) {
      debugPrint('Error signing out: $e');
    }
  }

  // Restore session
  Future<bool> restoreSession() async {
    try {
      final storedSession = await _storage.read(key: 'supabase_session');
      if (storedSession != null) {
        final sessionData = jsonDecode(storedSession);
        final response = await _client.auth.setSession(
          sessionData['access_token'],
        );
        return response.session != null;
      }
      return false;
    } catch (e) {
      debugPrint('Error restoring session: $e');
      return false;
    }
  }

  // Execute raw SQL query
  Future<supabase.PostgrestResponse> executeQuery(String sql) async {
    try {
      final response = await _client.rpc('run_sql', params: {'sql': sql});
      return response;
    } catch (e) {
      debugPrint('Error executing SQL query: $e');
      rethrow;
    }
  }

  // Get database tables
  Future<List<dynamic>> getDatabaseTables() async {
    try {
      final response = await _client.rpc('get_tables');
      if (response.error != null) {
        throw response.error!;
      }
      return response.data ?? [];
    } catch (e) {
      debugPrint('Error getting database tables: $e');
      rethrow;
    }
  }

  // Get table schema
  Future<List<dynamic>> getTableSchema(String tableName) async {
    try {
      final response = await _client
          .rpc('get_table_schema', params: {'table_name': tableName});
      if (response.error != null) {
        throw response.error!;
      }
      return response.data ?? [];
    } catch (e) {
      debugPrint('Error getting table schema: $e');
      rethrow;
    }
  }

  // Run database functions update
  Future<bool> updateDatabaseFunctions() async {
    try {
      final response = await _client.rpc('update_database_functions');
      return response.error == null;
    } catch (e) {
      debugPrint('Error updating database functions: $e');
      return false;
    }
  }

  // Run database schema update
  Future<bool> updateDatabaseSchema() async {
    try {
      final response = await _client.rpc('update_database_schema');
      return response.error == null;
    } catch (e) {
      debugPrint('Error updating database schema: $e');
      return false;
    }
  }

  // Get database health information
  Future<Map<String, dynamic>> getDatabaseHealth() async {
    try {
      final response = await _client.rpc('get_database_health');
      if (response.error != null) {
        throw response.error!;
      }
      return response.data as Map<String, dynamic>;
    } catch (e) {
      debugPrint('Error getting database health: $e');
      rethrow;
    }
  }

  // Create database backup
  Future<String> createDatabaseBackup() async {
    try {
      final response = await _client.rpc('create_database_backup');
      if (response.error != null) {
        throw response.error!;
      }
      return response.data.toString();
    } catch (e) {
      debugPrint('Error creating database backup: $e');
      rethrow;
    }
  }
}
