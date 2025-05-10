import 'package:flutter/material.dart';
import '../services/stores_service.dart';
import '../models/store.dart';

class StoresProvider with ChangeNotifier {
  final StoresService _storesService = StoresService();
  List<Store> _stores = [];
  bool _isLoading = false;
  String? _error;
  int _currentPage = 1;
  final int _totalPages = 1;
  final int _limit = 10;
  String? _searchQuery;
  String? _statusFilter;

  List<Store> get stores => _stores;
  bool get isLoading => _isLoading;
  String? get error => _error;
  int get currentPage => _currentPage;
  int get totalPages => _totalPages;
  bool get hasNextPage => _currentPage < _totalPages;
  bool get hasPreviousPage => _currentPage > 1;

  Future<void> fetchStores({
    int? page,
    String? status,
    String? search,
    bool reset = false,
  }) async {
    _isLoading = true;
    if (reset) {
      _stores = [];
    }

    if (page != null) {
      _currentPage = page;
    }

    if (status != null) {
      _statusFilter = status;
    }

    if (search != null) {
      _searchQuery = search;
    }

    notifyListeners();

    try {
      final stores = await _storesService.getStores(
        page: _currentPage,
        limit: _limit,
        status: _statusFilter,
        search: _searchQuery,
      );

      _stores = stores;
      _isLoading = false;
      _error = null;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<Store?> getStoreById(String id) async {
    try {
      _isLoading = true;
      notifyListeners();

      final store = await _storesService.getStoreById(id);

      _isLoading = false;
      notifyListeners();
      return store;
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  Future<void> approveStore(String id) async {
    try {
      _isLoading = true;
      notifyListeners();

      await _storesService.approveStore(id);

      // Update store in the list
      final index = _stores.indexWhere((s) => s.id == id);
      if (index != -1) {
        final updatedStore = await _storesService.getStoreById(id);
        _stores[index] = updatedStore;
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<void> rejectStore(String id, {String? reason}) async {
    try {
      _isLoading = true;
      notifyListeners();

      await _storesService.rejectStore(id, reason: reason);

      // Update store in the list
      final index = _stores.indexWhere((s) => s.id == id);
      if (index != -1) {
        final updatedStore = await _storesService.getStoreById(id);
        _stores[index] = updatedStore;
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<void> updateStoreStatus(String id, String status) async {
    try {
      _isLoading = true;
      notifyListeners();

      final updatedStore = await _storesService.updateStoreStatus(id, status);

      // Update store in the list
      final index = _stores.indexWhere((s) => s.id == id);
      if (index != -1) {
        _stores[index] = updatedStore;
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> getStoreStats() async {
    try {
      _isLoading = true;
      notifyListeners();

      final stats = await _storesService.getStoreStats();

      _isLoading = false;
      notifyListeners();
      return stats;
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
      return {};
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
