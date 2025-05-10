import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/user.dart' as models;
import '../utils/constants.dart';
import 'supabase_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;

class AuthService {
  final FlutterSecureStorage _storage = FlutterSecureStorage();
  final SupabaseService _supabaseService = SupabaseService();

  Future<Map<String, String>> _getHeaders() async {
    final token = await _storage.read(key: 'token');
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  Future<models.User?> login(String email, String password,
      {bool rememberMe = false}) async {
    try {
      // Try to login with Supabase first
      await _supabaseService.initialize();
      final supabaseResponse =
          await _supabaseService.signInWithEmailAndPassword(
        email,
        password,
        rememberMe: rememberMe,
      );

      if (supabaseResponse != null && supabaseResponse.session != null) {
        // Store the token
        await _storage.write(
            key: 'token', value: supabaseResponse.session!.accessToken);

        // Supabase user id
        final userId = supabaseResponse.user?.id;
        if (userId != null) {
          // Fetch profile from Supabase 'profiles' table
          final profileResponse = await supabase.Supabase.instance.client
              .from('profiles')
              .select()
              .eq('id', userId)
              .single();
          if (profileResponse != null && profileResponse['role'] == 'admin') {
            // Admin ise girişe izin ver
            await _storage.write(
                key: 'user', value: jsonEncode(profileResponse));
            return models.User.fromJson(profileResponse);
          } else {
            throw Exception('Bu uygulamaya sadece adminler giriş yapabilir.');
          }
        }
      }

      // If Supabase login fails or no user data available, fallback to regular API login
      final response = await http.post(
        Uri.parse('$apiBaseUrl/api/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        await _storage.write(key: 'token', value: data['token']);
        await _storage.write(key: 'user', value: jsonEncode(data['user']));
        // API'den dönen user'ın rolünü kontrol et
        if (data['user'] != null && data['user']['role'] == 'admin') {
          return models.User.fromJson(data['user']);
        } else {
          throw Exception('Bu uygulamaya sadece adminler giriş yapabilir.');
        }
      } else {
        throw Exception('Failed to login: ${response.body}');
      }
    } catch (e) {
      print('Login error: $e');
      rethrow;
    }
  }

  Future<bool> isTokenValid({bool rememberMe = false}) async {
    try {
      final token = await _storage.read(key: 'token');
      if (token == null) return false;

      // Check if token is valid with Supabase
      await _supabaseService.initialize();
      final sessionValid = await _supabaseService.restoreSession();

      if (sessionValid) {
        return true;
      }

      // Fallback to API check
      final response = await http.get(
        Uri.parse('$apiBaseUrl/api/auth/profile'),
        headers: await _getHeaders(),
      );

      return response.statusCode == 200;
    } catch (e) {
      print('Token validation error: $e');
      return false;
    }
  }

  Future<models.User?> getCurrentUser() async {
    final userString = await _storage.read(key: 'user');
    if (userString == null) return null;

    try {
      return models.User.fromJson(jsonDecode(userString));
    } catch (e) {
      print('Error parsing user data: $e');
      return null;
    }
  }

  Future<void> logout() async {
    try {
      // Logout from Supabase
      await _supabaseService.initialize();
      await _supabaseService.signOut();

      // Clear stored data
      await _storage.delete(key: 'token');
      await _storage.delete(key: 'user');
    } catch (e) {
      print('Logout error: $e');
      rethrow;
    }
  }

  Future<bool> hasAdminAccess() async {
    try {
      final user = await getCurrentUser();
      return user?.role == 'admin';
    } catch (e) {
      print('Access check error: $e');
      return false;
    }
  }

  Future<models.User?> getProfile() async {
    try {
      final response = await http.get(
        Uri.parse('$apiBaseUrl/api/auth/profile'),
        headers: await _getHeaders(),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return models.User.fromJson(data['user'] ?? data);
      } else {
        throw Exception('Failed to fetch profile: ${response.body}');
      }
    } catch (e) {
      rethrow;
    }
  }
}
