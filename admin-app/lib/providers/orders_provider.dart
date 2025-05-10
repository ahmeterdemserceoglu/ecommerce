import 'package:flutter/material.dart';
import '../services/orders_service.dart';
import '../models/order.dart';
import '../services/api_service.dart';

class OrdersProvider with ChangeNotifier {
  final OrdersService _ordersService = OrdersService();
  final ApiService _apiService;
  List<Order> _orders = [];
  bool _isLoading = false;
  String? _error;
  int _currentPage = 1;
  final int _totalPages = 1;
  int _limit = 10;
  String? _searchQuery;
  String? _statusFilter;
  String? _storeIdFilter;

  OrdersProvider({required ApiService apiService}) : _apiService = apiService;

  List<Order> get orders => _orders;
  bool get isLoading => _isLoading;
  String? get error => _error;
  int get currentPage => _currentPage;
  int get totalPages => _totalPages;
  bool get hasNextPage => _currentPage < _totalPages;
  bool get hasPreviousPage => _currentPage > 1;

  Future<void> fetchOrders({
    int? page,
    int? limit,
    String? status,
    String? search,
    String? storeId,
    bool reset = false,
  }) async {
    _isLoading = true;
    if (reset) {
      _orders = [];
    }

    if (page != null) {
      _currentPage = page;
    }

    if (limit != null) {
      _limit = limit;
    }

    if (status != null) {
      _statusFilter = status;
    }

    if (search != null) {
      _searchQuery = search;
    }

    if (storeId != null) {
      _storeIdFilter = storeId;
    }

    notifyListeners();

    try {
      final orders = await _ordersService.getOrders(
        page: _currentPage,
        limit: _limit,
        status: _statusFilter,
        search: _searchQuery,
        storeId: _storeIdFilter,
      );

      _orders = orders;
      _isLoading = false;
      _error = null;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<Order?> getOrderById(String id) async {
    try {
      _isLoading = true;
      notifyListeners();

      final order = await _ordersService.getOrderById(id);

      _isLoading = false;
      notifyListeners();
      return order;
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  Future<void> updateOrderStatus(String id, String status) async {
    try {
      _isLoading = true;
      notifyListeners();

      final updatedOrder = await _ordersService.updateOrderStatus(id, status);

      // Update order in the list
      final index = _orders.indexWhere((o) => o.id == id);
      if (index != -1) {
        _orders[index] = updatedOrder;
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<void> refundOrder(String id, {String? reason}) async {
    try {
      _isLoading = true;
      notifyListeners();

      await _ordersService.refundOrder(id, reason: reason);

      // Update the order status to refunded
      await updateOrderStatus(id, 'refunded');

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> getOrderStats() async {
    try {
      _isLoading = true;
      notifyListeners();

      final stats = await _ordersService.getOrderStats();

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

  Future<void> fetchOrdersFromApi({int? limit}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _orders = await _apiService.fetchOrders(limit: limit);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> updateOrderStatusFromApi(String orderId, String status) async {
    _isLoading = true;
    notifyListeners();

    try {
      await _apiService.updateOrderStatus(orderId, status);
      final index = _orders.indexWhere((order) => order.id == orderId);
      if (index != -1) {
        _orders[index] = _orders[index].copyWith(status: status);
      }
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Order? getOrderByIdFromApi(String id) {
    try {
      return _orders.firstWhere((order) => order.id == id);
    } catch (e) {
      return null;
    }
  }
}
