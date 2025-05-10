import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';
import '../models/user.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService;
  final ApiService _apiService;
  User? _currentUser;
  bool _isLoading = false;
  String? _error;
  bool _rememberMe = false;

  User? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _currentUser != null;
  bool get rememberMe => _rememberMe;
  set rememberMe(bool value) {
    _rememberMe = value;
  }

  AuthProvider(
      {required AuthService authService, required ApiService apiService})
      : _authService = authService,
        _apiService = apiService;

  Future<bool> tryAutoLogin() async {
    if (!_isLoading) {
      _isLoading = true;
      notifyListeners();
    }

    try {
      final token = await _authService.getToken();
      if (token != null && token.isNotEmpty) {
        final isValid =
            await _authService.isTokenValid(rememberMe: _rememberMe);
        if (isValid) {
          _apiService.setToken(token);
          _currentUser = await _authService.getCurrentUser();
          return true;
        }
      }
      _apiService.setToken('');
      _currentUser = null;
      return false;
    } catch (e) {
      _error = 'Oturum otomatik doğrulanamadı: $e';
      _apiService.setToken('');
      _currentUser = null;
      return false;
    } finally {
      if (_isLoading) {
        _isLoading = false;
        notifyListeners();
      }
    }
  }

  Future<bool> login(String email, String password,
      {bool rememberMe = false}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _currentUser =
          await _authService.login(email, password, rememberMe: rememberMe);
      final token = await _authService.getToken();
      if (token != null && token.isNotEmpty) {
        _apiService.setToken(token);
      } else {
        _apiService.setToken('');
        _currentUser = null;
        throw Exception("Oturum token\'ı alınamadı.");
      }

      _isLoading = false;
      _rememberMe = rememberMe;
      notifyListeners();
      return true;
    } catch (e) {
      _isLoading = false;
      _error = 'Giriş başarısız: $e';
      _apiService.setToken('');
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    _isLoading = true;
    notifyListeners();

    try {
      await _authService.logout();
      _currentUser = null;
      _apiService.setToken('');
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _error = 'Çıkış yapılamadı: $e';
      notifyListeners();
    }
  }

  Future<bool> checkAdminAccess() async {
    return _currentUser?.role == 'admin';
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
